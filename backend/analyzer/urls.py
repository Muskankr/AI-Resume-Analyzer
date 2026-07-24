from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import (
    upload_resume,
    signup,
    analysis_history,
    delete_single_history,
    clear_user_history,
    compare_versions_view,
    suggestion_feedback,
    get_shared_result,
)

urlpatterns = [
    path("upload/", upload_resume),

    path("auth/signup/", signup),
    path("auth/login/", TokenObtainPairView.as_view()),
    path("auth/refresh/", TokenRefreshView.as_view()),

    path("history/", analysis_history),
    path("history/clear/", clear_user_history),
    path("history/<int:pk>/", delete_single_history),

    path("compare/", compare_versions_view),
    path("suggestion-feedback/", suggestion_feedback),
    path("shared/<uuid:share_id>/", get_shared_result),
]