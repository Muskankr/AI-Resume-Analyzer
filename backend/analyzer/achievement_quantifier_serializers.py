"""DRF serializers for the Resume Achievement Quantifier."""

from rest_framework import serializers


class MetricSuggestionSerializer(serializers.Serializer):
    template = serializers.CharField()
    example = serializers.CharField()
    category = serializers.CharField()
    confidence = serializers.FloatField()


class BulletQuantificationSerializer(serializers.Serializer):
    original_text = serializers.CharField()
    line_number = serializers.IntegerField()
    detected_verb = serializers.CharField(allow_null=True, required=False)
    detected_category = serializers.CharField(allow_null=True, required=False)
    is_quantified = serializers.BooleanField()
    suggestions = MetricSuggestionSerializer(many=True)
    priority = serializers.ChoiceField(choices=["high", "medium", "low"])
    estimated_impact = serializers.IntegerField(min_value=0, max_value=10)


class QuantificationResultSerializer(serializers.Serializer):
    total_bullets = serializers.IntegerField()
    quantified_bullets = serializers.IntegerField()
    unquantified_bullets = serializers.IntegerField()
    quantification_rate = serializers.FloatField()
    overall_impact_score = serializers.IntegerField()
    bullet_analyses = BulletQuantificationSerializer(many=True)
    top_quick_wins = BulletQuantificationSerializer(many=True)
    category_coverage = serializers.DictField(child=serializers.IntegerField())
    summary = serializers.CharField()


class QuantificationRequestSerializer(serializers.Serializer):
    resume_text = serializers.CharField(max_length=50000)
    analysis_id = serializers.IntegerField(required=False, allow_null=True)
