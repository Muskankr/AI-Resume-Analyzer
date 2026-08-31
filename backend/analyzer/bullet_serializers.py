"""
DRF serializers to handle batch requests of bullet points and structure
the detailed before/after optimization responses.
"""

from rest_framework import serializers
from typing import List


class BulletOptimizationRequestSerializer(serializers.Serializer):
    bullets = serializers.ListField(
        child=serializers.CharField(max_length=500, allow_blank=False),
        min_length=1,
        max_length=20,
        help_text="List of resume bullet points to optimize (1-20 items).",
    )
    target_role = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        help_text="Optional target job role for context-aware optimization.",
    )
    job_description = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Optional target job description to suggest tailored rewritten bullet points.",
    )


class StarComponentSerializer(serializers.Serializer):
    situation = serializers.CharField(allow_null=True)
    task = serializers.CharField(allow_null=True)
    action = serializers.CharField(allow_null=True)
    result = serializers.CharField(allow_null=True)


class BulletAnalysisResponseSerializer(serializers.Serializer):
    original = serializers.CharField()
    has_action_verb = serializers.BooleanField()
    has_metric = serializers.BooleanField()
    is_passive = serializers.BooleanField()
    star_components = StarComponentSerializer()
    score = serializers.IntegerField(min_value=0, max_value=100)
    suggestions = serializers.ListField(child=serializers.CharField())
    rewrites = serializers.ListField(child=serializers.CharField())


class BulletOptimizationResponseSerializer(serializers.Serializer):
    results = serializers.ListField(child=BulletAnalysisResponseSerializer())
    average_score = serializers.FloatField()
    total_processed = serializers.IntegerField()
