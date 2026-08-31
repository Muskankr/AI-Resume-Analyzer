"""
Reminder URL Configuration
"""

from django.urls import path
from . import views

urlpatterns = [
    # Preferences
    path('api/reminders/preferences/', views.UserReminderPreferencesView.as_view(), name='reminder-preferences'),
    path('api/reminders/preferences/update/', views.UpdateReminderPreferencesView.as_view(), name='reminder-preferences-update'),
    
    # Reminders
    path('api/reminders/list/', views.ListRemindersView.as_view(), name='reminder-list'),
    path('api/reminders/send/', views.SendReminderView.as_view(), name='reminder-send'),
    path('api/reminders/bulk/', views.SendBulkRemindersView.as_view(), name='reminder-bulk'),
    
    # Stats
    path('api/reminders/stats/', views.ReminderStatsView.as_view(), name='reminder-stats'),
    
    # Templates
    path('api/reminders/templates/', views.ReminderTemplateListView.as_view(), name='reminder-templates'),
    
    # Engagement tracking
    path('api/reminders/track/<uuid:reminder_id>/', views.ReminderEngagementView.as_view(), name='reminder-track'),
]