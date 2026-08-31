"""
Admin Configuration for Reminders
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    ResumeExpirationReminder,
    ReminderLog,
    UserReminderPreferences,
    ReminderTemplate
)


@admin.register(ReminderTemplate)
class ReminderTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'template_id', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'template_id', 'subject', 'content']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'template_id', 'is_active')
        }),
        ('Content', {
            'fields': ('subject', 'content', 'html_content'),
            'classes': ('wide',)
        }),
        ('Variables', {
            'fields': ('required_variables', 'example_variables'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ResumeExpirationReminder)
class ResumeExpirationReminderAdmin(admin.ModelAdmin):
    list_display = ['user_id', 'resume_id', 'reminder_type', 'status', 'sent_at']
    list_filter = ['status', 'reminder_type', 'created_at']
    search_fields = ['user_id', 'resume_id', 'user_email']
    readonly_fields = ['created_at', 'updated_at', 'sent_at']
    
    def has_add_permission(self, request):
        return False


@admin.register(ReminderLog)
class ReminderLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'user_id', 'reminder_type', 'status', 'created_at']
    list_filter = ['status', 'reminder_type', 'created_at']
    search_fields = ['user_id', 'recipient_email', 'error_message']
    readonly_fields = ['id', 'created_at', 'sent_at']
    
    def has_add_permission(self, request):
        return False


@admin.register(UserReminderPreferences)
class UserReminderPreferencesAdmin(admin.ModelAdmin):
    list_display = ['user_id', 'opt_in', 'reminder_frequency_days', 'last_reminder_sent']
    list_filter = ['opt_in', 'reminder_frequency_days']
    search_fields = ['user_id']
    readonly_fields = ['created_at', 'updated_at']