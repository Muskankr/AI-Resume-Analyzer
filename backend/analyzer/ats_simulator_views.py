from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from django.shortcuts import get_object_or_404

from .models import ResumeAnalysis
from .ats_simulator import get_all_profiles, get_simulator, analyze_ats_compatibility

@extend_schema(
    summary="List available ATS Simulator profiles",
    description="Returns a list of supported ATS simulation profiles and their descriptions.",
    responses={
        200: dict,
    }
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_ats_profiles(request):
    return Response({"profiles": get_all_profiles()})

@extend_schema(
    summary="Run ATS Simulations on a parsed resume",
    description="Simulates how different ATS platforms might parse and score a previously analyzed resume.",
    parameters=[
        OpenApiParameter(name="platforms", type=str, location=OpenApiParameter.QUERY, description="Comma-separated list of platform IDs to simulate (e.g., 'workday,greenhouse'). If omitted, runs all available profiles.")
    ],
    responses={
        200: dict,
        404: dict,
        400: dict
    }
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def simulate_ats(request, analysis_id):
    analysis = get_object_or_404(ResumeAnalysis, id=analysis_id, user=request.user)
    
    platforms_query = request.GET.get("platforms", "")
    if platforms_query:
        selected_ids = [p.strip().lower() for p in platforms_query.split(",")]
    else:
        selected_ids = [p["id"] for p in get_all_profiles()]
        
    results = []
    
    text = analysis.resume_text or ""
    parsed_data = {
        "skills_found": analysis.skills_found,
    }
    
    for pid in selected_ids:
        simulator = get_simulator(pid)
        if not simulator:
            return Response({"error": f"Unsupported ATS platform: '{pid}'"}, status=status.HTTP_400_BAD_REQUEST)
            
        results.append(simulator.simulate(text, parsed_data))
        
    return Response({
        "analysis_id": analysis.id,
        "simulations": results
    })


class AtsCompatibilityRequestSerializer(serializers.Serializer):
    """Input for the ten-point ATS compatibility check.

    Either ``resume_text`` or ``analysis_id`` must be supplied. ``analysis_id``
    loads a resume the signed-in user has already analysed, so authentication
    is required for that path only.
    """

    resume_text = serializers.CharField(
        required=False, allow_blank=True, max_length=60000, trim_whitespace=False,
        help_text="Plain text of the resume to check.",
    )
    job_description = serializers.CharField(
        required=False, allow_blank=True, max_length=20000, default="",
        trim_whitespace=False,
        help_text="Optional target job posting; enables real keyword-overlap scoring.",
    )
    analysis_id = serializers.IntegerField(
        required=False,
        help_text="ID of one of the caller's saved analyses to score instead.",
    )
    has_tables = serializers.BooleanField(required=False, default=False)
    has_columns = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        if not (attrs.get("resume_text") or "").strip() and not attrs.get("analysis_id"):
            raise serializers.ValidationError(
                "Provide 'resume_text' or 'analysis_id'."
            )
        return attrs


@extend_schema(
    summary="Ten-point ATS compatibility check",
    description=(
        "Scores a resume against ten vendor-neutral ATS parsing criteria "
        "(headings, contact info, dates, encoding, keywords, tables, length, "
        "education, skills, text purity) and returns an overall score, letter "
        "grade, estimated pass rate, per-criterion evidence, and a prioritised "
        "list of fixes. Public: send `resume_text` with no auth."
    ),
    request=AtsCompatibilityRequestSerializer,
    responses={200: dict, 400: dict, 401: dict, 404: dict},
)
@api_view(["POST"])
@permission_classes([AllowAny])
def ats_compatibility_check(request):
    payload = AtsCompatibilityRequestSerializer(data=request.data)
    payload.is_valid(raise_exception=True)
    data = payload.validated_data

    resume_text = (data.get("resume_text") or "").strip()
    if not resume_text and data.get("analysis_id"):
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Sign in to score a saved analysis by id."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        analysis = get_object_or_404(
            ResumeAnalysis, id=data["analysis_id"], user=request.user
        )
        resume_text = analysis.resume_text or ""

    report = analyze_ats_compatibility(
        resume_text,
        job_description=data.get("job_description", ""),
        has_tables=data.get("has_tables", False),
        has_columns=data.get("has_columns", False),
    )
    return Response(report, status=status.HTTP_200_OK)
