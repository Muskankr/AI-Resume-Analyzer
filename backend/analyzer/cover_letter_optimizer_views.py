"""
Views for Dynamic Cover Letter Optimization and Alignment Scorer.

Exposes the POST /api/optimize-cover-letter/ endpoint.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import serializers
from .cover_letter_optimizer import (
    calculate_alignment_score,
    suggest_paragraph_rewrites,
)


class CoverLetterOptimizationRequestSerializer(serializers.Serializer):
    """Serializer to validate the incoming request for cover letter optimization."""

    cover_letter = serializers.CharField(
        required=True, allow_blank=False, max_length=5000
    )
    job_description = serializers.CharField(
        required=True, allow_blank=False, max_length=5000
    )


class OptimizationResultSerializer(serializers.Serializer):
    """Serializer to structure the optimization response."""

    alignment_score = serializers.IntegerField(min_value=0, max_value=100)
    matched_keywords = serializers.ListField(child=serializers.CharField())
    missing_keywords = serializers.ListField(child=serializers.CharField())
    feedback = serializers.CharField()
    rewrite_suggestions = serializers.ListField(child=serializers.DictField())


class CoverLetterOptimizationView(APIView):
    """
    API View to handle cover letter optimization and alignment scoring requests.
    """

    def post(self, request, *args, **kwargs):
        """
        Process cover letter and job description to return alignment score and suggestions.
        """
        request_serializer = CoverLetterOptimizationRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {"errors": request_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cover_letter = request_serializer.validated_data["cover_letter"]
        job_description = request_serializer.validated_data["job_description"]

        try:
            # Calculate alignment
            alignment_data = calculate_alignment_score(cover_letter, job_description)

            # Generate rewrite suggestions based on missing keywords
            # We pass a copy of the missing keywords list so the original isn't mutated unexpectedly
            missing_kw_copy = alignment_data["missing_keywords"].copy()
            rewrite_suggestions = suggest_paragraph_rewrites(
                cover_letter, missing_kw_copy
            )

            response_data = {
                "alignment_score": alignment_data["score"],
                "matched_keywords": alignment_data["matched_keywords"],
                "missing_keywords": alignment_data["missing_keywords"],
                "feedback": alignment_data["feedback"],
                "rewrite_suggestions": rewrite_suggestions,
            }

            response_serializer = OptimizationResultSerializer(data=response_data)
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {
                    "error": "An unexpected error occurred during cover letter optimization.",
                    "details": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
