"""
Views for Resume Readability and Cognitive Load Analyzer.

Exposes the POST /api/analyze-readability/ endpoint.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import serializers
from .readability_analyzer import calculate_cognitive_load


class ReadabilityRequestSerializer(serializers.Serializer):
    """Serializer to validate the incoming request for readability analysis."""

    resume_text = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=10000,
        help_text="The full text of the resume to analyze for cognitive load.",
    )


class HeavySentenceSerializer(serializers.Serializer):
    """Serializer for a single heavy sentence."""

    text = serializers.CharField()
    reasons = serializers.ListField(child=serializers.CharField())
    word_count = serializers.IntegerField()


class ReadabilityResponseSerializer(serializers.Serializer):
    """Serializer to structure the full readability analysis response."""

    score = serializers.IntegerField(min_value=0, max_value=100)
    heavy_sentences = HeavySentenceSerializer(many=True)
    suggestions = serializers.ListField(child=serializers.CharField())


class ReadabilityView(APIView):
    """
    API View to handle resume readability and cognitive load analysis requests.
    """

    def post(self, request, *args, **kwargs):
        """
        Process resume text and return cognitive load analysis with suggestions.
        """
        # Validate incoming data
        request_serializer = ReadabilityRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {"errors": request_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resume_text = request_serializer.validated_data["resume_text"]

        try:
            # Analyze readability
            analysis_result = calculate_cognitive_load(resume_text)

            # Validate and return response
            response_serializer = ReadabilityResponseSerializer(data=analysis_result)
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {
                    "error": "An unexpected error occurred during readability analysis.",
                    "details": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
