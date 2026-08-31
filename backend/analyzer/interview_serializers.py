"""
DRF serializers for structuring the generated questions, categories, and difficulty levels.
"""

from rest_framework import serializers


class InterviewQuestionSerializer(serializers.Serializer):
    category = serializers.CharField(
        help_text="Category of the question (Technical, Behavioral, Gap-Focused)."
    )
    difficulty = serializers.CharField(
        help_text="Difficulty level (Easy, Medium, Hard)."
    )
    question = serializers.CharField(help_text="The interview question text.")
    guidelines = serializers.CharField(help_text="Expected answer guidelines and tips.")
    is_practiced = serializers.BooleanField(
        default=False, help_text="User progress tracking."
    )
    is_saved = serializers.BooleanField(
        default=False, help_text="User bookmark status."
    )


class InterviewGenerationRequestSerializer(serializers.Serializer):
    resume_text = serializers.CharField(
        max_length=50000, help_text="The full text of the user's resume."
    )
    skills = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        default=[],
        help_text="List of extracted skills from the resume.",
    )
    job_description = serializers.CharField(
        max_length=50000, help_text="The full text of the target job description."
    )


class InterviewGenerationResponseSerializer(serializers.Serializer):
    questions = InterviewQuestionSerializer(many=True)
    total_questions = serializers.IntegerField(
        help_text="Total number of questions generated."
    )
    categories = serializers.ListField(
        child=serializers.CharField(),
        help_text="Unique categories present in the generated questions.",
    )
