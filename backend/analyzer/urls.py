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
    delete_single_history,
    clear_user_history,
    compare_versions_view,
    suggestion_feedback,
    get_shared_result,
    verify_email,
    resend_verification_email,
    user_status,
    admin_stats_view,
    analyze_jd_view,
)

urlpatterns = [
    path("upload/", upload_resume),
    path("compare-uploads/", compare_uploads),
    path("analyze-jd/", analyze_jd_view),

    path("auth/signup/", signup),
    path("auth/login/", TokenObtainPairView.as_view()),
    path("auth/refresh/", TokenRefreshView.as_view()),
    path("auth/verify-email/", verify_email),
    path("auth/resend-verification/", resend_verification_email),
    path("auth/status/", user_status),

    path("history/", analysis_history),
    path("history/clear/", clear_user_history),
    path("history/<int:pk>/", delete_single_history),

    path("compare/", compare_versions_view),
    path("suggestion-feedback/", suggestion_feedback),
    path("shared/<uuid:share_id>/", get_shared_result),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path("admin/stats/", admin_stats_view, name="admin_stats"),
]