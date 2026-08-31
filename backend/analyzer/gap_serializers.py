"""
Serializers for Gap Narrative Builder.
"""

from rest_framework import serializers


class TimelineEntrySerializer(serializers.Serializer):
    """Validates a single timeline entry."""

    role = serializers.CharField(required=True)
    start_date = serializers.CharField(required=True)
    end_date = serializers.CharField(required=True, allow_blank=True)


class GapNarrativeRequestSerializer(serializers.Serializer):
    """Validates input for gap narrative generation."""

    timeline_data = serializers.ListField(
        child=TimelineEntrySerializer(), required=True
    )
    context = serializers.DictField(
        child=serializers.CharField(allow_blank=True), required=False, default={}
    )


class NarrativeOptionSerializer(serializers.Serializer):
    """Structures a single narrative option."""

    category = serializers.CharField()
    text = serializers.CharField()


class GapDetailSerializer(serializers.Serializer):
    """Structures details of a single detected gap."""

    role_before = serializers.CharField()
    role_after = serializers.CharField()
    start_date = serializers.CharField()
    end_date = serializers.CharField()
    duration_months = serializers.IntegerField()
    narratives = NarrativeOptionSerializer(many=True)


class GapNarrativeResponseSerializer(serializers.Serializer):
    """Structures the full gap narrative response."""

    total_gaps_detected = serializers.IntegerField()
    gaps = GapDetailSerializer(many=True)
    total_narratives_generated = serializers.IntegerField()
