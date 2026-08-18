from django.contrib import admin

from .models import SuggestionFeedback


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
