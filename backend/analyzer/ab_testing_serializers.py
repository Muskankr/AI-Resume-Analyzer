"""
Serializers for A/B Testing Framework.

Handles validation of application logging requests and structures
the aggregated statistical win-rate data.
"""

from rest_framework import serializers
from .models import ApplicationLog


class ApplicationLogRequestSerializer(serializers.ModelSerializer):
    """
    Serializer to validate and create a new application log entry.
    """

    class Meta:
        model = ApplicationLog
        fields = ["resume_analysis", "company_name", "job_title", "status", "notes"]
        extra_kwargs = {"resume_analysis": {"required": False, "allow_null": True}}

    def validate_resume_analysis(self, value):
        """Ensure the resume analysis belongs to the requesting user."""
        request = self.context.get("request")
        if value and value.user != request.user:
            raise serializers.ValidationError(
                "You do not have permission to log an application for this resume."
            )
        return value


class ResumeStatSerializer(serializers.Serializer):
    """
    Serializer for a single resume's performance statistics.
    """

    resume_id = serializers.IntegerField(allow_null=True)
    resume_name = serializers.CharField()
    total_applications = serializers.IntegerField()
    successful_applications = serializers.IntegerField()
    success_rate = serializers.FloatField()


class ABTestingStatsResponseSerializer(serializers.Serializer):
    """
    Serializer to structure the aggregated A/B testing statistics.
    """

    total_applications = serializers.IntegerField()
    resume_stats = ResumeStatSerializer(many=True)
    best_performing_resume_id = serializers.IntegerField(allow_null=True)
