from django.contrib import admin

from .models import Role, Skill, SuggestionFeedback


@admin.register(SuggestionFeedback)
class SuggestionFeedbackAdmin(admin.ModelAdmin):
    """Read-only view of suggestion votes.

    Suggestions are generated from a template, so votes are the only signal we
    have for whether the recommendations are worth reading. The useful view is
    the aggregate — which suggestions get downvoted most.
    """

    list_display = ("short_suggestion", "vote", "user", "analysis", "updated_at")
    list_filter = ("vote", "updated_at")
    search_fields = ("suggestion_text", "comment", "user__username")
    readonly_fields = (
        "user",
        "analysis",
        "suggestion_text",
        "suggestion_hash",
        "vote",
        "comment",
        "created_at",
        "updated_at",
    )
    date_hierarchy = "updated_at"

    @admin.display(description="Suggestion")
    def short_suggestion(self, obj):
        text = obj.suggestion_text or ""
        return text if len(text) <= 70 else f"{text[:70]}…"

    def has_add_permission(self, request):
        # Feedback comes from users through the API, not from the admin.
        return False


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    """The skill vocabulary the career tracks are built from.

    Registered because it was not. ``Role`` and ``Skill`` have been in the model
    layer since ``0011_role_skills_schema`` with no admin, so the only way to
    change a track's requirements was a shell session — and until #708 the
    analyzer ignored the result anyway. Now that the database is authoritative,
    the store has to be reachable.
    """

    list_display = ("name", "role_count")
    search_fields = ("name",)
    ordering = ("name",)

    def get_queryset(self, request):
        # Without this the role count is one query per row.
        return super().get_queryset(request).prefetch_related("roles")

    @admin.display(description="Used by roles")
    def role_count(self, obj):
        return obj.roles.count()


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    """A career track and the skills it requires.

    Editing skills here changes what analyses are scored against, for every
    experience level. The packaged defaults in ``services.EXPERIENCE_LEVEL_SKILLS``
    are only consulted for roles this table does not have, so adding a role here
    takes it over completely rather than merging with the defaults —
    ``analyzer.role_skills`` explains why that is deliberate.
    """

    list_display = ("name", "skill_count")
    search_fields = ("name",)
    ordering = ("name",)
    filter_horizontal = ("skills",)

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related("skills")

    @admin.display(description="Required skills")
    def skill_count(self, obj):
        return obj.skills.count()
