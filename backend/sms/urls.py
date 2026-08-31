"""
SMS URL Configuration
"""

from django.urls import path
from . import views

urlpatterns = [
    # Preferences
    path('api/sms/preferences/', views.UserSMSPreferencesView.as_view(), name='sms-preferences'),
    path('api/sms/preferences/update/', views.UpdateSMSPreferencesView.as_view(), name='sms-preferences-update'),
    
    # Phone verification
    path('api/sms/verify/send/', views.SendVerificationCodeView.as_view(), name='sms-verify-send'),
    path('api/sms/verify/confirm/', views.VerifyPhoneView.as_view(), name='sms-verify-confirm'),
    
    # Send SMS
    path('api/sms/send/', views.SendSMSView.as_view(), name='sms-send'),
    path('api/sms/bulk/', views.BulkSendSMSView.as_view(), name='sms-bulk'),
    
    # Templates
    path('api/sms/templates/', views.ListSMSTemplatesView.as_view(), name='sms-templates'),
    
    # History
    path('api/sms/history/', views.SMSHistoryView.as_view(), name='sms-history'),
    
    # Opt-in/out
    path('api/sms/opt-in/', views.SMSOptInView.as_view(), name='sms-opt-in'),
    
    # Statistics
    path('api/sms/stats/', views.SMSStatisticsView.as_view(), name='sms-stats'),
    
    # Health
    path('api/sms/health/', views.SMSHealthCheckView.as_view(), name='sms-health'),
    
    # Webhook
    path('api/sms/webhook/status/', views.SMSStatusWebhookView.as_view(), name='sms-status-webhook'),
]