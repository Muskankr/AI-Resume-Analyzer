"""
Views for Market Value Estimator.
"""

import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import AnonRateThrottle
from .market_value_estimator import calculate_salary_range, generate_negotiation_points
from .market_serializers import (
    MarketValueRequestSerializer,
    MarketValueResponseSerializer,
)


logger = logging.getLogger(__name__)


class MarketValueThrottle(AnonRateThrottle):
    """Caps the MarketValueView endpoint.

    ``DEFAULT_PERMISSION_CLASSES`` is ``AllowAny`` and this view does not
    override it, so the endpoint is open. It scans a caller-supplied skill
    list against the high-value table for every request. Rate from
    ``DEFAULT_THROTTLE_RATES["market_value"]``.

    ``scope`` is set explicitly: every ``AnonRateThrottle`` subclass inherits
    the scope "anon" otherwise, which would put this endpoint in the same
    bucket as unrelated ones.
    """

    scope = "market_value"


class MarketValueView(APIView):
    """API View to estimate market value and generate negotiation points."""

    throttle_classes = [MarketValueThrottle]

    def post(self, request, *args, **kwargs):
        request_serializer = MarketValueRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {"errors": request_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_role = request_serializer.validated_data["target_role"]
        experience_level = request_serializer.validated_data["experience_level"]
        skills = request_serializer.validated_data.get("skills", [])

        try:
            salary_range = calculate_salary_range(target_role, experience_level, skills)
            negotiation_points = generate_negotiation_points(experience_level, skills)

            # Identify value driving skills
            high_value = [
                "machine learning",
                "aws",
                "kubernetes",
                "leadership",
                "system design",
            ]
            value_driving = [s for s in skills if s.lower() in high_value]

            response_data = {
                "salary_range": salary_range,
                "value_driving_skills": value_driving,
                "negotiation_talking_points": negotiation_points,
            }

            response_serializer = MarketValueResponseSerializer(data=response_data)
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception:
            # `str(e)` used to go back in a "details" field. That hands the
            # caller file paths, SQL and library internals on any unexpected
            # failure; the operator wants that detail, the client does not.
            logger.exception("Market value estimation failed")
            return Response(
                {"error": "An unexpected error occurred during market value estimation."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
