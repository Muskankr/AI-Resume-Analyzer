from django.urls import path
from .views import upload_resume, get_shared_result

urlpatterns = [
    path("upload/", upload_resume),
    path("result/<str:pk>/", get_shared_result),
]