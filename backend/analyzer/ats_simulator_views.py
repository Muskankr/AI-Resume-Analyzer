from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from django.shortcuts import get_object_or_404

from .models import ResumeAnalysis
from .ats_simulator import get_all_profiles, get_simulator

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
