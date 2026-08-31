"""
Deep Links URL Configuration
"""

from django.urls import path
from . import views

urlpatterns = [
    # Deep link redirect
    path('apply/<str:short_code>/', views.DeepLinkRedirectView.as_view(), name='deep-link-redirect'),
    
    # Deep link management
    path('api/deep-links/create/', views.DeepLinkCreateView.as_view(), name='deep-link-create'),
    path('api/deep-links/list/', views.DeepLinkListView.as_view(), name='deep-link-list'),
    path('api/deep-links/stats/', views.DeepLinkStatsView.as_view(), name='deep-link-stats'),
    
    # Job matches
    path('api/job-matches/', views.JobMatchView.as_view(), name='job-matches'),
    path('api/job-matches/<uuid:match_id>/apply/', views.JobMatchApplyView.as_view(), name='job-match-apply'),
    
    # Engagement tracking
    path('api/deep-links/engagement/', views.DeepLinkEngagementView.as_view(), name='deep-link-engagement'),
    
    # Domains (admin only)
    path('api/deep-links/domains/', views.DeepLinkDomainView.as_view(), name='deep-link-domains'),
]