"""
DRF serializers to structure the semantic diff output into actionable,
categorized change sets and summary statistics.
"""

from rest_framework import serializers


class SemanticChangeSerializer(serializers.Serializer):
    category = serializers.CharField(
        help_text="Category of the change (skill, experience, education, formatting, general)."
    )
    change_type = serializers.CharField(
        help_text="Type of change (added, removed, modified, improved)."
    )
    description = serializers.CharField(
        help_text="Human-readable description of the change."
    )
    details = serializers.DictField(
        help_text="Additional structured data about the change.",
        required=False,
        default=dict,
    )


class DiffSummarySerializer(serializers.Serializer):
    skills_added = serializers.IntegerField()
    skills_removed = serializers.IntegerField()
    experience_expanded = serializers.IntegerField()
    experience_reduced = serializers.IntegerField()
    phrasing_improved = serializers.IntegerField()
    general_modifications = serializers.IntegerField()


class SemanticDiffRequestSerializer(serializers.Serializer):
    text_v1 = serializers.CharField(
        max_length=100000, help_text="The original resume text (Version 1)."
    )
    text_v2 = serializers.CharField(
        max_length=100000, help_text="The updated resume text (Version 2)."
    )


class SemanticDiffResponseSerializer(serializers.Serializer):
    changes = SemanticChangeSerializer(many=True)
    summary = DiffSummarySerializer()
    word_count_v1 = serializers.IntegerField()
    word_count_v2 = serializers.IntegerField()
    error = serializers.CharField(required=False, allow_null=True)
