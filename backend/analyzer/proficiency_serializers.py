"""
Serializers for Skill Proficiency Estimator.
"""

from rest_framework import serializers


class ProficiencyEstimationRequestSerializer(serializers.Serializer):
    """Validates input for proficiency estimation."""

    resume_text = serializers.CharField(
        required=True, allow_blank=False, max_length=10000
    )
    skills = serializers.ListField(
        child=serializers.CharField(allow_blank=False), required=True, min_length=1
    )


class SkillProficiencySerializer(serializers.Serializer):
    """Structures individual skill proficiency data."""

    skill = serializers.CharField()
    estimated_level = serializers.CharField()
    confidence_score = serializers.IntegerField(min_value=0, max_value=100)
    warnings = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    context_snippets = serializers.ListField(
        child=serializers.CharField(), allow_empty=True
    )


class ProficiencyEstimationResponseSerializer(serializers.Serializer):
    """Structures the full proficiency estimation response."""

    results = SkillProficiencySerializer(many=True)
    total_skills_analyzed = serializers.IntegerField()
    high_risk_claims_count = serializers.IntegerField()
