"""
Branding URL Configuration
Defines all branding-related API endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'branding', views.BrandingViewSet, basename='branding')

urlpatterns = [
    path('api/', include(router.urls)),
    
    # Additional endpoints
    path('api/branding/templates/', views.BrandingViewSet.as_view({'get': 'get_templates'}), name='branding-templates'),
    path('api/branding/<str:organization_id>/', views.BrandingViewSet.as_view({'get': 'retrieve', 'put': 'update'}), name='branding-detail'),
    path('api/branding/<str:organization_id>/reset/', views.BrandingViewSet.as_view({'post': 'reset_branding'}), name='branding-reset'),
    path('api/branding/<str:organization_id>/template/', views.BrandingViewSet.as_view({'post': 'apply_template'}), name='branding-template'),
    path('api/branding/<str:organization_id>/logo/', views.BrandingViewSet.as_view({'post': 'upload_logo'}), name='branding-logo'),
    path('api/branding/<str:organization_id>/css/', views.BrandingViewSet.as_view({'get': 'get_css'}), name='branding-css'),
    path('api/branding/<str:organization_id>/preview/', views.BrandingViewSet.as_view({'get': 'get_preview'}), name='branding-preview'),
]