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
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

from .comparison import compare_versions
from .models import ResumeAnalysis
from .serializers import (
    SignupSerializer,
    ResumeAnalysisSerializer,
    VersionComparisonSerializer,
)
from .services import analyze_resume


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


@api_view(["POST"])
@permission_classes([AllowAny])
def signup(request):
    serializer = SignupSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response(
            {"detail": "Account created successfully."},
            status=status.HTTP_201_CREATED,
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([AllowAny])
@throttle_classes([UploadRateThrottle])
def upload_resume(request):

    file = request.FILES.get("file")
    target_role = request.data.get("role", "")
    file_name = file.name if file else "resume.pdf"
    job_desc = request.data.get("job_description", "")[:2000]
    jd_file = request.FILES.get("job_description_file")
    job_desc_file_path = None

    if not file:
        return Response(
            {"error": "No file uploaded"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        temp_dir = os.path.join(settings.BASE_DIR, "tmp")
        os.makedirs(temp_dir, exist_ok=True)

        storage = FileSystemStorage(location=temp_dir)

        unique_name = f"{uuid.uuid4()}_{file.name}"

        saved_name = storage.save(unique_name, file)

        file_path = storage.path(saved_name)

        if jd_file:
            jd_name = f"{uuid.uuid4()}_{jd_file.name}"
            jd_saved_name = storage.save(jd_name, jd_file)
            job_desc_file_path = storage.path(jd_saved_name)

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
            job_description_file_path=job_desc_file_path,
        )

        return Response(result)

    except Exception as e:
        import traceback

        traceback.print_exc()

        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
def delete_single_history(request, pk):
    try:
        entry = ResumeAnalysis.objects.get(pk=pk, user=request.user)
        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except ResumeAnalysis.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def clear_user_history(request):
    ResumeAnalysis.objects.filter(user=request.user).delete()
    return Response({"message": "All history cleared"}, status=status.HTTP_204_NO_CONTENT)


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