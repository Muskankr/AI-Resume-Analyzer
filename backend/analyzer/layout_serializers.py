"""
DRF serializers to format the structured layout analysis data for the frontend.
"""

from rest_framework import serializers


class LayoutIssueSerializer(serializers.Serializer):
    section = serializers.CharField()
    issue_type = serializers.CharField()
    severity = serializers.CharField()
    description = serializers.CharField()
    recommendation = serializers.CharField()


class LayoutAnalysisResponseSerializer(serializers.Serializer):
    score = serializers.IntegerField(min_value=0, max_value=100)
    issues = LayoutIssueSerializer(many=True)
    detected_sections = serializers.ListField(child=serializers.CharField())
    unique_font_sizes = serializers.IntegerField()
    total_lines = serializers.IntegerField()
    error = serializers.CharField(required=False, allow_null=True)
