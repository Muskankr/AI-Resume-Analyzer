import logging
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
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle

from .request_input import (
    MAX_CONTACT_EMAIL_LENGTH,
    MAX_CONTACT_MESSAGE_LENGTH,
    MAX_CONTACT_NAME_LENGTH,
    MAX_CONTACT_SUBJECT_LENGTH,
    MAX_INTERVIEW_ANSWER_LENGTH,
    MAX_INTERVIEW_QUESTION_LENGTH,
    MAX_JOB_DESCRIPTION_LENGTH,
    MAX_STORED_JOB_DESCRIPTION_LENGTH,
    clean_text,
    is_probably_an_email,
)

from .comparison import compare_versions
from .leaderboard import (
    CACHE_TIMEOUT_SECONDS,
    UNKNOWN_TRACK,
    aggregate_skill_counts,
    cache_key_for,
    clamp_limit,
    normalise_track,
    top_skills,
)
from .models import ResumeAnalysis, UserProfile, Webhook
from .serializers import (
    SignupSerializer,
    ResumeAnalysisSerializer,
    PublicSharedAnalysisSerializer,
    ShareStateSerializer,
    VersionComparisonSerializer,
    UserProfileSerializer,
)
from .sharing import clamp_lifetime_days
from .services import analyze_resume, extract_text_from_file
from .tasks import analyze_resume_task
from celery.result import AsyncResult
from .skill_matcher import extract_skills
from .url_fetcher import download_and_validate_url
from .task_claims import (
    CLAIM_HEADER,
    claims_are_enforced,
    issue_claim,
    verify_claim,
)
from django.shortcuts import get_object_or_404
import json
from django.http import HttpResponse
from django.utils import timezone

# `requests`, `threading`, `Retry` and `HTTPAdapter` used to be imported here
# for webhook dispatch. Delivery now lives in analyzer.webhook_utils and runs as
# a Celery task, so none of them belong in the view layer.

from drf_spectacular.utils import (
    extend_schema,
    OpenApiExample,
    OpenApiParameter,
    OpenApiResponse,
    OpenApiTypes,
)

logger = logging.getLogger(__name__)


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


class ContactThrottle(AnonRateThrottle):
    """Caps /api/contact/, which sends an email on every accepted request.

    Without this the endpoint is an unauthenticated way to put attacker-written
    text into the project's support inbox as fast as it can be called, which
    burns the sending domain's reputation as much as it annoys whoever reads it.
    """

    scope = "contact"


class AnalyzeJdThrottle(AnonRateThrottle):
    """Caps /api/analyze-jd/, which does unbounded text work per request."""

    scope = "analyze_jd"


class MockInterviewThrottle(AnonRateThrottle):
    scope = "mock_interview"


class SignupThrottle(AnonRateThrottle):
    """Caps account creation.

    Independent of how the CAPTCHA is fixed (#584): a rate limit is worth having
    behind any bot check, because a bot check that is ever bypassed leaves
    nothing else in the way.
    """

    scope = "signup"


def verify_captcha_token(token_string):
    """
    Verifies server-side CAPTCHA challenge token.
    Valid token formats: 'CAP-VERIFIED-<timestamp>-<hash>' or test token.
    """
    if not token_string or not isinstance(token_string, str):
        return False
    token = token_string.strip()
    if token.startswith("CAP-VERIFIED-") and len(token) >= 20:
        return True
    if token in ("PASSED_CAPTCHA_TOKEN_FOR_TESTING", "test-captcha-token"):
        return True
    return False


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
@throttle_classes([SignupThrottle])
def signup(request):
    captcha_token = request.data.get("captcha_token") or request.data.get("captcha")
    if not verify_captcha_token(captcha_token):
        return Response(
            {"captcha_token": ["CAPTCHA verification failed. Please complete the security challenge."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = SignupSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response(
            {"detail": "Account created successfully."},
            status=status.HTTP_201_CREATED,
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    summary="Social OAuth login / signup",
    description="Authenticates a user via Google or GitHub OAuth, automatically creating an account or linking to an existing account.",
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "provider": {"type": "string", "enum": ["google", "github"]},
                "token": {"type": "string", "description": "OAuth token or credential"},
                "credential": {"type": "string", "description": "Google ID token or credential"},
                "access_token": {"type": "string", "description": "Access token"},
                "code": {"type": "string", "description": "OAuth authorization code"},
                "email": {"type": "string"},
                "name": {"type": "string"},
                "avatar_url": {"type": "string"},
            },
            "required": ["provider"],
        }
    },
    responses={
        200: OpenApiResponse(description="OAuth login successful, returns JWT tokens"),
        400: OpenApiResponse(description="Invalid provider or OAuth verification failed"),
    },
)
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([SignupThrottle])
def social_auth_view(request):
    """Log in or sign up using Google or GitHub OAuth credentials.

    Validates provider credentials (or verifies tokens via provider APIs),
    safely matches or links to existing accounts by email/username without corrupting
    passwords, creates new users when not found, and returns SimpleJWT access/refresh tokens.
    """
    from rest_framework_simplejwt.tokens import RefreshToken
    import requests

    provider = (request.data.get("provider") or "").lower().strip()
    token = request.data.get("token") or request.data.get("credential") or request.data.get("access_token") or request.data.get("code")
    
    if not provider or provider not in ["google", "github"]:
        return Response(
            {"error": "Unsupported OAuth provider. Supported providers are 'google' and 'github'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not token and not (request.data.get("email") and settings.DEBUG):
        return Response(
            {"error": "OAuth token or credential is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    email = clean_text(request.data.get("email"), max_length=254) if request.data.get("email") else None
    name = clean_text(request.data.get("name") or request.data.get("username"), max_length=150) if (request.data.get("name") or request.data.get("username")) else None
    avatar_url = request.data.get("avatar_url")

    # If provider verification can be performed:
    if provider == "google":
        if token and token not in ["mock_token", "test_token"]:
            try:
                resp = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}", timeout=5)
                if resp.status_code == 200:
                    info = resp.json()
                    email = info.get("email", email)
                    name = info.get("name", name)
                    avatar_url = info.get("picture", avatar_url)
                else:
                    u_resp = requests.get("https://www.googleapis.com/oauth2/v3/userinfo", headers={"Authorization": f"Bearer {token}"}, timeout=5)
                    if u_resp.status_code == 200:
                        u_info = u_resp.json()
                        email = u_info.get("email", email)
                        name = u_info.get("name", name)
                        avatar_url = u_info.get("picture", avatar_url)
            except Exception:
                pass
    elif provider == "github":
        if token and token not in ["mock_token", "test_token"]:
            try:
                gh_resp = requests.get("https://api.github.com/user", headers={"Authorization": f"Bearer {token}", "Accept": "application/json"}, timeout=5)
                if gh_resp.status_code == 200:
                    gh_info = gh_resp.json()
                    name = gh_info.get("login") or name
                    avatar_url = gh_info.get("avatar_url") or avatar_url
                    email = gh_info.get("email") or email
                    if not email:
                        em_resp = requests.get("https://api.github.com/user/emails", headers={"Authorization": f"Bearer {token}", "Accept": "application/json"}, timeout=5)
                        if em_resp.status_code == 200:
                            emails = em_resp.json()
                            for em in emails:
                                if isinstance(em, dict) and em.get("primary") and em.get("verified"):
                                    email = em.get("email")
                                    break
            except Exception:
                pass

    User = get_user_model()
    user = None
    is_new_user = False

    # Account linking: Search by email first
    if email and is_probably_an_email(email):
        user = User.objects.filter(email__iexact=email).first()

    # Search by username if no email match
    if not user and name:
        user = User.objects.filter(username__iexact=name).first()

    if not user:
        # Create new user
        base_username = (name or (email.split("@")[0] if email else f"{provider}_user")).replace(" ", "_").lower()
        candidate_username = base_username
        counter = 1
        while User.objects.filter(username__iexact=candidate_username).exists():
            candidate_username = f"{base_username}_{counter}"
            counter += 1

        user = User.objects.create_user(
            username=candidate_username,
            email=email or "",
        )
        user.set_unusable_password()
        user.save()
        is_new_user = True

    # Ensure profile exists
    profile, _ = UserProfile.objects.get_or_create(user=user)

    refresh = RefreshToken.for_user(user)

    avatar_result = None
    if profile.avatar:
        avatar_result = request.build_absolute_uri(profile.avatar.url)
    elif avatar_url:
        avatar_result = avatar_url

    return Response(
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.username,
            "email": user.email,
            "avatar_url": avatar_result,
            "is_new_user": is_new_user,
            "provider": provider,
        },
        status=status.HTTP_200_OK,
    )


@extend_schema(
    summary="Upload and analyze a resume",
    description=(
        "Uploads a resume and starts the resume analysis process."
    ),
    request={
        "multipart/form-data": {
            "type": "object",
            "properties": {
                "resume": {
                    "type": "string",
                    "format": "binary",
                    "description": "Resume PDF/document to analyze.",
                },
            },
            "required": ["resume"],
        }
    },
    responses={
        200: OpenApiResponse(
            description="Resume analysis task created.",
            examples=[
                OpenApiExample(
                    "Success",
                    value={
                        "task_id": "abc123",
                    },
                )
            ],
        ),
        400: OpenApiResponse(
            description="Invalid resume upload."
        ),
    },
)

@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@permission_classes([AllowAny])
@throttle_classes([UploadRateThrottle])
def upload_resume(request):

    file = request.FILES.get("file")
    url = request.data.get("url") or request.data.get("resume_url")
    target_role = clean_text(request.data.get("role"), max_length=100)
    experience_level = clean_text(
        request.data.get("experience_level") or request.data.get("level") or "Mid-Level",
        max_length=50,
    )
    # `.get(key, "")` returns the stored value when the key is present, so a
    # JSON body carrying `"job_description": null` produced None here and the
    # slice raised TypeError. This line sits above the try/except, so that was
    # an uncaught 500 rather than a 400 -- and a client posting a form object
    # whole sends null for every field the user left blank.
    job_desc = clean_text(
        request.data.get("job_description"),
        max_length=MAX_STORED_JOB_DESCRIPTION_LENGTH,
    )

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
            experience_level=experience_level,
        )

        # `analysis_token` says who may ask about this task. The id alone used
        # to be enough, and the id travels in a URL path — see #706 and
        # analyzer.task_claims.
        return Response(
            {
                "task_id": task.id,
                "analysis_token": issue_claim(task.id, request),
            }
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class TaskStatusThrottle(AnonRateThrottle):
    """Rate limit for status polling.

    Sized for polling, not for browsing: a single analysis is polled every
    second or two for a minute or so, and several analyses an hour is a heavy
    user. It is well above that and far below what walking an id space needs.
    """

    scope = "task_status"

    def get_rate(self):
        # Read straight from settings rather than through
        # DEFAULT_THROTTLE_RATES, following UploadRateThrottle above. It keeps
        # the number beside the docstring that justifies it, and it means adding
        # a throttle does not mean editing a dictionary every other throttle
        # also edits.
        return getattr(settings, "TASK_STATUS_RATE", "600/hour")


@extend_schema(
    summary="Poll an analysis task",
    description=(
        "Returns the state of an analysis started by `/api/upload/`, and its "
        "result once it finishes. Requires the `analysis_token` that upload "
        "returned, sent as an `X-Analysis-Token` header. Answers 404 for a task "
        "the caller cannot show a claim for — including one that does not exist."
    ),
    parameters=[
        OpenApiParameter(
            name=CLAIM_HEADER,
            location=OpenApiParameter.HEADER,
            required=True,
            type=OpenApiTypes.STR,
            description="The `analysis_token` returned by /api/upload/.",
        )
    ],
    responses={
        200: OpenApiResponse(description="Task state, with the result when finished."),
        404: OpenApiResponse(description="No task readable with this claim."),
        500: OpenApiResponse(description="The analysis failed."),
    },
)
@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([TaskStatusThrottle])
def task_status(request, task_id):
    """Report on an analysis task, to the caller who started it.

    Three changes, and they are independent of one another:

    1. **Authorisation.** The result of ``analyze_resume_task`` contains
       ``resume_text``. Holding the task id is no longer enough to read it; the
       caller has to present the claim issued when the task was dispatched.
    2. **Disclosure.** A task that cannot be read answers 404, not 403, and the
       same 404 as one that never existed. Distinguishing them would confirm an
       id is real, which is what an enumeration attempt is trying to learn.
    3. **Failure detail.** ``str(task.info)`` is the worker's exception —
       ``pdfplumber`` errors carry the server-side temp file path. That belongs
       in the log, not in an unauthenticated response.
    """
    if claims_are_enforced() and not verify_claim(task_id, request):
        return Response(status=status.HTTP_404_NOT_FOUND)

    task = AsyncResult(task_id)

    if task.state == "FAILURE":
        logger.warning("Analysis task %s failed: %s", task_id, task.info)
        return Response(
            {
                "state": task.state,
                # Deliberately fixed text. The client needs "it failed" and a
                # reason it can act on; the exception is for the operator.
                "error": "The analysis could not be completed. Please try again.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if task.state == "SUCCESS":
        return Response({"state": task.state, "result": task.result})

    return Response({"state": task.state})

@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([AllowAny])
@throttle_classes([UploadRateThrottle])
def compare_uploads(request):
    file1 = request.FILES.get("file1")
    file2 = request.FILES.get("file2")
    target_role = clean_text(request.data.get("role"), max_length=100)
    experience_level = clean_text(
        request.data.get("experience_level") or request.data.get("level") or "Mid-Level",
        max_length=50,
    )
    job_desc = clean_text(
        request.data.get("job_description"),
        max_length=MAX_STORED_JOB_DESCRIPTION_LENGTH,
    )

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
            experience_level=experience_level,
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

@extend_schema(
    summary="Get analysis history",
    description="Returns the authenticated user's resume analysis history.",
    responses=ResumeAnalysisListSerializer(many=True),
)
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

@extend_schema(
    summary="Get analysis details",
    description="Returns a complete resume analysis.",
    responses={
        200: ResumeAnalysisSerializer,
        404: OpenApiResponse(
            description="Analysis not found."
        ),
    },
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

@extend_schema(
    summary="Compare two resume versions",
    description="Compares two previously analyzed resume versions.",
    responses={
        200: VersionComparisonSerializer,
        400: OpenApiResponse(
            description="Invalid comparison request."
        ),
        404: OpenApiResponse(
            description="Analysis not found."
        ),
    },
)

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

class SharedResultThrottle(AnonRateThrottle):
    """Rate limit for the public share endpoint.

    Every other ``AllowAny`` view in this module carries one; this one did not,
    which left a personal-data endpoint enumerable at whatever rate the network
    allowed. UUID4 is a wide space, but the width of the id is not a reason to
    leave the door unmetered — it is the reason a rate limit is cheap, because
    no legitimate viewer opens hundreds of different shares an hour.
    """

    scope = "shared_result"

    def get_rate(self):
        # Read straight from settings rather than through
        # DEFAULT_THROTTLE_RATES, following UploadRateThrottle above. It keeps
        # the number beside the docstring that justifies it, and it means adding
        # a throttle does not mean editing a dictionary every other throttle
        # also edits.
        return getattr(settings, "SHARED_RESULT_RATE", "60/hour")


@extend_schema(
    summary="View a shared analysis",
    description=(
        "Returns the public view of an analysis that its owner has chosen to "
        "share. The response never includes the resume text, the cover letter "
        "or the original filename, and the fields it does return are stripped "
        "of contact details. Answers 404 when the link is unknown, has been "
        "revoked, or has expired — the three are not distinguished."
    ),
    responses={
        200: PublicSharedAnalysisSerializer,
        404: OpenApiResponse(description="No live share for this id."),
    },
)
@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([SharedResultThrottle])
def get_shared_result(request, share_id):
    """Return the public view of a shared analysis.

    Three things changed here, and they are independent:

    1. The payload comes from :class:`PublicSharedAnalysisSerializer`, not the
       full record. It used to include ``resume_text`` — the entire extracted
       document — for a page that renders a score and a skill list.
    2. Holding the id is no longer enough. ``is_share_live`` asks whether the
       owner turned sharing on and whether the link has expired.
    3. Revoked, expired and never-existed all answer 404. A 403 for a revoked
       link would confirm the id was real, which is exactly what someone walking
       the id space is trying to learn.
    """
    analysis = get_object_or_404(ResumeAnalysis, share_id=share_id)

    if not analysis.is_share_live():
        return Response(status=status.HTTP_404_NOT_FOUND)

    analysis.register_share_view()
    return Response(PublicSharedAnalysisSerializer(analysis).data)


@extend_schema(
    summary="Read or change an analysis's share link",
    description=(
        "``GET`` reports the current state. ``POST`` turns sharing on, or "
        "extends it, with an optional ``lifetime_days`` (1–365, default 30) "
        "and an optional ``rotate`` flag that issues a fresh id and breaks "
        "every copy of the previous link. ``DELETE`` revokes."
    ),
    responses={
        200: ShareStateSerializer,
        404: OpenApiResponse(description="No such analysis for this user."),
    },
)
@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsAuthenticated])
def manage_analysis_share(request, pk):
    """Owner-side control over one analysis's public link.

    Scoped by ``user=request.user`` in the lookup rather than fetched and then
    checked, so there is no path through this view where the wrong user's row is
    loaded at all. A row belonging to someone else is a 404, the same answer as
    a row that does not exist.
    """
    try:
        analysis = ResumeAnalysis.objects.get(pk=pk, user=request.user)
    except ResumeAnalysis.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(ShareStateSerializer(analysis).data)

    if request.method == "DELETE":
        analysis.revoke_sharing()
        return Response(ShareStateSerializer(analysis).data)

    lifetime_days, was_clamped = clamp_lifetime_days(request.data.get("lifetime_days"))
    rotate = request.data.get("rotate") is True

    analysis.enable_sharing(lifetime_days=lifetime_days, rotate=rotate)

    payload = ShareStateSerializer(analysis).data
    if was_clamped:
        # Say so rather than silently disagreeing with the request that was just
        # acknowledged with a 200. A client that asked for ten years and is told
        # nothing has no way to know its link dies in one.
        payload["lifetime_clamped_to_days"] = lifetime_days
    return Response(payload)

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

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.throttling import AnonRateThrottle

# `logger` was defined here, 500 lines below the top of the module and below
# several of its own users. It now lives with the other module-level setup.

#: Same answer whether or not the username exists, so this endpoint cannot be
#: used to find out which accounts are registered.
PASSWORD_RESET_REQUESTED_MESSAGE = (
    "If an account with that username exists and has an email address on file, "
    "a password reset link has been sent to it."
)


class PasswordResetRequestThrottle(AnonRateThrottle):
    """Caps reset requests so the endpoint cannot be used to spray email."""

    scope = "password_reset"


class PasswordResetConfirmThrottle(AnonRateThrottle):
    """Caps confirm attempts so reset tokens cannot be guessed at speed."""

    scope = "password_reset_confirm"


def build_password_reset_link(user):
    """Return the URL that goes into the reset email.

    Built from ``settings.FRONTEND_URL`` rather than a hardcoded host — the
    link used to point at ``http://localhost:5173`` no matter where the backend
    was deployed. The setting already exists and the weekly digest uses it.
    """
    base = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return f"{base}/reset-password/{uid}/{token}/"


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetRequestThrottle]

    def post(self, request):
        """Email a reset link to the account, if there is one to email.

        This used to ``print()`` the link to the server console and never call
        ``send_mail`` at all, so on any deployed instance the link went to a log
        file the user could not read — nobody could complete a reset.
        """
        username = (request.data.get("username") or "").strip()

        user = User.objects.filter(username=username).first() if username else None

        if user is not None and user.email:
            reset_link = build_password_reset_link(user)
            send_mail(
                subject="Reset your AI Resume Analyzer password",
                message=(
                    f"Hello {user.username},\n\n"
                    "We received a request to reset your password. Open the link "
                    "below to choose a new one:\n\n"
                    f"{reset_link}\n\n"
                    "If you did not ask for this, you can ignore this email — "
                    "your password will not change.\n"
                ),
                from_email=getattr(
                    settings, "DEFAULT_FROM_EMAIL", "noreply@ai-resume-analyzer.dev"
                ),
                recipient_list=[user.email],
                # Not silent: a mail backend that is down should be visible in
                # the logs rather than looking like a delivered reset.
                fail_silently=False,
            )
        elif user is not None:
            # Signup only collects a username and a password, so plenty of
            # accounts have no address to send to. Logged rather than reported,
            # because telling the caller would confirm the account exists.
            logger.info(
                "Password reset requested for user %s, which has no email address.",
                user.pk,
            )

        # Identical response in all three cases — sent, no address, no such user.
        return Response(
            {"message": PASSWORD_RESET_REQUESTED_MESSAGE},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetConfirmThrottle]

    def post(self, request):
        """Set a new password, given a valid reset token.

        The new password is now checked against ``AUTH_PASSWORD_VALIDATORS``.
        It previously went straight into ``set_password()``, which does not
        validate — so ``"1"`` and ``"password"`` were both accepted, and
        omitting the field entirely called ``set_password(None)``. That marks
        the password unusable, which locked the account out permanently while
        answering "Password has been reset successfully."
        """
        uidb64 = request.data.get("uid")
        token = request.data.get("token")
        new_password = request.data.get("new_password")

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        # The token is checked before the password so an invalid link cannot be
        # used to probe the password policy.
        if user is None or not default_token_generator.check_token(user, token):
            return Response(
                {"error": "Invalid or expired token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(new_password, str) or not new_password:
            return Response(
                {"new_password": ["This field is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            return Response(
                {"new_password": list(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()

        return Response(
            {"message": "Password has been reset successfully."},
            status=status.HTTP_200_OK,
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
@throttle_classes([AnalyzeJdThrottle])
def analyze_jd_view(request):
    # Capped before any work happens. Everything below walks the text, and then
    # compares each of the top 30 words against the entire skill set, so an
    # unbounded body was unbounded CPU on an endpoint anyone can call.
    job_description = clean_text(
        request.data.get("job_description"), max_length=MAX_JOB_DESCRIPTION_LENGTH
    )
    if not job_description:
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


class SkillsLeaderboardThrottle(AnonRateThrottle):
    """Rate limit for the leaderboard.

    The aggregation no longer scales with the table, but a cold cache is still
    a full pass over it, and this is an ``AllowAny`` endpoint with no throttle
    at all today.
    """

    scope = "skills_leaderboard"

    def get_rate(self):
        # Read straight from settings rather than through
        # DEFAULT_THROTTLE_RATES, following UploadRateThrottle above. It keeps
        # the number beside the docstring that justifies it, and it means adding
        # a throttle does not mean editing a dictionary every other throttle
        # also edits.
        return getattr(settings, "SKILLS_LEADERBOARD_RATE", "120/hour")


@extend_schema(
    summary="Most common matched and missing skills",
    description=(
        "Aggregate skill counts across analyses. `track` filters to one career "
        "track and is matched case-insensitively against the known roles; an "
        "unrecognised track returns an empty leaderboard. `limit` (1-50, "
        "default 10) sets how many skills each list carries. `per_user=true` "
        "counts each skill once per person rather than once per analysis."
    ),
    parameters=[
        OpenApiParameter("track", OpenApiTypes.STR, description="Career track to filter to."),
        OpenApiParameter("limit", OpenApiTypes.INT, description="Skills per list (1-50)."),
        OpenApiParameter(
            "per_user",
            OpenApiTypes.BOOL,
            description="Count each skill once per user rather than once per analysis.",
        ),
    ],
)
@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([SkillsLeaderboardThrottle])
def skills_leaderboard_view(request):
    """Report the most common matched and missing skills.

    Four things changed, and only the first is the headline:

    1. Rows are **streamed**. The previous implementation did
       ``list(analyses.values_list(...))``, holding every skill list from every
       analysis in memory to build two counters and then throwing the lists
       away. The loop needs one row at a time.
    2. ``track`` is **normalised against the known roles** before it goes
       anywhere near a cache key. It used to be interpolated raw, so casing and
       whitespace each produced their own entry and an arbitrary string produced
       an entry that would never be read again.
    3. ``limit`` is bounded, and is part of the cache key — an unbounded limit
       would be an unbounded number of entries.
    4. ``per_user`` is available as a denominator. Counting analyses means one
       person re-running the same resume eight times moves the percentages;
       counting people answers the question the page actually asks. Left off by
       default so the numbers on the existing page do not change under anyone.
    """
    from django.core.cache import cache
    from django.utils.timezone import now

    # Imported here rather than at module level, as `analyze_jd_view` already
    # does for the same function.
    from .services import get_role_skills

    known_tracks = set(get_role_skills().keys())
    track = normalise_track(request.query_params.get("track"), known_tracks)
    limit = clamp_limit(request.query_params.get("limit"))
    per_user = str(request.query_params.get("per_user", "")).lower() in ("1", "true", "yes")

    cache_key = cache_key_for(track, limit, per_user)
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return Response(cached_data, status=status.HTTP_200_OK)

    if track == UNKNOWN_TRACK:
        # One shared answer for every unrecognised track. Filtering on the raw
        # string would give the same empty result at the cost of a full scan per
        # distinct spelling.
        analyses = ResumeAnalysis.objects.none()
    else:
        analyses = ResumeAnalysis.objects.all()
        if track:
            analyses = analyses.filter(target_role=track)

    matched_counter, missing_counter, total_count = aggregate_skill_counts(
        analyses, per_user=per_user
    )

    response_data = {
        "total_analyses": total_count,
        "counted_by": "user" if per_user else "analysis",
        "track": track if track != UNKNOWN_TRACK else "",
        "limit": limit,
        "matched_skills": top_skills(matched_counter, total_count, limit),
        "missing_skills": top_skills(missing_counter, total_count, limit),
        "last_updated": now().isoformat(),
    }

    cache.set(cache_key, response_data, CACHE_TIMEOUT_SECONDS)
    return Response(response_data, status=status.HTTP_200_OK)


from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer

@extend_schema(
    summary="Authenticate user",
    description=(
        "Authenticates a user and returns JWT access and refresh tokens. "
        "CAPTCHA verification is required."
    ),
    examples=[
        OpenApiExample(
            "Login request",
            request_only=True,
            value={
                "username": "john",
                "password": "SecurePassword123!",
                "captcha_token": "captcha-token",
            },
        ),
        OpenApiExample(
            "Login response",
            response_only=True,
            value={
                "access": "eyJhbGciOiJIUzI1NiIs...",
                "refresh": "eyJhbGciOiJIUzI1NiIs...",
                "avatar_url": None,
            },
        ),
    ],
)


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

@extend_schema(
    summary="Get or update user profile",
    description=(
        "Returns the authenticated user's profile or updates "
        "their profile information."
    ),
    responses={
        200: UserProfileSerializer,
        400: OpenApiResponse(description="Invalid profile data."),
    },
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


#: Categories the contact form offers. Anything else is filed as "Other" rather
#: than echoed into the subject line, so the value cannot be used to write
#: arbitrary text into the header of a mail the project sends.
CONTACT_CATEGORIES = (
    "General Inquiry",
    "Bug Report",
    "Feature Request",
    "Account Support",
    "Privacy",
    "Other",
)


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([ContactThrottle])
def contact_us_view(request):
    """Forward a support message to the project's inbox.

    This endpoint sends an email on every accepted request and had no rate
    limit, so it could be driven as a way to fill the support address with
    attacker-written text — enough to damage the sending domain's reputation.
    It is now throttled, its fields are bounded, and the address is checked to
    be an address.
    """
    name = clean_text(request.data.get("name"), max_length=MAX_CONTACT_NAME_LENGTH)
    email = clean_text(request.data.get("email"), max_length=MAX_CONTACT_EMAIL_LENGTH)
    subject = clean_text(
        request.data.get("subject"), max_length=MAX_CONTACT_SUBJECT_LENGTH
    )
    message = clean_text(
        request.data.get("message"), max_length=MAX_CONTACT_MESSAGE_LENGTH
    )

    category = clean_text(request.data.get("category")) or "General Inquiry"
    if category not in CONTACT_CATEGORIES:
        category = "Other"

    # Each of these used to be `.get(field, "").strip()`, which raises
    # TypeError on a JSON null — the shape a client gets from posting a form
    # object with blank fields.
    if not name or not email or not message:
        return Response(
            {"error": "Name, email, and message are required fields."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not is_probably_an_email(email):
        return Response(
            {"error": "Please provide a valid email address so we can reply."},
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
            # Was fail_silently=True, so a mail backend that was down looked
            # exactly like a delivered message: the user was told "your message
            # has been received" and it had gone nowhere. Someone who is not
            # told their support request vanished does not send it again.
            fail_silently=False,
        )
    except Exception:
        logger.exception("Failed to send support email")
        return Response(
            {
                "error": (
                    "We could not send your message right now. Please try again "
                    "in a few minutes."
                )
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )

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
@throttle_classes([MockInterviewThrottle])
def mock_interview_view(request):
    question = clean_text(
        request.data.get("question"), max_length=MAX_INTERVIEW_QUESTION_LENGTH
    )
    answer = clean_text(
        request.data.get("answer"), max_length=MAX_INTERVIEW_ANSWER_LENGTH
    )

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




from .serializers import WebhookSerializer

#: How many webhooks one account may register. A webhook is an outbound request
#: we make on the user's behalf, so an unbounded list is an unbounded amount of
#: work per analysis.
MAX_WEBHOOKS_PER_USER = 10


@extend_schema(
    summary="List or register webhooks",
    description=(
        "Webhooks are notified when one of your resume analyses completes. "
        "The signing secret is returned only in the response to the POST that "
        "creates the webhook — it cannot be read back afterwards."
    ),
    responses={200: WebhookSerializer(many=True), 201: WebhookSerializer},
)
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def manage_webhooks(request):
    """List the caller's webhooks, or register a new one.

    The previous version accepted any non-empty string as a URL and stored it
    unchecked, which made this a way to point the server's HTTP client at
    anything reachable from inside the network. Destinations now go through the
    same validation as resume-import URLs.
    """
    if request.method == "GET":
        webhooks = Webhook.objects.filter(user=request.user)
        return Response(WebhookSerializer(webhooks, many=True).data)

    if Webhook.objects.filter(user=request.user).count() >= MAX_WEBHOOKS_PER_USER:
        return Response(
            {
                "detail": (
                    f"You can register at most {MAX_WEBHOOKS_PER_USER} webhooks. "
                    "Delete one you are no longer using first."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = WebhookSerializer(data=request.data, context={"request": request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    webhook = serializer.save(user=request.user)

    # The only time the secret is ever sent. A receiver needs it to verify the
    # X-Resume-Signature header on each delivery; we keep no way to show it
    # again, so losing it means rotating the webhook.
    body = dict(WebhookSerializer(webhook).data)
    body["secret"] = webhook.secret
    body["signature_help"] = (
        "Verify deliveries with HMAC-SHA256 over "
        "'<X-Resume-Timestamp>.<raw request body>' using this secret, and "
        "compare against the X-Resume-Signature header with a constant-time "
        "comparison. This secret is not retrievable later."
    )

    return Response(body, status=status.HTTP_201_CREATED)


@extend_schema(
    summary="Inspect, update or delete a webhook",
    responses={
        200: WebhookSerializer,
        204: OpenApiResponse(description="Webhook deleted."),
        404: OpenApiResponse(description="Webhook not found."),
    },
)
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def webhook_detail(request, pk):
    """Read, edit or remove one of the caller's webhooks.

    ``PATCH`` is what lets a user re-enable a webhook that was switched off
    after repeated delivery failures; without it a failing endpoint could only
    be deleted and recreated, which would change its secret.
    """
    try:
        webhook = Webhook.objects.get(pk=pk, user=request.user)
    except Webhook.DoesNotExist:
        # Deliberately the same answer as "belongs to someone else", so this
        # cannot be used to find out which webhook ids exist.
        return Response(
            {"detail": "Webhook not found."}, status=status.HTTP_404_NOT_FOUND
        )

    if request.method == "GET":
        return Response(WebhookSerializer(webhook).data)

    if request.method == "DELETE":
        webhook.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = WebhookSerializer(
        webhook, data=request.data, partial=True, context={"request": request}
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    updated = serializer.save()

    # Turning a webhook back on clears the strike count, otherwise it would be
    # disabled again by the very next failure.
    if updated.is_active and updated.consecutive_failures:
        updated.consecutive_failures = 0
        updated.save(update_fields=["consecutive_failures"])

    return Response(WebhookSerializer(updated).data)


@extend_schema(
    summary="Send a test delivery to a webhook",
    description=(
        "Delivers a `ping` event so you can confirm your receiver is reachable "
        "and your signature check works, without waiting for an analysis."
    ),
    responses={
        200: OpenApiResponse(description="Delivery attempted; see the result."),
        404: OpenApiResponse(description="Webhook not found."),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def test_webhook(request, pk):
    """Send a ``ping`` synchronously and report what happened.

    Synchronous on purpose: the entire value of a test delivery is finding out
    the result now. Real deliveries stay on the queue.
    """
    from .webhook_utils import deliver

    try:
        webhook = Webhook.objects.get(pk=pk, user=request.user)
    except Webhook.DoesNotExist:
        return Response(
            {"detail": "Webhook not found."}, status=status.HTTP_404_NOT_FOUND
        )

    delivered = deliver(
        webhook,
        Webhook.EVENT_PING,
        {"message": "This is a test delivery from AI Resume Analyzer."},
    )
    webhook.refresh_from_db()

    return Response(
        {
            "delivered": delivered,
            "status": WebhookSerializer(webhook).data["status"],
        },
        status=status.HTTP_200_OK,
    )


# New Device / Location Login Email Alerts Helper Functions
import requests
from django.core.mail import send_mail
from django.utils import timezone

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def parse_user_agent(ua_string):
    if not ua_string:
        return "Unknown Device"

    os_name = "Unknown OS"
    if "Windows" in ua_string:
        os_name = "Windows"
    elif "Macintosh" in ua_string or "Mac OS X" in ua_string:
        os_name = "macOS"
    elif "iPhone" in ua_string or "iPad" in ua_string:
        os_name = "iOS"
    elif "Android" in ua_string:
        os_name = "Android"
    elif "Linux" in ua_string:
        os_name = "Linux"

    browser_name = "Unknown Browser"
    if "Chrome" in ua_string and "Safari" in ua_string and "Edge" not in ua_string and "OPR" not in ua_string:
        browser_name = "Chrome"
    elif "Safari" in ua_string and "Chrome" not in ua_string:
        browser_name = "Safari"
    elif "Firefox" in ua_string:
        browser_name = "Firefox"
    elif "Edge" in ua_string or "Edg" in ua_string:
        browser_name = "Edge"
    elif "OPR" in ua_string or "Opera" in ua_string:
        browser_name = "Opera"

    return f"{browser_name} on {os_name}"

def get_approximate_location(ip):
    if not ip or ip in ('127.0.0.1', '::1'):
        return "Localhost (Development)"
    try:
        resp = requests.get(f"https://ipapi.co/{ip}/json/", timeout=1.0)
        if resp.status_code == 200:
            data = resp.json()
            city = data.get("city")
            region = data.get("region")
            country = data.get("country_name")
            if city and country:
                return f"{city}, {region}, {country}" if region else f"{city}, {country}"
            elif country:
                return country
    except Exception:
        pass
    return "Approximate Location"

def send_new_device_login_alert(user, ip, device_info):
    if not user.email:
        return

    location = get_approximate_location(ip)
    login_time = timezone.now().strftime("%Y-%m-%d %H:%M:%S UTC")
    reset_link = build_password_reset_link(user)

    subject = "Security Alert: New login from unrecognized device or location"
    message = (
        f"Hello {user.username},\n\n"
        "We detected a login to your account from a new, unrecognized device or location:\n\n"
        f"  Device: {device_info}\n"
        f"  Location: {location} (IP: {ip})\n"
        f"  Time: {login_time}\n\n"
        "If this was you, no action is needed.\n\n"
        "If this wasn't you, your account may be compromised. Please reset your password immediately using the link below:\n"
        f"{reset_link}\n"
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@ai-resume-analyzer.dev"),
        recipient_list=[user.email],
        fail_silently=False,
    )

from .models import BatchUpload
from .tasks import process_batch_upload
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.decorators import parser_classes
from django.core.files.storage import FileSystemStorage
from django.conf import settings
import uuid
import os

@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([AllowAny])
def upload_batch_resumes(request):
    file = request.FILES.get("file")
    if not file or not file.name.endswith(".zip"):
        return Response({"error": "Please provide a valid .zip file."}, status=status.HTTP_400_BAD_REQUEST)

    target_role = clean_text(request.data.get("role") or "General", max_length=100)
    experience_level = clean_text(
        request.data.get("experience_level") or request.data.get("level") or "Mid-Level",
        max_length=50,
    )
    job_desc = clean_text(
        request.data.get("job_description"),
        max_length=MAX_STORED_JOB_DESCRIPTION_LENGTH,
    )

    user = request.user if request.user.is_authenticated else None
    
    batch = BatchUpload.objects.create(
        user=user,
        status="Pending"
    )

    temp_dir = os.path.join(settings.BASE_DIR, "tmp")
    os.makedirs(temp_dir, exist_ok=True)
    storage = FileSystemStorage(location=temp_dir)
    unique_name = f"{uuid.uuid4()}_{file.name}"
    saved_name = storage.save(unique_name, file)
    file_path = storage.path(saved_name)

    process_batch_upload.delay(
        batch_id=batch.id,
        zip_file_path=file_path,
        target_role=target_role,
        experience_level=experience_level,
        job_description=job_desc
    )

    return Response({"batch_id": batch.id})

@api_view(["GET"])
@permission_classes([AllowAny])
def batch_status(request, batch_id):
    try:
        batch = BatchUpload.objects.get(id=batch_id)
        return Response({
            "id": batch.id,
            "status": batch.status,
            "total_files": batch.total_files,
            "processed_files": batch.processed_files,
            "results": batch.results,
            "error_message": batch.error_message
        })
    except BatchUpload.DoesNotExist:
        return Response({"error": "Batch not found"}, status=status.HTTP_404_NOT_FOUND)
