"""
Views for Project Portfolio Extractor.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .project_extractor import analyze_portfolio
from .project_serializers import (
    ProjectExtractionRequestSerializer,
    ProjectExtractionResponseSerializer,
)


class ProjectExtractionView(APIView):
    """API View to extract and score resume projects."""

    def post(self, request, *args, **kwargs):
        request_serializer = ProjectExtractionRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {"errors": request_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resume_text = request_serializer.validated_data["resume_text"]

        try:
            projects = analyze_portfolio(resume_text)

            avg_score = 0.0
            if projects:
                avg_score = sum(p["impact_score"] for p in projects) / len(projects)

            response_data = {
                "total_projects_found": len(projects),
                "average_impact_score": round(avg_score, 1),
                "projects": projects,
            }

            response_serializer = ProjectExtractionResponseSerializer(
                data=response_data
            )
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {
                    "error": "An unexpected error occurred during project extraction.",
                    "details": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
