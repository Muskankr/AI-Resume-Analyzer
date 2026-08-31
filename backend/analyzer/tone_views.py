"""
Views for Tone Analyzer.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .tone_analyzer import analyze_tone
from .tone_serializers import (
    ToneAnalysisRequestSerializer,
    ToneAnalysisResponseSerializer,
)


class ToneAnalysisView(APIView):
    """API View to analyze resume tone and cultural fit."""

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

        except Exception as e:
            return Response(
                {
                    "error": "An unexpected error occurred during tone analysis.",
                    "details": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
