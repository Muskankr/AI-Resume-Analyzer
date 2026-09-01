"""
URL configuration for job offer comparison
"""

from django.urls import path
from . import views

urlpatterns = [
    path('compare/', views.compare_job_offers, name='compare_job_offers'),
    path('history/', views.get_comparison_history, name='comparison_history'),
]