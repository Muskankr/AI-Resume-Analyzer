"""
URL configuration for website generation endpoints
"""

from django.urls import path
from . import views_website

urlpatterns = [
    path('website/generate/', views_website.generate_website, name='generate_website'),
    path('website/preview/', views_website.preview_website, name='preview_website'),
    path('website/download/', views_website.download_website, name='download_website'),
    path('website/templates/', views_website.get_templates, name='get_templates'),
    path('website/deploy/', views_website.deploy_website, name='deploy_website'),
]