"""
Views for Resume Skill Gap Learning Path Generator.

Exposes the POST /api/generate-learning-path/ endpoint.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import serializers
from .learning_path import generate_learning_path


class LearningPathRequestSerializer(serializers.Serializer):
    """Serializer to validate the incoming request for learning path generation."""

    resume_text = serializers.CharField(
        required=True, allow_blank=False, max_length=10000
    )
    job_description = serializers.CharField(
        required=True, allow_blank=False, max_length=10000
    )


class ResourceSerializer(serializers.Serializer):
    """Serializer for a single learning resource."""

    title = serializers.CharField()
    type = serializers.CharField()
    provider = serializers.CharField()
    duration = serializers.CharField()
    url = serializers.CharField()


class SkillGapSerializer(serializers.Serializer):
    """Serializer for a single skill gap in the learning path."""

    skill = serializers.CharField()
    priority = serializers.CharField()
    estimated_time = serializers.CharField()
    resources = ResourceSerializer(many=True)


class LearningPathResponseSerializer(serializers.Serializer):
    """Serializer to structure the full learning path response."""

    total_missing_skills = serializers.IntegerField()
    learning_path = SkillGapSerializer(many=True)


class LearningPathView(APIView):
    """
    API View to handle learning path generation requests.
    """

    def post(self, request, *args, **kwargs):
        """
        Process resume and job description to return a curated learning path.
        """
        request_serializer = LearningPathRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {"errors": request_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resume_text = request_serializer.validated_data["resume_text"]
        job_description = request_serializer.validated_data["job_description"]

        try:
            learning_path = generate_learning_path(resume_text, job_description)

            response_data = {
                "total_missing_skills": len(learning_path),
                "learning_path": learning_path,
            }

            response_serializer = LearningPathResponseSerializer(data=response_data)
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {
                    "error": "An unexpected error occurred during learning path generation.",
                    "details": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
