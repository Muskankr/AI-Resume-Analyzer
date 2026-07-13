from django.urls import path
from .views import upload_resume

urlpatterns = [
    path("upload/", upload_resume),
]