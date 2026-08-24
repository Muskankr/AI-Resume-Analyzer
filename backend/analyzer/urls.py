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
    skills_leaderboard_view,
    unsubscribe_digest_view,
    task_status,
    mock_interview_view,
    export_user_data,
    manage_webhooks,
    webhook_detail,
    test_webhook,
    import_jd_url_view,
)
from .badge_views import manage_resume_badge, resume_score_badge

urlpatterns = [
    path("upload/", upload_resume),
    path("import-jd-url/", import_jd_url_view),
    path("status/<str:task_id>/", task_status),
    path("mock-interview/", mock_interview_view),
    path("compare-uploads/", compare_uploads),
    path("analyze-jd/", analyze_jd_view),
    path("compare-bulk-jds/", compare_bulk_jds_view),
    path("profile/", user_profile_view),
    path("profile/avatar/", profile_avatar_view, name="profile_avatar"),
    path("contact/", contact_us_view),
    path("skills-leaderboard/", skills_leaderboard_view),
    path("unsubscribe/", unsubscribe_digest_view),
    path("account/export/", export_user_data, name="export_user_data"),

    path("auth/signup/", signup),
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
]
