"""
Serializers for Accessibility Checker.

Structures the accessibility findings into a standardized, severity-ranked report format.
"""

from rest_framework import serializers


class AccessibilityCheckRequestSerializer(serializers.Serializer):
    """
    Serializer to validate the incoming request for accessibility checking.
    """

    resume_text = serializers.CharField(
        required=True, allow_blank=False, max_length=10000
    )


class AccessibilityFindingSerializer(serializers.Serializer):
    """
    Serializer for a single accessibility finding.
    """

    rule = serializers.CharField()
    severity = serializers.CharField()
    description = serializers.CharField()
    recommendation = serializers.CharField()


class AccessibilityReportResponseSerializer(serializers.Serializer):
    """
    Serializer to structure the full accessibility report output.
    """

    findings = AccessibilityFindingSerializer(many=True)
    accessibility_score = serializers.IntegerField()
    total_issues = serializers.IntegerField()
