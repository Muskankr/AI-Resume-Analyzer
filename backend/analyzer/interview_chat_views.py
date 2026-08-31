"""
Views for AI-Powered Mock Interview Chatbot Simulator.

Exposes endpoints for starting an interview and submitting answers.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import serializers
from .mock_interview import generate_interview_questions, evaluate_answer


class StartInterviewRequestSerializer(serializers.Serializer):
    """Serializer to validate the request to start a mock interview."""

    resume_text = serializers.CharField(
        required=True, allow_blank=False, max_length=10000
    )
    job_description = serializers.CharField(
        required=True, allow_blank=False, max_length=10000
    )
    target_role = serializers.CharField(
        required=True, allow_blank=False, max_length=100
    )


class StartInterviewResponseSerializer(serializers.Serializer):
    """Serializer to structure the initial interview questions response."""

    session_id = serializers.CharField()
    questions = serializers.ListField(child=serializers.DictField())


class SubmitAnswerRequestSerializer(serializers.Serializer):
    """Serializer to validate the submission of an interview answer."""

    session_id = serializers.CharField(required=True)
    question_id = serializers.CharField(required=True)
    question_text = serializers.CharField(required=True)
    answer_text = serializers.CharField(
        required=True, allow_blank=False, max_length=2000
    )


class AnswerEvaluationSerializer(serializers.Serializer):
    """Serializer to structure the answer evaluation response."""

    score = serializers.IntegerField(min_value=0, max_value=100)
    feedback = serializers.CharField()
    strengths = serializers.ListField(child=serializers.CharField())
    areas_for_improvement = serializers.ListField(child=serializers.CharField())


class StartInterviewView(APIView):
    """API View to initialize a mock interview session."""

    def post(self, request, *args, **kwargs):
        request_serializer = StartInterviewRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {"errors": request_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resume_text = request_serializer.validated_data["resume_text"]
        job_description = request_serializer.validated_data["job_description"]
        target_role = request_serializer.validated_data["target_role"]

        try:
            # Generate questions (In a real app, we would create a DB session here)
            questions = generate_interview_questions(
                resume_text, job_description, target_role
            )
            session_id = "mock_session_12345"  # Mock session ID

            response_data = {"session_id": session_id, "questions": questions}

            response_serializer = StartInterviewResponseSerializer(data=response_data)
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {
                    "error": "An unexpected error occurred while starting the interview.",
                    "details": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class SubmitAnswerView(APIView):
    """API View to evaluate a submitted interview answer."""

    def post(self, request, *args, **kwargs):
        request_serializer = SubmitAnswerRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {"errors": request_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        question_text = request_serializer.validated_data["question_text"]
        answer_text = request_serializer.validated_data["answer_text"]

        try:
            evaluation = evaluate_answer(question_text, answer_text)

            response_serializer = AnswerEvaluationSerializer(data=evaluation)
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {
                    "error": "An unexpected error occurred while evaluating the answer.",
                    "details": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
