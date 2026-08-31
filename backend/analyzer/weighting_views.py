"""
Views for Job Description Keyword Weighting and Priority Matrix.

Exposes the POST /api/generate-keyword-matrix/ endpoint.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import serializers
from .keyword_weighting import generate_priority_matrix


class KeywordMatrixRequestSerializer(serializers.Serializer):
    """Serializer to validate the incoming request for keyword matrix generation."""

    resume_text = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=10000,
        help_text="The full text of the resume.",
    )
    job_description = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=10000,
        help_text="The full text of the target job description.",
    )


class PriorityMatrixSerializer(serializers.Serializer):
    """Serializer to structure the 2x2 priority matrix response."""

    critical_missing = serializers.ListField(child=serializers.CharField())
    core_strengths = serializers.ListField(child=serializers.CharField())
    bonus_skills = serializers.ListField(child=serializers.CharField())
    irrelevant_or_missing = serializers.ListField(child=serializers.CharField())


class KeywordMatrixView(APIView):
    """
    API View to handle keyword priority matrix generation requests.
    """

    def post(self, request, *args, **kwargs):
        """
        Process resume and JD to return a weighted keyword priority matrix.
        """
        # Validate incoming data
        request_serializer = KeywordMatrixRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {"errors": request_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resume_text = request_serializer.validated_data["resume_text"]
        job_description = request_serializer.validated_data["job_description"]

        try:
            # Generate the priority matrix
            matrix_result = generate_priority_matrix(job_description, resume_text)

            # Validate and return response
            response_serializer = PriorityMatrixSerializer(data=matrix_result)
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {
                    "error": "An unexpected error occurred during keyword matrix generation.",
                    "details": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
