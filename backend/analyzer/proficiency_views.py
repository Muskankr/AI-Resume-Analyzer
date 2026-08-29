"""
Views for Skill Proficiency Estimator.
"""

import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import AnonRateThrottle
from .proficiency_estimator import estimate_all_proficiencies
from .proficiency_serializers import (
    ProficiencyEstimationRequestSerializer,
    ProficiencyEstimationResponseSerializer,
)


logger = logging.getLogger(__name__)


class ProficiencyEstimationThrottle(AnonRateThrottle):
    """Caps the ProficiencyEstimationView endpoint.

    ``DEFAULT_PERMISSION_CLASSES`` is ``AllowAny`` and this view does not
    override it, so the endpoint is open. It splits a caller-supplied resume
    into sentences and runs the full indicator set once per requested skill,
    so cost grows with body size times skill count. Rate from
    ``DEFAULT_THROTTLE_RATES["proficiency_estimation"]``.

    ``scope`` is set explicitly: every ``AnonRateThrottle`` subclass inherits
    the scope "anon" otherwise, which would put this endpoint in the same
    bucket as unrelated ones.
    """

    scope = "proficiency_estimation"


class ProficiencyEstimationView(APIView):
    """API View to estimate skill proficiency based on resume context."""

    throttle_classes = [ProficiencyEstimationThrottle]

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

        except Exception:
            # `str(e)` used to go back in a "details" field. That hands the
            # caller file paths, SQL and library internals on any unexpected
            # failure; the operator wants that detail, the client does not.
            logger.exception("Proficiency estimation failed")
            return Response(
                {"error": "An unexpected error occurred during proficiency estimation."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
