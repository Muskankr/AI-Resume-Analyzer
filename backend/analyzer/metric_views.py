"""
Views for Resume Achievement Quantification and Metric Suggestion Engine.

Exposes the POST /api/suggest-metrics/ endpoint.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import serializers
from .metric_extractor import analyze_resume_bullets


class MetricSuggestionRequestSerializer(serializers.Serializer):
    """Serializer to validate the incoming request for metric suggestions."""

    resume_text = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=10000,
        help_text="The full text of the resume to analyze for quantifiable metrics.",
    )


class BulletAnalysisSerializer(serializers.Serializer):
    """Serializer for a single bullet point analysis result."""

    original_bullet = serializers.CharField()
    has_metrics = serializers.BooleanField()
    suggestion = serializers.CharField(allow_blank=True)
    enhanced_bullet = serializers.CharField()


class MetricSuggestionResponseSerializer(serializers.Serializer):
    """Serializer to structure the full metric suggestion response."""

    total_bullets_analyzed = serializers.IntegerField()
    bullets_missing_metrics = serializers.IntegerField()
    analysis_results = BulletAnalysisSerializer(many=True)


class MetricSuggestionView(APIView):
    """
    API View to handle resume metric suggestion requests.
    """

    def post(self, request, *args, **kwargs):
        """
        Process resume text and return quantifiable metric suggestions for bullet points.
        """
        # Validate incoming data
        request_serializer = MetricSuggestionRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {"errors": request_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resume_text = request_serializer.validated_data["resume_text"]

        try:
            # Analyze the resume bullets
            analysis_results = analyze_resume_bullets(resume_text)

            # Calculate summary statistics
            total_bullets = len(analysis_results)
            missing_metrics_count = sum(
                1 for result in analysis_results if not result["has_metrics"]
            )

            # Structure the response data
            response_data = {
                "total_bullets_analyzed": total_bullets,
                "bullets_missing_metrics": missing_metrics_count,
                "analysis_results": analysis_results,
            }

            # Validate and return response
            response_serializer = MetricSuggestionResponseSerializer(data=response_data)
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {
                    "error": "An unexpected error occurred during metric analysis.",
                    "details": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
