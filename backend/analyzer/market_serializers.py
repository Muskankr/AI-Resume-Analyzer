"""
Serializers for Market Value Estimator.
"""

from rest_framework import serializers


class MarketValueRequestSerializer(serializers.Serializer):
    """Validates input for market value estimation."""

    target_role = serializers.CharField(required=True, allow_blank=False)
    experience_level = serializers.CharField(required=True, allow_blank=False)
    skills = serializers.ListField(
        child=serializers.CharField(allow_blank=False), required=False, default=[]
    )
    location = serializers.CharField(required=False, allow_blank=True, default="US")


class SalaryRangeSerializer(serializers.Serializer):
    """Structures the estimated salary range."""

    min = serializers.IntegerField()
    max = serializers.IntegerField()
    median = serializers.IntegerField()
    currency = serializers.CharField()


class MarketValueResponseSerializer(serializers.Serializer):
    """Structures the full market value estimation response."""

    salary_range = SalaryRangeSerializer()
    value_driving_skills = serializers.ListField(child=serializers.CharField())
    negotiation_talking_points = serializers.ListField(child=serializers.CharField())
