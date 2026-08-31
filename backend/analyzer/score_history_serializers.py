"""DRF serializers for the Resume Score History & Trend Analysis API."""

from rest_framework import serializers


class ScoreDataPointSerializer(serializers.Serializer):
    analysis_id = serializers.IntegerField()
    score = serializers.IntegerField()
    target_role = serializers.CharField()
    created_at = serializers.CharField()
    skills_count = serializers.IntegerField()
    matched_count = serializers.IntegerField()
    missing_count = serializers.IntegerField()
    file_name = serializers.CharField()


class TrendStatsSerializer(serializers.Serializer):
    current_score = serializers.IntegerField()
    highest_score = serializers.IntegerField()
    lowest_score = serializers.IntegerField()
    average_score = serializers.FloatField()
    median_score = serializers.FloatField()
    total_analyses = serializers.IntegerField()
    score_range = serializers.IntegerField()
    std_deviation = serializers.FloatField()


class ImprovementMetricsSerializer(serializers.Serializer):
    total_improvement = serializers.IntegerField()
    average_improvement_per_analysis = serializers.FloatField()
    improvement_rate_percent = serializers.FloatField()
    analyses_with_improvement = serializers.IntegerField()
    analyses_with_decline = serializers.IntegerField()
    analyses_unchanged = serializers.IntegerField()
    best_single_jump = serializers.IntegerField()
    improvement_streak = serializers.IntegerField()
    longest_streak = serializers.IntegerField()


class SkillTrendItemSerializer(serializers.Serializer):
    skill = serializers.CharField()
    presence = serializers.ListField(child=serializers.BooleanField())
    appearances = serializers.IntegerField()


class SkillProgressionSerializer(serializers.Serializer):
    total_unique_skills = serializers.IntegerField()
    consistently_matched = serializers.ListField(child=serializers.CharField())
    newly_acquired = serializers.ListField(child=serializers.CharField())
    lost_skills = serializers.ListField(child=serializers.CharField())
    skill_frequency = serializers.DictField(child=serializers.IntegerField())
    skill_trend = SkillTrendItemSerializer(many=True)


class MonthlyAggregationSerializer(serializers.Serializer):
    month = serializers.CharField()
    analysis_count = serializers.IntegerField()
    average_score = serializers.FloatField()
    highest_score = serializers.IntegerField()
    lowest_score = serializers.IntegerField()
    score_delta = serializers.FloatField()


class RolePerformanceSerializer(serializers.Serializer):
    role = serializers.CharField()
    analysis_count = serializers.IntegerField()
    average_score = serializers.FloatField()
    highest_score = serializers.IntegerField()
    lowest_score = serializers.IntegerField()
    most_common_matched = serializers.ListField(child=serializers.CharField())
    most_common_missing = serializers.ListField(child=serializers.CharField())


class ScoreHistoryResultSerializer(serializers.Serializer):
    timeline = ScoreDataPointSerializer(many=True)
    trend_stats = TrendStatsSerializer()
    improvement_metrics = ImprovementMetricsSerializer()
    skill_progression = SkillProgressionSerializer()
    monthly_data = MonthlyAggregationSerializer(many=True)
    role_performance = RolePerformanceSerializer(many=True)
    moving_average = serializers.ListField(child=serializers.FloatField(allow_null=True))
    summary = serializers.CharField()
