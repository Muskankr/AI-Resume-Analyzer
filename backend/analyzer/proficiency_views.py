"""
Views for Skill Proficiency Estimator.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .proficiency_estimator import estimate_all_proficiencies
from .proficiency_serializers import (
    ProficiencyEstimationRequestSerializer,
    ProficiencyEstimationResponseSerializer,
)


class ProficiencyEstimationView(APIView):
    """API View to estimate skill proficiency based on resume context."""

    def post(self, request, *args, **kwargs):
        request_serializer = ProficiencyEstimationRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {"errors": request_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resume_text = request_serializer.validated_data["resume_text"]
        skills = request_serializer.validated_data["skills"]

        try:
            results = estimate_all_proficiencies(resume_text, skills)
            high_risk_count = sum(1 for r in results if len(r["warnings"]) > 0)

            response_data = {
                "results": results,
                "total_skills_analyzed": len(results),
                "high_risk_claims_count": high_risk_count,
            }

            response_serializer = ProficiencyEstimationResponseSerializer(
                data=response_data
            )
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {
                    "error": "An unexpected error occurred during proficiency estimation.",
                    "details": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
