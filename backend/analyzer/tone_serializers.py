"""
Serializers for Tone Analyzer.
"""

from rest_framework import serializers


class ToneAnalysisRequestSerializer(serializers.Serializer):
    """Validates input for tone analysis."""

    resume_text = serializers.CharField(
        required=True, allow_blank=False, max_length=10000
    )


class ToneAnalysisResponseSerializer(serializers.Serializer):
    """Structures the tone analysis response."""

    confidence_score = serializers.IntegerField(min_value=0, max_value=100)
    collaboration_score = serializers.IntegerField(min_value=0, max_value=100)
    clarity_score = serializers.IntegerField(min_value=0, max_value=100)
    overall_tone = serializers.CharField()
    pronoun_dominance = serializers.CharField()
    suggestions = serializers.ListField(child=serializers.CharField(), allow_empty=True)
