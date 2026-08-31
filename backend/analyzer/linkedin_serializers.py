"""
Serializers for LinkedIn Profile Optimization.

Handles validation of incoming optimization requests and structures
the segmented output payload for the frontend.
"""

from rest_framework import serializers


class LinkedInOptimizationRequestSerializer(serializers.Serializer):
    """
    Serializer to validate the incoming request for LinkedIn optimization.
    """

    target_role = serializers.CharField(
        required=False, allow_blank=True, max_length=100
    )
    summary = serializers.CharField(required=False, allow_blank=True)
    experiences = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField(allow_blank=True)),
        required=False,
        default=list,
    )
    skills = serializers.ListField(
        child=serializers.CharField(allow_blank=True), required=False, default=list
    )

    def validate_experiences(self, value):
        """Ensure each experience dict has required keys."""
        for exp in value:
            if not isinstance(exp, dict):
                raise serializers.ValidationError(
                    "Each experience must be a dictionary."
                )
        return value


class LinkedInExperienceResponseSerializer(serializers.Serializer):
    """
    Serializer for a single optimized experience entry.
    """

    title = serializers.CharField()
    company = serializers.CharField()
    description = serializers.CharField()
    original_description = serializers.CharField()


class LinkedInOptimizationResponseSerializer(serializers.Serializer):
    """
    Serializer to structure the optimized LinkedIn profile output.
    """

    headline = serializers.CharField()
    about = serializers.CharField()
    experiences = LinkedInExperienceResponseSerializer(many=True)
    skills = serializers.ListField(child=serializers.CharField())
    limits = serializers.DictField(child=serializers.IntegerField())

class LinkedInConsistencyRequestSerializer(serializers.Serializer):
    resume_text = serializers.CharField(required=True, allow_blank=True)
    linkedin_text = serializers.CharField(required=False, allow_blank=True)
    linkedin_url = serializers.URLField(required=False, allow_blank=True)

    def validate(self, data):
        if not data.get('linkedin_text') and not data.get('linkedin_url'):
            raise serializers.ValidationError(" Either linkedin_text or linkedin_url must be provided.")


class LinkedInConsistencyRequestSerializer(serializers.Serializer):
    resume_text = serializers.CharField(required=True, allow_blank=True)
    linkedin_text = serializers.CharField(required=False, allow_blank=True)
    linkedin_url = serializers.URLField(required=False, allow_blank=True)

    def validate(self, data):
        if not data.get('linkedin_text') and not data.get('linkedin_url'):
            raise serializers.ValidationError('Either linkedin_text or linkedin_url must be provided.')
        return data

class LinkedInConsistencyMismatchSerializer(serializers.Serializer):
    type = serializers.CharField()
    resume_evidence = serializers.CharField()
    linkedin_evidence = serializers.CharField()
    message = serializers.CharField()

class LinkedInConsistencyResponseSerializer(serializers.Serializer):
    mismatches = LinkedInConsistencyMismatchSerializer(many=True)
    resume_roles_found = serializers.IntegerField()
    linkedin_roles_found = serializers.IntegerField()
