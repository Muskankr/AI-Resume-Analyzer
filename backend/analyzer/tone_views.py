"""
Views for Tone Analyzer.
"""

import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import AnonRateThrottle
from .tone_analyzer import analyze_tone
from .tone_serializers import (
    ToneAnalysisRequestSerializer,
    ToneAnalysisResponseSerializer,
)


logger = logging.getLogger(__name__)


class ToneAnalysisThrottle(AnonRateThrottle):
    """Caps the ToneAnalysisView endpoint.

    ``DEFAULT_PERMISSION_CLASSES`` is ``AllowAny`` and this view does not
    override it, so the endpoint is open. It runs four regex families over a
    caller-supplied body. Rate from
    ``DEFAULT_THROTTLE_RATES["tone_analysis"]``.

    ``scope`` is set explicitly: every ``AnonRateThrottle`` subclass inherits
    the scope "anon" otherwise, which would put this endpoint in the same
    bucket as unrelated ones.
    """

    scope = "tone_analysis"


class ToneAnalysisView(APIView):
    """API View to analyze resume tone and cultural fit."""

    throttle_classes = [ToneAnalysisThrottle]

    def post(self, request, *args, **kwargs):
        request_serializer = ToneAnalysisRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {"errors": request_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resume_text = request_serializer.validated_data["resume_text"]

        try:
            analysis_result = analyze_tone(resume_text)

            if not analysis_result:
                return Response(
                    {"error": "Invalid or empty resume text provided."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            response_serializer = ToneAnalysisResponseSerializer(data=analysis_result)
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception:
            # `str(e)` used to go back in a "details" field. That hands the
            # caller file paths, SQL and library internals on any unexpected
            # failure; the operator wants that detail, the client does not.
            logger.exception("Tone analysis failed")
            return Response(
                {"error": "An unexpected error occurred during tone analysis."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
