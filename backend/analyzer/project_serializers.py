"""
Serializers for Project Portfolio Extractor.
"""

from rest_framework import serializers


class ProjectExtractionRequestSerializer(serializers.Serializer):
    """Validates input for project extraction."""

    resume_text = serializers.CharField(
        required=True, allow_blank=False, max_length=10000
    )


class ProjectDetailSerializer(serializers.Serializer):
    """Structures individual project analysis data."""

    name = serializers.CharField()
    description = serializers.CharField()
    impact_score = serializers.IntegerField(min_value=0, max_value=100)
    metrics_found = serializers.ListField(
        child=serializers.CharField(), allow_empty=True
    )
    technologies = serializers.ListField(
        child=serializers.CharField(), allow_empty=True
    )
    suggestions = serializers.ListField(child=serializers.CharField(), allow_empty=True)


class ProjectExtractionResponseSerializer(serializers.Serializer):
    """Structures the full project extraction response."""

    total_projects_found = serializers.IntegerField()
    average_impact_score = serializers.FloatField()
    projects = ProjectDetailSerializer(many=True)
