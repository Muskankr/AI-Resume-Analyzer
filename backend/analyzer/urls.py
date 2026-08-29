from django.urls import path
from .views import PasswordResetRequestView, PasswordResetConfirmView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import (
    upload_resume,
    compare_uploads,
    signup,
    check_availability,
    analysis_history,
    history_detail,
    clear_user_history,
    compare_versions_view,
    suggestion_feedback,
    get_shared_result,
    manage_analysis_share,
    admin_stats_view,
    analyze_jd_view,
    user_profile_view,
    contact_us_view,
    CustomTokenObtainPairView,
    social_auth_view,
    profile_avatar_view,
    compare_bulk_jds_view,
    compare_bulk_resumes_view,
    skills_leaderboard_view,
    unsubscribe_digest_view,
    task_status,
    mock_interview_view,
    export_user_data,
    manage_webhooks,
    webhook_detail,
    test_webhook,
    preview_experience_level_view,
    import_jd_url_view,
)
from .badge_views import manage_resume_badge, resume_score_badge

# The feature modules below were written with views, serializers and tests, and
# were never given a path. Everything under `analyzer/` matches the URLs the
# frontend has been requesting all along — see `tests_api_routes.ROUTES`.
from .bullet_views import BulletOptimizeView
from .diff_views import SemanticDiffView
from .interview_views import InterviewQuestionGenerateView
from .layout_views import LayoutAnalysisView
from .multilingual_views import LanguageDetectionView, TranslationView

# Same again, for the five features merged in #929-#933. Seven view classes,
# no paths. These sit at the top level rather than under `analyzer/` because
# that is where the frontend and the view docstrings already agree they are —
# see the ROUTES table in tests_api_routes.py for who calls each one.
from .ab_testing_views import ABTestingStatsView, LogApplicationView
from .accessibility_views import AccessibilityCheckView
from .cliche_views import ClicheDetectorView
from .linkedin_views import LinkedInOptimizationView
from .sanitizer_views import FileMetadataView, SanitizeResumeView

# And again, for the five features merged in #945-#949 (#1006). Same shape as
# the two batches above: view class, serializers, unit tests, no path. The
# frontend components for all five already POST to the URLs below.
from .gap_views import GapNarrativeView
from .market_views import MarketValueView
from .proficiency_views import ProficiencyEstimationView
from .project_views import ProjectExtractionView
from .tone_views import ToneAnalysisView

urlpatterns = [
    path("upload/", upload_resume),
    path("preview-level/", preview_experience_level_view),
    path("status/<str:task_id>/", task_status),
    path("mock-interview/", mock_interview_view),
    path("compare-uploads/", compare_uploads),
    path("analyze-jd/", analyze_jd_view),
    # Routed in ded2a8a (#777) and dropped by a later merge that kept the view.
    path("import-jd-url/", import_jd_url_view, name="import_jd_url"),
    path("compare-bulk-jds/", compare_bulk_jds_view),
    path("compare-bulk-resumes/", compare_bulk_resumes_view),
    path("profile/", user_profile_view),
    path("profile/avatar/", profile_avatar_view, name="profile_avatar"),
    path("contact/", contact_us_view),
    path("skills-leaderboard/", skills_leaderboard_view),
    path("unsubscribe/", unsubscribe_digest_view),
    path("account/export/", export_user_data, name="export_user_data"),

    path("auth/signup/", signup),
    path("auth/check-availability/", check_availability, name="check_availability"),
    path("auth/check-availability", check_availability),
    path("auth/login/", CustomTokenObtainPairView.as_view()),
    path("auth/oauth/", social_auth_view, name="social_auth"),
    path("auth/refresh/", TokenRefreshView.as_view()),

    path("history/", analysis_history),
    path("history/clear/", clear_user_history),
    path("history/<int:pk>/", history_detail),
    path(
        "history/<int:pk>/share/",
        manage_analysis_share,
        name="manage_analysis_share",
    ),

    path("webhooks/", manage_webhooks, name="manage_webhooks"),
    path("webhooks/<int:pk>/", webhook_detail, name="webhook_detail"),
    path("webhooks/<int:pk>/test/", test_webhook, name="test_webhook"),

    path("compare/", compare_versions_view),
    path("suggestion-feedback/", suggestion_feedback),
    path("shared/<uuid:share_id>/", get_shared_result),
    path("badge/", manage_resume_badge, name="manage_resume_badge"),
    path("badge/<uuid:badge_id>/svg/", resume_score_badge, name="resume_score_badge"),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path("admin/stats/", admin_stats_view, name="admin_stats"),

    # Resume-improvement tools.
    #
    # These sit under an `analyzer/` prefix rather than alongside the routes
    # above. That is not a preference: `frontend/src/services/`,
    # `frontend/src/hooks/useInterviewQuestions.ts` and
    # `components/ResumeDiffViewer.tsx` already post to these exact paths, and
    # moving the frontend instead would break any client already deployed
    # against them.
    path(
        "analyzer/optimize-bullets/",
        BulletOptimizeView.as_view(),
        name="optimize_bullets",
    ),
    path(
        "analyzer/semantic-diff/",
        SemanticDiffView.as_view(),
        name="semantic_diff",
    ),
    path(
        "analyzer/generate-interview-questions/",
        InterviewQuestionGenerateView.as_view(),
        name="generate_interview_questions",
    ),
    path(
        "analyzer/layout-analysis/",
        LayoutAnalysisView.as_view(),
        name="layout_analysis",
    ),
    path(
        "analyzer/detect-language/",
        LanguageDetectionView.as_view(),
        name="detect_language",
    ),
    path(
        "analyzer/translate/",
        TranslationView.as_view(),
        name="translate_resume_text",
    ),

    # Resume A/B testing (#925).
    path(
        "log-application/",
        LogApplicationView.as_view(),
        name="log_application",
    ),
    path(
        "ab-testing-stats/",
        ABTestingStatsView.as_view(),
        name="ab_testing_stats",
    ),

    # Screen-reader compliance (#926).
    path(
        "check-accessibility/",
        AccessibilityCheckView.as_view(),
        name="check_accessibility",
    ),

    # Cliché detection and modernisation.
    path(
        "detect-cliches/",
        ClicheDetectorView.as_view(),
        name="detect_cliches",
    ),

    # LinkedIn profile optimisation.
    path(
        "optimize-linkedin/",
        LinkedInOptimizationView.as_view(),
        name="optimize_linkedin",
    ),

    # Metadata sanitiser and privacy scrubber (#924).
    path(
        "file-metadata/",
        FileMetadataView.as_view(),
        name="file_metadata",
    ),
    path(
        "sanitize-resume/",
        SanitizeResumeView.as_view(),
        name="sanitize_resume",
    ),

    # Gap explanation and narrative builder (#946).
    # frontend/src/components/GapNarrativeBuilder.tsx
    path(
        "generate-gap-narrative/",
        GapNarrativeView.as_view(),
        name="generate_gap_narrative",
    ),

    # Market value and salary estimator (#947).
    # frontend/src/components/SalaryMarketEstimator.tsx
    path(
        "estimate-market-value/",
        MarketValueView.as_view(),
        name="estimate_market_value",
    ),

    # Skill proficiency estimator (#945).
    # frontend/src/components/SkillProficiencyEstimator.tsx
    path(
        "estimate-proficiency/",
        ProficiencyEstimationView.as_view(),
        name="estimate_proficiency",
    ),

    # Project portfolio extractor and impact scorer (#948).
    # frontend/src/components/ProjectPortfolioScorer.tsx
    path(
        "analyze-projects/",
        ProjectExtractionView.as_view(),
        name="analyze_projects",
    ),

    # Tone and sentiment analyzer (#949).
    # frontend/src/components/ToneCultureFitAnalyzer.tsx
    path(
        "analyze-tone/",
        ToneAnalysisView.as_view(),
        name="analyze_tone",
    ),
]
