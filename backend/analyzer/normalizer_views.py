"""
Views for Resume Format and Structure Normalizer.

Exposes the POST /api/normalize-resume/ endpoint.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import serializers
from .structure_normalizer import normalize_resume


class ResumeNormalizationRequestSerializer(serializers.Serializer):
    """Serializer to validate the incoming request for resume normalization."""

    resume_text = serializers.CharField(
        required=True, allow_blank=False, max_length=10000
    )


class NormalizedSectionSerializer(serializers.Serializer):
    """Serializer for a single normalized section."""

    # Dynamic keys, so we use a generic dict field for the sections
    pass  # Handled by the parent serializer


class ResumeNormalizationResponseSerializer(serializers.Serializer):
    """Serializer to structure the full normalization response."""

    sections = serializers.DictField(child=serializers.CharField())
    changes_made = serializers.ListField(child=serializers.CharField())


class ResumeNormalizationView(APIView):
    """
    API View to handle resume structure normalization requests.
    """

    def post(self, request, *args, **kwargs):
        """
        Process raw resume text and return a structured, normalized version.
        """
        request_serializer = ResumeNormalizationRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {"errors": request_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resume_text = request_serializer.validated_data["resume_text"]

        try:
            normalization_result = normalize_resume(resume_text)

            response_serializer = ResumeNormalizationResponseSerializer(
                data=normalization_result
            )
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {
                    "error": "An unexpected error occurred during resume normalization.",
                    "details": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
