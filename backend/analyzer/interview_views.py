"""
API endpoints to generate, fetch, and manage interview questions.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiResponse
from .interview_serializers import (
    InterviewGenerationRequestSerializer,
    InterviewGenerationResponseSerializer,
)
from .interview_generator import InterviewGenerator
from rest_framework.throttling import UserRateThrottle


class InterviewQuestionThrottle(UserRateThrottle):
    # `scope` decides the cache key, and `UserRateThrottle` sets it to "user"
    # for every subclass. Without an override each of these endpoints counted
    # against one shared bucket keyed on the user id, so the tightest limit in
    # the app applied to all of them: five interview questions a minute meant
    # five bullet optimisations a minute too. Distinct scopes give each
    # endpoint the rate its own class declares.
    scope = "interview_questions"
    rate = "5/minute"


class InterviewQuestionGenerateView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [InterviewQuestionThrottle]

    @extend_schema(
        request=InterviewGenerationRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=InterviewGenerationResponseSerializer,
                description="Successful generation",
            ),
            400: OpenApiResponse(description="Invalid input data"),
        },
        summary="Generate interview questions based on resume and job description gaps",
    )
    def post(self, request):
        serializer = InterviewGenerationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        resume_text = serializer.validated_data["resume_text"]
        skills = serializer.validated_data.get("skills", [])
        job_description = serializer.validated_data["job_description"]

        questions = InterviewGenerator.generate_questions(
            resume_text, skills, job_description
        )

        categories = list(set(q.category for q in questions))

        response_data = {
            "questions": [q.__dict__ for q in questions],
            "total_questions": len(questions),
            "categories": categories,
        }

        return Response(response_data, status=status.HTTP_200_OK)
