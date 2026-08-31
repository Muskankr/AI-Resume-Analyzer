"""
DRF serializers for the Resume Content Quality Rewriter.
"""

from rest_framework import serializers


class RewriteSuggestionSerializer(serializers.Serializer):
    """A single rewrite suggestion."""
    original_text = serializers.CharField()
    suggested_text = serializers.CharField()
    issue_type = serializers.ChoiceField(
        choices=["weak_verb", "passive_voice", "filler", "no_quantification", "too_long"]
    )
    priority = serializers.ChoiceField(choices=["critical", "high", "medium", "low"])
    impact_score = serializers.IntegerField(min_value=1, max_value=10)
    explanation = serializers.CharField()
    line_number = serializers.IntegerField(min_value=0)


class ContentRewriteResultSerializer(serializers.Serializer):
    """Full rewrite analysis result."""
    total_lines_analyzed = serializers.IntegerField()
    bullet_lines_found = serializers.IntegerField()
    issues_found = serializers.IntegerField()
    overall_quality_score = serializers.IntegerField(min_value=0, max_value=100)
    suggestions = RewriteSuggestionSerializer(many=True)
    summary = serializers.CharField()
    category_counts = serializers.DictField(child=serializers.IntegerField())
    top_priority_actions = RewriteSuggestionSerializer(many=True)


class ContentRewriteRequestSerializer(serializers.Serializer):
    """Input payload for the content rewrite endpoint."""
    resume_text = serializers.CharField(
        max_length=50000,
        help_text="Full text of the resume to analyse.",
    )
    analysis_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ResumeAnalysis id — loads resume_text from the database.",
    )
