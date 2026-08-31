"""
Reminder Serializers for API
"""

from rest_framework import serializers
from .models import (
    ResumeExpirationReminder,
    ReminderLog,
    UserReminderPreferences,
    ReminderTemplate
)


class ReminderTemplateSerializer(serializers.ModelSerializer):
    """Serializer for reminder templates."""
    
    class Meta:
        model = ReminderTemplate
        fields = [
            'id', 'name', 'template_id', 'template_type',
            'subject', 'content', 'html_content',
            'required_variables', 'example_variables',
            'is_active', 'is_system',
            'usage_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'usage_count']


class ResumeExpirationReminderSerializer(serializers.ModelSerializer):
    """Serializer for resume expiration reminders."""
    
    class Meta:
        model = ResumeExpirationReminder
        fields = [
            'id', 'user_id', 'user_email', 'username',
            'resume_id', 'resume_name', 'last_analyzed_at', 'expires_at',
            'reminder_type', 'template', 'subject', 'content',
            'status', 'sent_at', 'opened_at', 'clicked_at',
            'opened_count', 'clicked_count',
            'variables_used', 'error_message', 'metadata',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'sent_at', 'opened_at', 'clicked_at',
            'opened_count', 'clicked_count', 'created_at', 'updated_at'
        ]


class ReminderLogSerializer(serializers.ModelSerializer):
    """Serializer for reminder logs."""
    
    class Meta:
        model = ReminderLog
        fields = [
            'id', 'user_id', 'recipient_email',
            'reminder', 'reminder_type',
            'subject', 'content_preview',
            'status', 'provider_message_id',
            'error_code', 'error_message',
            'opened_at', 'clicked_at', 'bounced_at', 'unsubscribed_at',
            'ip_address', 'user_agent',
            'created_at', 'sent_at'
        ]
        read_only_fields = '__all__'


class UserReminderPreferencesSerializer(serializers.ModelSerializer):
    """Serializer for user reminder preferences."""
    
    class Meta:
        model = UserReminderPreferences
        fields = [
            'id', 'user_id',
            'opt_in', 'opt_in_at', 'opt_out_at',
            'reminder_frequency_days', 'warning_days_before',
            'enabled_types', 'disabled_types',
            'quiet_hours_enabled', 'quiet_hours_start', 'quiet_hours_end',
            'last_reminder_sent', 'total_reminders_sent',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'opt_in_at', 'opt_out_at',
            'last_reminder_sent', 'total_reminders_sent',
            'created_at', 'updated_at'
        ]


class ReminderRequestSerializer(serializers.Serializer):
    """Serializer for sending reminders manually."""
    user_id = serializers.UUIDField()
    reminder_type = serializers.ChoiceField(
        choices=['warning', 'soon', 'expired', 're_engagement', 'refresh']
    )
    resume_id = serializers.UUIDField(required=False)
    variables = serializers.DictField(required=False, default=dict)


class ReminderBulkRequestSerializer(serializers.Serializer):
    """Serializer for bulk reminders."""
    user_ids = serializers.ListField(child=serializers.UUIDField())
    reminder_type = serializers.ChoiceField(
        choices=['warning', 'soon', 'expired', 're_engagement', 'refresh']
    )
    variables = serializers.DictField(required=False, default=dict)


class ReminderPreferencesUpdateSerializer(serializers.Serializer):
    """Serializer for updating reminder preferences."""
    opt_in = serializers.BooleanField(required=False)
    reminder_frequency_days = serializers.IntegerField(
        required=False,
        min_value=30,
        max_value=365
    )
    warning_days_before = serializers.IntegerField(
        required=False,
        min_value=7,
        max_value=60
    )
    enabled_types = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    disabled_types = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    quiet_hours_enabled = serializers.BooleanField(required=False)
    quiet_hours_start = serializers.TimeField(required=False)
    quiet_hours_end = serializers.TimeField(required=False)


class ReminderStatsSerializer(serializers.Serializer):
    """Serializer for reminder statistics."""
    total_sent = serializers.IntegerField()
    total_opened = serializers.IntegerField()
    total_clicked = serializers.IntegerField()
    open_rate = serializers.FloatField()
    click_rate = serializers.FloatField()
    by_type = serializers.DictField()
    by_status = serializers.DictField()