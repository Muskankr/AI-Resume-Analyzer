"""
Views for A/B Testing Framework.

Exposes POST /api/log-application/ and GET /api/ab-testing-stats/ endpoints.
"""

import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .ab_testing import calculate_resume_win_rates
from .ab_testing_serializers import (
    ApplicationLogRequestSerializer,
    ABTestingStatsResponseSerializer,
)
from .models import ApplicationLog

logger = logging.getLogger(__name__)


class LogApplicationView(APIView):
    """
    API View to log a new job application and its outcome.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = ApplicationLogRequestSerializer(
            data=request.data, context={"request": request}
        )
        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
            )

        # Set the user automatically
        serializer.save(user=request.user)

        return Response(
            {"message": "Application logged successfully."},
            status=status.HTTP_201_CREATED,
        )


class ABTestingStatsView(APIView):
    """
    API View to retrieve aggregated A/B testing statistics for the user's resumes.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        try:
            stats = calculate_resume_win_rates(request.user.id)

            response_serializer = ABTestingStatsResponseSerializer(data=stats)
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception:
            logger.exception(
                "A/B testing stats failed for user %s", request.user.pk
            )
            return Response(
                {"error": "An unexpected error occurred while calculating stats."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
