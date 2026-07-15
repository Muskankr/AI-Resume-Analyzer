from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import upload_resume, signup, analysis_history

urlpatterns = [
    path("upload/", upload_resume),
    path("auth/signup/", signup),
    path("auth/login/", TokenObtainPairView.as_view()),
    path("auth/refresh/", TokenRefreshView.as_view()),
    path("history/", analysis_history),
]
