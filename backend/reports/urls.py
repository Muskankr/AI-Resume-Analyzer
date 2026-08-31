"""
Report URL Configuration
"""

from django.urls import path
from . import views

urlpatterns = [
    # Report requests
    path('api/reports/request/', views.ReportRequestView.as_view(), name='report-request'),
    path('api/reports/export/', views.ReportExportView.as_view(), name='report-export'),
    path('api/reports/list/', views.ReportListView.as_view(), name='report-list'),
    path('api/reports/<uuid:report_id>/', views.ReportStatusView.as_view(), name='report-status'),
    path('api/reports/<uuid:report_id>/download/', views.ReportDownloadView.as_view(), name='report-download'),
    path('api/reports/<uuid:report_id>/cancel/', views.ReportCancelView.as_view(), name='report-cancel'),
    
    # Schedules
    path('api/reports/schedule/', views.ReportScheduleView.as_view(), name='report-schedule'),
    path('api/reports/schedules/', views.ReportScheduleListView.as_view(), name='report-schedules'),
    
    # Templates
    path('api/reports/templates/', views.ReportTemplateListView.as_view(), name='report-templates'),
    
    # Stats
    path('api/reports/stats/', views.ReportStatsView.as_view(), name='report-stats'),
]