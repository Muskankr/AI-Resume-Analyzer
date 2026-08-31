"""
Views for Cliché Detector.

Exposes the POST /api/detect-cliches/ endpoint.
"""

import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import AnonRateThrottle
from .cliche_detector import analyze_and_suggest
from .cliche_serializers import (
    ClicheDetectionRequestSerializer,
    ClicheDetectionResponseSerializer,
)

logger = logging.getLogger(__name__)


class ClicheDetectorThrottle(AnonRateThrottle):
    """Caps /api/detect-cliches/, an open endpoint that scans caller-sized text."""

    scope = "cliche_detection"


class ClicheDetectorView(APIView):
    """
    API View to handle cliché detection and modernization requests.
    """

    throttle_classes = [ClicheDetectorThrottle]

    def post(self, request, *args, **kwargs):
        """
        Process resume text and return cliché detections with suggestions.
        """
        request_serializer = ClicheDetectionRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {"errors": request_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        text = request_serializer.validated_data["text"]

        try:
            analysis_result = analyze_and_suggest(text)

            response_serializer = ClicheDetectionResponseSerializer(
                data=analysis_result
            )
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception:
            logger.exception("Cliché analysis failed")
            return Response(
                {"error": "An unexpected error occurred during analysis."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
