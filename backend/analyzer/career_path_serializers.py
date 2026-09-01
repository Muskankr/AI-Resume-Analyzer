"""
DRF serializers for the Career Path Recommendation Engine.

Keeps the wire format stable and documented separately from the engine logic.
"""

from rest_framework import serializers


class CareerPathActionSerializer(serializers.Serializer):
    """A single actionable step in the career development plan."""
    title = serializers.CharField()
    description = serializers.CharField()
    action_type = serializers.ChoiceField(
        choices=["skill", "project", "certification", "course", "soft"]
    )
    skill_name = serializers.CharField(allow_null=True, required=False)
    priority = serializers.ChoiceField(
        choices=["critical", "high", "medium", "low"]
    )
    estimated_weeks = serializers.IntegerField(min_value=0)
    estimated_score_impact = serializers.IntegerField(min_value=0, max_value=100)
    category = serializers.CharField()
    resources = serializers.ListField(child=serializers.CharField(), default=list)


class CareerPathPhaseSerializer(serializers.Serializer):
    """A time-boxed phase containing prioritised actions."""
    phase_key = serializers.CharField()
    label = serializers.CharField()
    week_start = serializers.IntegerField(min_value=1)
    week_end = serializers.IntegerField(min_value=0)
    actions = CareerPathActionSerializer(many=True)
    phase_summary = serializers.CharField()


class CareerPathPlanSerializer(serializers.Serializer):
    """Complete career development plan returned by the API."""
    target_role = serializers.CharField()
    experience_level = serializers.CharField()
    current_score = serializers.IntegerField(min_value=0, max_value=100)
    projected_score = serializers.IntegerField(min_value=0, max_value=100)
    current_skills = serializers.ListField(child=serializers.CharField())
    missing_skills = serializers.ListField(child=serializers.CharField())
    skills_to_learn = serializers.ListField(child=serializers.CharField())
    total_estimated_weeks = serializers.IntegerField(min_value=0)
    phases = CareerPathPhaseSerializer(many=True)
    quick_wins = CareerPathActionSerializer(many=True)
    long_term_goals = CareerPathActionSerializer(many=True)
    summary = serializers.CharField()


class CareerPathRequestSerializer(serializers.Serializer):
    """Input payload for the career path endpoint.

    The user may supply an ``analysis_id`` (which loads everything from the
    database) or supply the raw fields directly.  ``analysis_id`` takes
    precedence when both are present.
    """
    analysis_id = serializers.IntegerField(required=False, allow_null=True)
    target_role = serializers.CharField(max_length=100, required=False, default="")
    experience_level = serializers.CharField(
        max_length=50, required=False, default="Mid-Level"
    )
    resume_text = serializers.CharField(required=False, allow_blank=True, default="")
    matched_skills = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    missing_skills = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    detected_skills = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    current_score = serializers.IntegerField(
        min_value=0, max_value=100, required=False, default=0
    )
