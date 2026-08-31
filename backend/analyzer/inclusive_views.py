"""
Views for Inclusive Language and Unconscious Bias Detector.

Exposes the POST /api/check-inclusive-language/ endpoint.
"""

import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import serializers
from rest_framework.throttling import AnonRateThrottle
from .inclusive_language import analyze_resume_inclusivity

logger = logging.getLogger(__name__)


class InclusiveLanguageRequestSerializer(serializers.Serializer):
    """Serializer to validate the incoming request for inclusivity checking."""

    resume_text = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=10000,
        help_text="The full text of the resume to analyze for biased language.",
    )


class BiasDetectionSerializer(serializers.Serializer):
    """Serializer for a single biased phrase detection."""

    phrase = serializers.CharField()
    start = serializers.IntegerField()
    end = serializers.IntegerField()
    category = serializers.CharField()
    suggestion = serializers.CharField()
    severity = serializers.CharField()


class InclusiveLanguageResponseSerializer(serializers.Serializer):
    """Serializer to structure the full inclusivity analysis response."""

    detections = BiasDetectionSerializer(many=True)
    inclusive_text = serializers.CharField()
    inclusivity_score = serializers.IntegerField(min_value=0, max_value=100)
    total_issues = serializers.IntegerField()


class InclusiveLanguageThrottle(AnonRateThrottle):
    """Caps /api/check-inclusive-language/, an open endpoint that scans caller-sized text."""

    scope = "inclusive_language"


class InclusiveLanguageView(APIView):
    """
    API View to handle resume inclusivity and bias checking requests.
    """

    throttle_classes = [InclusiveLanguageThrottle]

    def post(self, request, *args, **kwargs):
        """
        Process resume text and return bias detections with inclusive suggestions.
        """
        # Validate incoming data
        request_serializer = InclusiveLanguageRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {"errors": request_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resume_text = request_serializer.validated_data["resume_text"]

        try:
            # Analyze the resume for inclusivity
            analysis_result = analyze_resume_inclusivity(resume_text)

            # Validate and return response
            response_serializer = InclusiveLanguageResponseSerializer(
                data=analysis_result
            )
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception("Inclusivity analysis failed")
            return Response(
                {
                    "error": "An unexpected error occurred during inclusivity analysis.",
                    "details": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
