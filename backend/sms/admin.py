"""
Admin Configuration for SMS
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    SMSLog, SMSProvider, SMSTemplate, UserSMSPreferences,
    SMSBlacklist, SMSDailyStats, SMSWebhookLog
)


@admin.register(SMSProvider)
class SMSProviderAdmin(admin.ModelAdmin):
    list_display = ['name', 'provider_type', 'is_active', 'is_default', 'api_key_configured', 'daily_sent']
    list_filter = ['provider_type', 'is_active', 'is_default']
    search_fields = ['name', 'provider_type']
    readonly_fields = ['created_at', 'updated_at', 'daily_sent']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'provider_type', 'is_active', 'is_default')
        }),
        ('API Credentials', {
            'fields': ('api_key', 'api_secret', 'api_url'),
            'classes': ('wide',)
        }),
        ('Twilio Specific', {
            'fields': ('account_sid', 'auth_token', 'from_number', 'messaging_service_sid'),
            'classes': ('collapse',)
        }),
        ('Rate Limits', {
            'fields': ('max_per_second', 'max_per_day', 'daily_sent'),
            'classes': ('wide',)
        }),
    )
    
    def api_key_configured(self, obj):
        return bool(obj.api_key)
    api_key_configured.boolean = True
    api_key_configured.short_description = 'API Key'


@admin.register(SMSTemplate)
class SMSTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'template_id', 'category', 'is_active', 'requires_opt_in', 'usage_count']
    list_filter = ['category', 'is_active', 'requires_opt_in']
    search_fields = ['name', 'template_id', 'content']
    readonly_fields = ['created_at', 'updated_at', 'usage_count']
    
    def preview_template(self, obj):
        """Preview template with sample data."""
        sample = obj.content.format(
            code='123456',
            link='https://example.com',
            device='iPhone 15',
            location='New York, USA',
            resume_name='My Resume',
            days=5,
            job_title='Software Engineer',
            company='Google',
            match_percentage=95,
            time='10:00 AM',
            status='accepted'
        )
        return format_html(
            '<div style="background:#f5f5f5;padding:10px;border-radius:5px;font-family:monospace;max-width:400px;">{}</div>',
            sample
        )
    preview_template.short_description = 'Preview'


@admin.register(SMSLog)
class SMSLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'phone_number', 'template_name', 'status', 'status_badge', 'created_at']
    list_filter = ['status', 'created_at', 'provider']
    search_fields = ['phone_number', 'message', 'error_message']
    readonly_fields = ['id', 'created_at', 'sent_at', 'delivered_at']
    
    def template_name(self, obj):
        return obj.template.name if obj.template else '-'
    template_name.short_description = 'Template'
    
    def status_badge(self, obj):
        colors = {
            'pending': '#fbbf24',
            'sent': '#3b82f6',
            'delivered': '#22c55e',
            'failed': '#ef4444',
            'queued': '#8b5cf6',
            'cancelled': '#6b7280'
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;border-radius:10px;font-size:11px;">{}</span>',
            color, obj.status.upper()
        )
    status_badge.short_description = 'Status'
    
    def has_add_permission(self, request):
        return False


@admin.register(UserSMSPreferences)
class UserSMSPreferencesAdmin(admin.ModelAdmin):
    list_display = ['user_id', 'phone_number', 'is_verified', 'opt_in', 'daily_limit', 'sms_sent_today']
    list_filter = ['is_verified', 'opt_in']
    search_fields = ['user_id', 'phone_number']
    readonly_fields = ['created_at', 'updated_at', 'sms_sent_today']
    
    def sms_sent_today(self, obj):
        today = datetime.now().date()
        count = SMSLog.objects.filter(
            user_id=obj.user_id,
            created_at__date=today,
            status__in=['sent', 'delivered']
        ).count()
        return f"{count}/{obj.daily_limit}"
    sms_sent_today.short_description = 'SMS Sent Today'


@admin.register(SMSBlacklist)
class SMSBlacklistAdmin(admin.ModelAdmin):
    list_display = ['phone_number', 'reason', 'created_at', 'expires_at']
    list_filter = ['created_at']
    search_fields = ['phone_number', 'reason']
    readonly_fields = ['created_at']


@admin.register(SMSDailyStats)
class SMSDailyStatsAdmin(admin.ModelAdmin):
    list_display = ['date', 'total_sent', 'total_delivered', 'total_failed', 'success_rate']
    list_filter = ['date']
    readonly_fields = ['date', 'total_sent', 'total_delivered', 'total_failed']
    
    def success_rate(self, obj):
        if obj.total_sent == 0:
            return '0%'
        rate = (obj.total_delivered / obj.total_sent) * 100
        return f'{rate:.1f}%'
    success_rate.short_description = 'Success Rate'


@admin.register(SMSWebhookLog)
class SMSWebhookLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'message_id', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['message_id', 'payload']
    readonly_fields = ['id', 'created_at']
    
    def has_add_permission(self, request):
        return False