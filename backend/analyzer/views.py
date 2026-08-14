import os
import uuid

from django.conf import settings
from django.core.files.storage import FileSystemStorage

from rest_framework import status
from rest_framework.decorators import (
    api_view,
    parser_classes,
    permission_classes,
    throttle_classes,
)
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from rest_framework.throttling import SimpleRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from .comparison import compare_versions
from .models import ResumeAnalysis, UserProfile
from .serializers import (
    SignupSerializer,
    ResumeAnalysisSerializer,
    VersionComparisonSerializer,
    UserProfileSerializer,
)
from .services import analyze_resume, extract_text_from_file
from .tasks import analyze_resume_task
from celery.result import AsyncResult
from .skill_matcher import extract_skills
from .url_fetcher import download_and_validate_url
from django.shortcuts import get_object_or_404
import json
from django.http import HttpResponse
from django.utils import timezone


class UploadRateThrottle(SimpleRateThrottle):
    scope = "upload"
    def get_rate(self):
        return getattr(settings, "RESUME_UPLOAD_RATE", "10/hour")

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {
            "scope": self.scope,
            "ident": ident,
        }


from .captcha import issue_challenge, verify_from_request_data

#: One message for every way a CAPTCHA can fail — forged, expired, replayed or
#: simply wrong. Saying which would tell a script what to change.
CAPTCHA_FAILED_MESSAGE = (
    "CAPTCHA verification failed. Please complete the security challenge."
)


def verify_captcha_token(data, consume=True):
    """Return ``True`` when the request body carries a solved challenge.

    This used to take the token alone and accept any string beginning with
    ``CAP-VERIFIED-``, which the browser generated for itself — so it accepted
    forgeries by design. It now takes the whole request body, because verifying
    a CAPTCHA needs the answer as well as the token; the real work lives in
    :mod:`analyzer.captcha`.

    Pass ``consume=False`` to check a challenge without spending it, for
    callers that need to gate on it before deciding whether to act.
    """
    return verify_from_request_data(data, consume=consume)


@api_view(["GET"])
@permission_classes([AllowAny])
def captcha_challenge_view(request):
    """Hand out a fresh challenge.

    The expected answer never leaves the server in readable form — it travels
    inside the signed token, which the client cannot alter without breaking the
    signature.
    """
    question, token = issue_challenge()
    return Response({"question": question, "captcha_token": token})


from .file_validation import (
    PDF,
    RESUME_FORMATS,
    detect_format,
    get_max_upload_size,
    validate_optional_upload,
    validate_upload,
)

MAX_UPLOAD_SIZE = get_max_upload_size()


def is_pdf_file(f):
    """Return True if the uploaded file really is a PDF.

    Kept as a thin wrapper so callers outside this module keep working; the
    format table now lives in :mod:`analyzer.file_validation`.
    """
    return detect_format(f, formats=(PDF,)) is not None


def validate_uploaded_file(f, formats=RESUME_FORMATS, field_label="resume"):
    """Validate an uploaded resume (or cover letter).

    Accepts every format the parser can read — PDF, DOCX and TXT — and checks
    size, extension and file signature. Raises ``UploadValidationError`` (a
    ``ValueError``) with a message that can be shown to the user.
    """
    validate_upload(f, formats=formats, field_label=field_label)
    return True


@api_view(["POST"])
@permission_classes([AllowAny])
def signup(request):
    # Checked in three steps on purpose.
    #
    # The CAPTCHA is verified first, but *without* spending it. Validating the
    # account details first instead would let anyone probe for taken usernames
    # without ever solving a puzzle — the reply says "username already exists"
    # rather than "CAPTCHA failed".
    #
    # It is only consumed once the details are known good, so a typo or a taken
    # username costs the user a retry rather than a fresh puzzle.
    if not verify_captcha_token(request.data, consume=False):
        return Response(
            {"captcha_token": [CAPTCHA_FAILED_MESSAGE]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = SignupSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Spend it. Between the check above and here nothing has been written, so a
    # token that loses the race simply fails this second call.
    if not verify_captcha_token(request.data):
        return Response(
            {"captcha_token": [CAPTCHA_FAILED_MESSAGE]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = serializer.save()

    # Tokens are returned here so the client does not have to immediately call
    # the login endpoint with the same CAPTCHA token. Challenges are single-use
    # now, so that second call would legitimately be rejected — and asking
    # someone to solve two puzzles to create one account is not a real option.
    refresh = RefreshToken.for_user(user)

    return Response(
        {
            "detail": "Account created successfully.",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@permission_classes([AllowAny])
@throttle_classes([UploadRateThrottle])
def upload_resume(request):

    file = request.FILES.get("file")
    url = request.data.get("url") or request.data.get("resume_url")
    target_role = request.data.get("role", "")
    job_desc = request.data.get("job_description", "")[:2000]

    cover_letter = request.FILES.get("cover_letter")

    # Server-side validation for direct uploads (always enforce on backend).
    # The cover letter goes through the same checks — it used to be written to
    # disk unvalidated, so the size ceiling did not apply to it.
    try:
        if file and not url:
            validate_upload(file, field_label="resume")
        validate_optional_upload(cover_letter, field_label="cover letter")
    except ValueError as ve:
        return Response({"error": str(ve)}, status=status.HTTP_400_BAD_REQUEST)

    if not file and not url:
        return Response(
            {"error": "Please provide a resume file or shareable link."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        if url:
            try:
                file_path, file_name = download_and_validate_url(url)
            except ValueError as ve:
                return Response(
                    {"error": str(ve)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            file_name = file.name if file else "resume.pdf"
            temp_dir = os.path.join(settings.BASE_DIR, "tmp")
            os.makedirs(temp_dir, exist_ok=True)
            storage = FileSystemStorage(location=temp_dir)
            unique_name = f"{uuid.uuid4()}_{file.name}"
            saved_name = storage.save(unique_name, file)
            file_path = storage.path(saved_name)

        cover_letter_path = None
        cover_letter_name = None
        if cover_letter:
            cover_letter_name = cover_letter.name
            temp_dir = os.path.join(settings.BASE_DIR, "tmp")
            os.makedirs(temp_dir, exist_ok=True)
            storage = FileSystemStorage(location=temp_dir)
            cl_unique_name = f"{uuid.uuid4()}_{cover_letter.name}"
            cl_saved_name = storage.save(cl_unique_name, cover_letter)
            cover_letter_path = storage.path(cl_saved_name)

        user_id = (
            request.user.id
            if request.user.is_authenticated
            else None
        )

        task = analyze_resume_task.delay(
            file_path=file_path,
            target_role=target_role,
            file_name=file_name,
            user_id=user_id,
            job_description=job_desc,
            cover_letter_path=cover_letter_path,
            cover_letter_name=cover_letter_name,
        )

        return Response({"task_id": task.id})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

@api_view(["GET"])
@permission_classes([AllowAny])
def task_status(request, task_id):
    task = AsyncResult(task_id)
    if task.state == 'FAILURE':
        return Response({"state": task.state, "error": str(task.info)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    elif task.state == 'SUCCESS':
        return Response({"state": task.state, "result": task.result})
    else:
        return Response({"state": task.state})

@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([AllowAny])
@throttle_classes([UploadRateThrottle])
def compare_uploads(request):
    file1 = request.FILES.get("file1")
    file2 = request.FILES.get("file2")
    target_role = request.data.get("role", "")
    job_desc = request.data.get("job_description", "")[:2000]

    if not file1 or not file2:
        return Response({"error": "Please provide two resume files."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_upload(file1, field_label="first resume")
        validate_upload(file2, field_label="second resume")
    except ValueError as ve:
        return Response({"error": str(ve)}, status=status.HTTP_400_BAD_REQUEST)

    def process_file(f):
        temp_dir = os.path.join(settings.BASE_DIR, "tmp")
        os.makedirs(temp_dir, exist_ok=True)
        storage = FileSystemStorage(location=temp_dir)
        unique_name = f"{uuid.uuid4()}_{f.name}"
        saved_name = storage.save(unique_name, f)
        file_path = storage.path(saved_name)
        
        user_id = request.user.id if request.user.is_authenticated else None
        
        return analyze_resume(
            file_path=file_path,
            target_role=target_role,
            file_name=f.name,
            user_id=user_id,
            job_description=job_desc,
        )

    try:
        res1 = process_file(file1)
        res2 = process_file(file2)

        from collections import namedtuple
        from datetime import datetime

        MockResume = namedtuple('MockResume', [
            'id', 'file_name', 'created_at', 'score', 
            'skills_found', 'matched_skills', 'missing_skills', 'resume_text'
        ])

        older = MockResume(
            id=1, file_name=file1.name, created_at=datetime.now(),
            score=res1['score'], skills_found=res1['skills_found'],
            matched_skills=res1['matched_skills'], missing_skills=res1['missing_skills'],
            resume_text=res1['resume_text']
        )
        newer = MockResume(
            id=2, file_name=file2.name, created_at=datetime.now(),
            score=res2['score'], skills_found=res2['skills_found'],
            matched_skills=res2['matched_skills'], missing_skills=res2['missing_skills'],
            resume_text=res2['resume_text']
        )

        comparison = compare_versions(older, newer)
        serializer = VersionComparisonSerializer(comparison.as_dict())
        return Response(serializer.data)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


from .serializers import ResumeAnalysisListSerializer

#: Rows per page when the caller does not ask for a size.
HISTORY_DEFAULT_PAGE_SIZE = 20

#: Hard ceiling, so ``?page_size=100000`` cannot rebuild the old behaviour.
HISTORY_MAX_PAGE_SIZE = 100


def _positive_int(raw, default, maximum=None):
    """Parse a query param as a positive int, falling back on anything odd."""
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return default
    if value < 1:
        return default
    if maximum is not None:
        return min(value, maximum)
    return value


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def analysis_history(request):
    """List the requesting user's analyses, newest first.

    The list is slim by design: ``resume_text`` and the other long fields are
    several KB per row, and the history sidebar discards them. Fetch a single
    analysis from ``/api/history/<id>/`` when the full text is needed.

    Pass ``?page=`` (optionally with ``?page_size=``) to page through the
    results and get a ``{count, next, previous, results}`` envelope back.
    Without those params the response stays a bare array, so an already
    deployed frontend keeps working.
    """
    analyses = (
        ResumeAnalysis.objects.filter(user=request.user)
        # Explicit rather than relying on Meta.ordering, so a later .distinct()
        # or .annotate() elsewhere cannot silently reshuffle the sidebar.
        .order_by("-created_at", "-id")
        .only(
            "id", "share_id", "file_name", "score", "skills_found", "suggestions",
            "matched_skills", "missing_skills", "target_role", "created_at",
        )
    )

    page_param = request.query_params.get("page")
    size_param = request.query_params.get("page_size")

    if page_param is None and size_param is None:
        serializer = ResumeAnalysisListSerializer(analyses, many=True)
        return Response(serializer.data)

    page_size = _positive_int(size_param, HISTORY_DEFAULT_PAGE_SIZE, HISTORY_MAX_PAGE_SIZE)
    page_number = _positive_int(page_param, 1)

    total = analyses.count()
    start = (page_number - 1) * page_size
    end = start + page_size
    rows = analyses[start:end]

    def page_url(number):
        if number is None:
            return None
        query = request.query_params.copy()
        query["page"] = number
        query["page_size"] = page_size
        return request.build_absolute_uri(f"{request.path}?{query.urlencode()}")

    serializer = ResumeAnalysisListSerializer(rows, many=True)
    return Response(
        {
            "count": total,
            "page": page_number,
            "page_size": page_size,
            "next": page_url(page_number + 1) if end < total else None,
            "previous": page_url(page_number - 1) if page_number > 1 and start <= total else None,
            "results": serializer.data,
        }
    )


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def history_detail(request, pk):
    """Fetch or delete one of the requesting user's analyses.

    ``GET`` returns the full record, including ``resume_text`` — the fields the
    list endpoint leaves out.
    """
    try:
        entry = ResumeAnalysis.objects.get(pk=pk, user=request.user)
    except ResumeAnalysis.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(ResumeAnalysisSerializer(entry).data)

    entry.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


#: Kept so existing imports of the old name keep resolving.
delete_single_history = history_detail


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def clear_user_history(request):
    ResumeAnalysis.objects.filter(user=request.user).delete()
    # 204 must not carry a body — the old response sent one, which some proxies
    # and HTTP clients treat as a protocol error.
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def compare_versions_view(request):
    """Compare two of the current user's resume versions.

    Query params: ``older`` and ``newer`` — primary keys of two
    ``ResumeAnalysis`` rows owned by the requesting user. Order is
    caller-supplied (not inferred from ``created_at``) so a user can
    compare in whichever direction they like; the response always labels
    them as "older"/"newer" per what was passed in.
    """

    older_id = request.query_params.get("older")
    newer_id = request.query_params.get("newer")

    if not older_id or not newer_id:
        return Response(
            {"error": "Both 'older' and 'newer' query params (analysis ids) are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if older_id == newer_id:
        return Response(
            {"error": "Select two different versions to compare."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        older = ResumeAnalysis.objects.get(pk=older_id, user=request.user)
        newer = ResumeAnalysis.objects.get(pk=newer_id, user=request.user)
    except ResumeAnalysis.DoesNotExist:
        return Response(
            {"error": "One or both analyses were not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    comparison = compare_versions(older, newer)
    serializer = VersionComparisonSerializer(comparison.as_dict())

    return Response(serializer.data)


from .models import SuggestionFeedback
from .serializers import SuggestionFeedbackSerializer

#: Keeps a stray paste from filling the column.
MAX_FEEDBACK_COMMENT_LENGTH = 2000


def _owned_analysis(request, analysis_id):
    """Return the caller's analysis with this id, or ``None``."""
    if analysis_id in (None, ""):
        return None
    try:
        return ResumeAnalysis.objects.get(pk=analysis_id, user=request.user)
    except (ResumeAnalysis.DoesNotExist, ValueError, TypeError):
        return None


@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsAuthenticated])
def suggestion_feedback(request):
    """Record, read back or withdraw a vote on a generated suggestion.

    This endpoint used to validate its input, answer "Feedback recorded
    successfully" and discard everything — there was no model behind it.

    ``GET  ?analysis_id=`` returns the caller's votes for that analysis, so the
    UI can restore its state after a reload.
    ``POST`` upserts one vote; voting again replaces the previous value.
    ``DELETE`` withdraws a vote.
    """
    if request.method == "GET":
        analysis = _owned_analysis(request, request.query_params.get("analysis_id"))
        if analysis is None:
            return Response(
                {"detail": "Analysis not found."}, status=status.HTTP_404_NOT_FOUND
            )

        feedback = SuggestionFeedback.objects.filter(user=request.user, analysis=analysis)
        return Response({"results": SuggestionFeedbackSerializer(feedback, many=True).data})

    analysis_id = request.data.get("analysis_id")
    suggestion_text = (request.data.get("suggestion_text") or "").strip()

    if not analysis_id or not suggestion_text:
        return Response(
            {"detail": "analysis_id and suggestion_text are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Ownership is checked before anything is written: the endpoint used to
    # accept feedback against any id, including ids that did not exist.
    analysis = _owned_analysis(request, analysis_id)
    if analysis is None:
        return Response(
            {"detail": "Analysis not found."}, status=status.HTTP_404_NOT_FOUND
        )

    lookup = {
        "user": request.user,
        "analysis": analysis,
        "suggestion_hash": SuggestionFeedback.hash_suggestion(suggestion_text),
    }

    if request.method == "DELETE":
        deleted, _ = SuggestionFeedback.objects.filter(**lookup).delete()
        return Response(
            {"detail": "Feedback withdrawn.", "removed": bool(deleted)},
            status=status.HTTP_200_OK,
        )

    vote = request.data.get("vote")
    valid_votes = [choice for choice, _ in SuggestionFeedback.VOTE_CHOICES]
    if vote not in valid_votes:
        return Response(
            {"detail": f"vote must be one of: {', '.join(valid_votes)}."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    comment = (request.data.get("comment") or "").strip()[:MAX_FEEDBACK_COMMENT_LENGTH]

    feedback, created = SuggestionFeedback.objects.update_or_create(
        defaults={"vote": vote, "comment": comment, "suggestion_text": suggestion_text},
        **lookup,
    )

    return Response(
        {
            "detail": "Feedback recorded successfully.",
            "created": created,
            "feedback": SuggestionFeedbackSerializer(feedback).data,
        },
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([AllowAny])
def get_shared_result(request, share_id):
    """
    Fetch a specific ResumeAnalysis by its unguessable share_id,
    without requiring authentication.
    """
    analysis = get_object_or_404(ResumeAnalysis, share_id=share_id)
    serializer = ResumeAnalysisSerializer(analysis)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_user_data(request):
    """Export the authenticated user's account data and analysis history."""
    user = request.user

    profile, _ = UserProfile.objects.get_or_create(user=user)

    analyses = ResumeAnalysis.objects.filter(
        user=user
    ).order_by("-created_at")

    data = {
        "export_version": 1,
        "exported_at": timezone.now().isoformat(),
        "account": {
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "date_joined": (
                user.date_joined.isoformat()
                if user.date_joined
                else None
            ),
            "last_login": (
                user.last_login.isoformat()
                if user.last_login
                else None
            ),
            "weekly_digest_opt_in": profile.weekly_digest_opt_in,
            "avatar": profile.avatar.name if profile.avatar else None,
        },
        "analysis_history": [
            {
                "id": analysis.id,
                "share_id": str(analysis.share_id),
                "file_name": analysis.file_name,
                "score": analysis.score,
                "skills_found": analysis.skills_found,
                "suggestions": analysis.suggestions,
                "matched_skills": analysis.matched_skills,
                "missing_skills": analysis.missing_skills,
                "target_role": analysis.target_role,
                "created_at": analysis.created_at.isoformat(),
                "job_description": analysis.job_description,
                "resume_text": analysis.resume_text,
                "cover_letter_text": analysis.cover_letter_text,
                "cover_letter_feedback": analysis.cover_letter_feedback,
                "interview_questions": analysis.interview_questions,
            }
            for analysis in analyses
        ],
    }

    response = HttpResponse(
        json.dumps(data, indent=2, ensure_ascii=False),
        content_type="application/json",
    )

    response["Content-Disposition"] = (
        'attachment; filename="ai-resume-analyzer-data.json"'
    )

    return response



User = get_user_model()

class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        
        user = User.objects.filter(username=username).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            
            frontend_url = "http://localhost:5173" 
            reset_link = f"{frontend_url}/reset-password/{uid}/{token}/"
            
            print("\n" + "="*50)
            print(f"PASSWORD RESET LINK FOR USERNAME: {user.username}")
            print(reset_link)
            print("="*50 + "\n")
            
        return Response(
            {"message": "If an account exists, a reset link has been generated in the console."}, 
            status=status.HTTP_200_OK
        )

class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and default_token_generator.check_token(user, token):
            user.set_password(new_password)
            user.save()
            return Response(
                {"message": "Password has been reset successfully."}, 
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {"error": "Invalid or expired token."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

from collections import Counter

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_stats_view(request):
    if not request.user.is_staff and not request.user.is_superuser:
        return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        
    total_analyses = ResumeAnalysis.objects.count()
    
    # Most popular career tracks
    roles = ResumeAnalysis.objects.values_list('target_role', flat=True)
    popular_roles = Counter(roles).most_common(5)
    
    # Most commonly missing skills
    all_missing_skills = ResumeAnalysis.objects.values_list('missing_skills', flat=True)
    missing_skills_counter = Counter()
    for skills_list in all_missing_skills:
        if isinstance(skills_list, list):
            missing_skills_counter.update(skills_list)
            
    top_missing_skills = missing_skills_counter.most_common(10)
    return Response({
        "total_analyses": total_analyses,
        "popular_roles": [{"role": r[0], "count": r[1]} for r in popular_roles if r[0]],
        "top_missing_skills": [{"skill": s[0], "count": s[1]} for s in top_missing_skills if s[0]]
    })


import re
from collections import Counter

STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
    "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't", "cannot", "could",
    "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for",
    "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's",
    "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm",
    "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't",
    "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours",
    "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't",
    "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there",
    "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too",
    "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't",
    "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's",
    "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself",
    "yourselves", "job", "description", "experience", "role", "team", "work", "responsibilities", "skills", "required",
    "looking", "ability", "using", "candidate", "development", "knowledge", "working", "strong", "position", "years"
}

@api_view(["POST"])
@permission_classes([AllowAny])
def analyze_jd_view(request):
    job_description = request.data.get("job_description", "")
    if not job_description or not job_description.strip():
        return Response({"error": "Job description cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)
        
    words = re.findall(r"\b[a-zA-Z0-9\-\.\#\+\-]+\b", job_description.lower())
    filtered_words = [w for w in words if w not in STOP_WORDS and len(w) >= 2]
    
    counter = Counter(filtered_words)
    top_items = counter.most_common(30)
    
    from analyzer.services import get_role_skills
    all_skills = set()
    for skills_list in get_role_skills().values():
        for s in skills_list:
            all_skills.add(s.lower())
            
    results = []
    for word, count in top_items:
        is_skill = (word in all_skills) or (word.title() in all_skills) or (word.upper() in all_skills)
        if not is_skill:
            for s in all_skills:
                if s == word or (len(word) > 3 and word in s):
                    is_skill = True
                    break
                    
        results.append({
            "text": word,
            "value": count,
            "type": "skill" if is_skill else "general"
        })
        
    return Response({"keywords": results}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def skills_leaderboard_view(request):
    from django.core.cache import cache
    from django.utils.timezone import now
    
    track = request.query_params.get("track", "")
    
    cache_key = f"skills_leaderboard_{track}"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return Response(cached_data, status=status.HTTP_200_OK)
        
    analyses = ResumeAnalysis.objects.all()
    if track:
        analyses = analyses.filter(target_role=track)
        
    data_list = list(analyses.values_list("matched_skills", "missing_skills"))
    total_count = len(data_list)
    
    matched_counter = Counter()
    missing_counter = Counter()
    
    for matched, missing in data_list:
        if isinstance(matched, list):
            matched_counter.update(matched)
        if isinstance(missing, list):
            missing_counter.update(missing)
            
    top_matched = [
        {
            "skill": skill.title(),
            "count": count,
            "percentage": int(count / total_count * 100) if total_count > 0 else 0
        }
        for skill, count in matched_counter.most_common(10)
    ]
    
    top_missing = [
        {
            "skill": skill.title(),
            "count": count,
            "percentage": int(count / total_count * 100) if total_count > 0 else 0
        }
        for skill, count in missing_counter.most_common(10)
    ]
    
    response_data = {
        "total_analyses": total_count,
        "matched_skills": top_matched,
        "missing_skills": top_missing,
        "last_updated": now().isoformat()
    }
    
    cache.set(cache_key, response_data, 300)
    return Response(response_data, status=status.HTTP_200_OK)


from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def profile_avatar_view(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    
    if request.method == "POST":
        file_obj = request.FILES.get("avatar")
        if not file_obj:
            return Response({"error": "No avatar file provided."}, status=status.HTTP_400_BAD_REQUEST)

        ext = os.path.splitext(file_obj.name)[1].lower()
        if ext not in [".png", ".jpg", ".jpeg", ".webp"]:
            return Response({"error": "Only PNG, JPG, JPEG, and WEBP images are allowed."}, status=status.HTTP_400_BAD_REQUEST)

        max_size = 2 * 1024 * 1024
        if file_obj.size > max_size:
            return Response({"error": "Image size must be under 2MB."}, status=status.HTTP_400_BAD_REQUEST)


        if profile.avatar:
            try:
                if os.path.exists(profile.avatar.path):
                    os.remove(profile.avatar.path)
            except Exception:
                pass
                
        profile.avatar = file_obj
        profile.save()
        
        avatar_url = request.build_absolute_uri(profile.avatar.url)
        return Response({"avatar_url": avatar_url}, status=status.HTTP_200_OK)
        
    elif request.method == "DELETE":
        if profile.avatar:
            try:
                if os.path.exists(profile.avatar.path):
                    os.remove(profile.avatar.path)
            except Exception:
                pass
            profile.avatar = None
            profile.save()
            
        return Response({"message": "Avatar removed successfully."}, status=status.HTTP_200_OK)


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@permission_classes([AllowAny])
@throttle_classes([UploadRateThrottle])
def compare_bulk_jds_view(request):
    file = request.FILES.get("file")
    url = request.data.get("url") or request.data.get("resume_url")
    
    # Try parsing job descriptions from JSON string or list parameter
    jds_raw = request.data.get("job_descriptions")
    job_descriptions = []
    if jds_raw:
        import json
        try:
            job_descriptions = json.loads(jds_raw)
        except Exception:
            if isinstance(jds_raw, str):
                job_descriptions = [jds_raw]
            elif isinstance(jds_raw, list):
                job_descriptions = jds_raw
    else:
        job_descriptions = request.data.getlist("job_descriptions") or request.data.getlist("job_descriptions[]")

    if not file and not url:
        return Response(
            {"error": "Please provide a resume file or shareable link."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if file and not url:
        try:
            validate_upload(file, field_label="resume")
        except ValueError as ve:
            return Response({"error": str(ve)}, status=status.HTTP_400_BAD_REQUEST)

    # limit up to 5 JDs
    job_descriptions = [jd.strip() for jd in job_descriptions if jd and jd.strip()][:5]
    if not job_descriptions:
        return Response(
            {"error": "Please provide at least one non-empty job description."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        if url:
            try:
                file_path, file_name = download_and_validate_url(url)
            except ValueError as ve:
                return Response(
                    {"error": str(ve)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            file_name = file.name if file else "resume.pdf"
            temp_dir = os.path.join(settings.BASE_DIR, "tmp")
            os.makedirs(temp_dir, exist_ok=True)
            storage = FileSystemStorage(location=temp_dir)
            unique_name = f"{uuid.uuid4()}_{file.name}"
            saved_name = storage.save(unique_name, file)
            file_path = storage.path(saved_name)

        try:
            resume_text = extract_text_from_file(file_path, file_name)
        finally:
            if os.path.exists(file_path):
                os.remove(file_path)

        detected_skills = extract_skills(resume_text)

        results = []
        for index, jd in enumerate(job_descriptions):
            required = extract_skills(jd)
            matched = [s for s in required if s in detected_skills]
            missing = [s for s in required if s not in detected_skills]
            score = (
                int(len(matched) / len(required) * 100)
                if required
                else min(len(detected_skills) * 10, 100)
            )
            suggestions = [
                f"Add projects or experience with {skill.title()}"
                for skill in missing
            ]
            results.append({
                "index": index,
                "job_description": jd,
                "score": score,
                "matched_skills": matched,
                "missing_skills": missing,
                "suggestions": suggestions
            })

        # Sort by score descending (sorted by best match)
        results.sort(key=lambda x: x["score"], reverse=True)

        return Response({
            "resume_skills": detected_skills,
            "comparisons": results
        }, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    user = request.user
    if request.method == "GET":
        serializer = UserProfileSerializer(user, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == "PUT":
        serializer = UserProfileSerializer(user, data=request.data, context={"request": request}, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([AllowAny])
def contact_us_view(request):
    name = request.data.get("name", "").strip()
    email = request.data.get("email", "").strip()
    category = request.data.get("category", "General Inquiry").strip()
    subject = request.data.get("subject", "").strip()
    message = request.data.get("message", "").strip()

    if not name or not email or not message:
        return Response(
            {"error": "Name, email, and message are required fields."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    support_email = getattr(settings, "SUPPORT_EMAIL", "support@ai-resume-analyzer.dev")
    email_body = f"Support Message Received:\n\nFrom: {name} ({email})\nCategory: {category}\nSubject: {subject}\n\nMessage:\n{message}"

    try:
        send_mail(
            subject=f"[Support - {category}] {subject if subject else 'New Inquiry'}",
            message=email_body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@ai-resume-analyzer.dev"),
            recipient_list=[support_email],
            fail_silently=True,
        )
    except Exception as e:
        print(f"Failed to send support email: {e}")

    return Response(
        {
            "detail": "Thank you for contacting support! Your message has been received and routed to our team.",
            "status": "success",
        },
        status=status.HTTP_200_OK,
    )


from .unsubscribe_tokens import read_unsubscribe_token

UNSUBSCRIBE_SUCCESS_MESSAGE = (
    "You have successfully unsubscribed from the weekly resume-tips email digest."
)

UNSUBSCRIBE_MISSING_TOKEN_MESSAGE = (
    "This unsubscribe link is missing its token. Please use the link from your "
    "most recent digest email, or sign in and turn the digest off from your profile."
)

UNSUBSCRIBE_INVALID_TOKEN_MESSAGE = (
    "This unsubscribe link is no longer valid — it may have expired. Please use "
    "the link from your most recent digest email, or sign in and turn the digest "
    "off from your profile."
)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def unsubscribe_digest_view(request):
    """Turn off the weekly digest for the account a signed token identifies.

    The endpoint used to act on a bare email address, so anyone could
    unsubscribe anyone, and its 404-vs-200 responses revealed which addresses
    were registered. It now requires either a signed token from a digest email
    or an authenticated session, and the response no longer depends on whether
    a given account exists.
    """
    token = request.query_params.get("token") or request.data.get("token")

    if token:
        user = read_unsubscribe_token(token)
        if user is None:
            return Response(
                {"error": UNSUBSCRIBE_INVALID_TOKEN_MESSAGE},
                status=status.HTTP_400_BAD_REQUEST,
            )
    elif request.user.is_authenticated:
        user = request.user
    else:
        # No token and no session. Whatever the caller typed — an email, a
        # username — is unverified, so nothing is looked up and the answer is
        # the same whether or not that account exists.
        return Response(
            {"error": UNSUBSCRIBE_MISSING_TOKEN_MESSAGE},
            status=status.HTTP_400_BAD_REQUEST,
        )

    profile, _ = UserProfile.objects.get_or_create(user=user)
    already_unsubscribed = not profile.weekly_digest_opt_in
    if not already_unsubscribed:
        profile.weekly_digest_opt_in = False
        profile.save(update_fields=["weekly_digest_opt_in"])

    return Response(
        {
            "message": UNSUBSCRIBE_SUCCESS_MESSAGE,
            # Kept for the existing frontend. Unsubscribing twice is a no-op
            # rather than an error, so a repeated click still reads as success.
            "unsubscribed_count": 0 if already_unsubscribed else 1,
            "already_unsubscribed": already_unsubscribed,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def mock_interview_view(request):
    question = request.data.get("question", "").strip()
    answer = request.data.get("answer", "").strip()

    if not question or not answer:
        return Response(
            {"error": "Question and answer are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    word_count = len(answer.split())
    feedback = ""

    if word_count < 15:
        feedback = (
            f"Your answer is quite brief ({word_count} words). In a real interview, "
            "you should elaborate more on your thought process and provide specific examples."
        )
    elif word_count > 150:
        feedback = (
            f"Your answer is very detailed ({word_count} words), which is great, but be careful not to ramble. "
            "Try to keep your responses concise and focused on the core concept."
        )
    else:
        feedback = (
            f"Good effort! Your response length is solid ({word_count} words) and addresses the core concept. "
            "To improve further, consider structuring your answer using the STAR method (Situation, Task, Action, Result) "
            "and adding a concrete example from your past experience."
        )

    return Response({
        "feedback": feedback,
        "is_ai_generated": True
    }, status=status.HTTP_200_OK)
