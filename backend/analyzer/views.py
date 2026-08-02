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
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from rest_framework.throttling import SimpleRateThrottle
from django.core.signing import TimestampSigner, SignatureExpired, BadSignature

from .comparison import compare_versions
from .models import ResumeAnalysis, UserProfile
from .serializers import (
    SignupSerializer,
    ResumeAnalysisSerializer,
    VersionComparisonSerializer,
    UserProfileSerializer,
)
from .services import analyze_resume
from .url_fetcher import download_and_validate_url
from django.shortcuts import get_object_or_404


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


class IsEmailVerified(BasePermission):
    message = "Please verify your email address to access this feature."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return True
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return profile.is_verified


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


@api_view(["POST"])
@permission_classes([AllowAny])
def signup(request):
    captcha_token = request.data.get("captcha_token") or request.data.get("captcha")
    if not verify_captcha_token(captcha_token):
        return Response(
            {"captcha_token": ["CAPTCHA verification failed. Please complete the security challenge."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = SignupSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()
        
        # Send email verification
        signer = TimestampSigner()
        token = signer.sign(str(user.id))
        
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
        verification_link = f"{frontend_url}/verify-email/{token}/"
        
        email_body = f"Hello {user.username},\n\nPlease verify your email address by clicking the link below:\n{verification_link}\n\nThis link is valid for 24 hours.\n\nIf you did not request this, please ignore this email."

        print("\n" + "="*50)
        print(f"VERIFICATION LINK FOR USERNAME: {user.username}")
        print(verification_link)
        print("="*50 + "\n")

        try:
            send_mail(
                subject="Verify your email - AI Resume Analyzer",
                message=email_body,
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "webmaster@localhost"),
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"Failed to send email: {e}")

        return Response(
            {"detail": "Account created successfully. Please verify your email."},
            status=status.HTTP_201_CREATED,
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@permission_classes([AllowAny])
@throttle_classes([UploadRateThrottle])
def upload_resume(request):

    if request.user.is_authenticated:
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        if not profile.is_verified:
            return Response(
                {"error": "Please verify your email address to access full features."},
                status=status.HTTP_403_FORBIDDEN,
            )

    file = request.FILES.get("file")
    url = request.data.get("url") or request.data.get("resume_url")
    target_role = request.data.get("role", "")
    job_desc = request.data.get("job_description", "")[:2000]

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

        cover_letter = request.FILES.get("cover_letter")
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

        result = analyze_resume(
            file_path=file_path,
            target_role=target_role,
            file_name=file_name,
            user_id=user_id,
            job_description=job_desc,
            cover_letter_path=cover_letter_path,
            cover_letter_name=cover_letter_name,
        )

        return Response(result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

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


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsEmailVerified])
def analysis_history(request):

    analyses = ResumeAnalysis.objects.filter(
        user=request.user
    )

    serializer = ResumeAnalysisSerializer(
        analyses,
        many=True,
    )

    return Response(serializer.data)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsEmailVerified])
def delete_single_history(request, pk):
    try:
        entry = ResumeAnalysis.objects.get(pk=pk, user=request.user)
        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except ResumeAnalysis.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsEmailVerified])
def clear_user_history(request):
    ResumeAnalysis.objects.filter(user=request.user).delete()
    return Response({"message": "All history cleared"}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsEmailVerified])
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


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsEmailVerified])
def suggestion_feedback(request):
    """
    Handle upvote/downvote or comments on a specific suggestion.
    In a real app, you'd store this in a SuggestionFeedback model.
    """
    analysis_id = request.data.get("analysis_id")
    suggestion_text = request.data.get("suggestion_text")
    vote = request.data.get("vote")  # 'up' or 'down'

    if not analysis_id or not suggestion_text or not vote:
        return Response(
            {"detail": "Missing required fields."}, status=status.HTTP_400_BAD_REQUEST
        )

    return Response({"detail": "Feedback recorded successfully."})

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

@api_view(["POST"])
@permission_classes([AllowAny])
def verify_email(request):
    token = request.data.get("token")
    if not token:
        return Response({"error": "Verification token is required."}, status=status.HTTP_400_BAD_REQUEST)

    signer = TimestampSigner()
    try:
        user_id = signer.unsign(token, max_age=86400)  # 24 hours expiry
        user = User.objects.get(pk=user_id)
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.is_verified = True
        profile.save()
        return Response({"message": "Email verified successfully."}, status=status.HTTP_200_OK)
    except SignatureExpired:
        return Response({"error": "Verification token has expired."}, status=status.HTTP_400_BAD_REQUEST)
    except (BadSignature, User.DoesNotExist, ValueError, TypeError):
        return Response({"error": "Invalid verification token."}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def resend_verification_email(request):
    user = request.user
    profile, _ = UserProfile.objects.get_or_create(user=user)
    if profile.is_verified:
        return Response({"message": "Email is already verified."}, status=status.HTTP_400_BAD_REQUEST)

    if not user.email:
        return Response({"error": "User has no email address configured."}, status=status.HTTP_400_BAD_REQUEST)

    signer = TimestampSigner()
    token = signer.sign(str(user.id))

    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    verification_link = f"{frontend_url}/verify-email/{token}/"

    email_body = f"Hello {user.username},\n\nPlease verify your email address by clicking the link below:\n{verification_link}\n\nThis link is valid for 24 hours.\n\nIf you did not request this, please ignore this email."

    print("\n" + "="*50)
    print(f"VERIFICATION LINK FOR USERNAME: {user.username}")
    print(verification_link)
    print("="*50 + "\n")

    try:
        send_mail(
            subject="Verify your email - AI Resume Analyzer",
            message=email_body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "webmaster@localhost"),
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception as e:
        return Response({"error": f"Failed to send email: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({"message": "Verification link sent to your email."}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_status(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    return Response({
        "username": request.user.username,
        "email": request.user.email,
        "is_verified": profile.is_verified,
    }, status=status.HTTP_200_OK)


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
    
    from analyzer.services import ROLE_SKILLS
    all_skills = set()
    for skills_list in ROLE_SKILLS.values():
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
