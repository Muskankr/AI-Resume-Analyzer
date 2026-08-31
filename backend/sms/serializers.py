"""
SMS Serializers for API
"""

from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from .models import (
    SMSLog, SMSProvider, SMSTemplate, UserSMSPreferences,
    SMSBlacklist, SMSDailyStats, SMSWebhookLog
)


class SMSProviderSerializer(serializers.ModelSerializer):
    """Serializer for SMS provider."""
    
    class Meta:
        model = SMSProvider
        fields = [
            'id', 'name', 'provider_type', 'api_key', 'api_secret',
            'api_url', 'account_sid', 'auth_token', 'from_number',
            'messaging_service_sid', 'status_callback_url',
            'max_per_second', 'max_per_day', 'daily_sent',
            'cost_per_sms', 'currency',
            'last_health_check', 'is_healthy',
            'is_active', 'is_default',
            'metadata', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'daily_sent', 'last_health_check']
        extra_kwargs = {
            'api_key': {'write_only': True},
            'api_secret': {'write_only': True},
            'auth_token': {'write_only': True},
        }


class SMSTemplateSerializer(serializers.ModelSerializer):
    """Serializer for SMS template."""
    
    class Meta:
        model = SMSTemplate
        fields = [
            'id', 'name', 'template_id', 'category',
            'content', 'required_variables',
            'is_active', 'requires_opt_in', 'is_system',
            'usage_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'usage_count']


class SMSLogSerializer(serializers.ModelSerializer):
    """Serializer for SMS log."""
    
    template_name = serializers.CharField(source='template.name', read_only=True)
    
    class Meta:
        model = SMSLog
        fields = [
            'id', 'phone_number', 'user_id',
            'template', 'template_name', 'template_id_used',
            'message', 'message_length',
            'provider', 'provider_message_id', 'provider_response',
            'status', 'status_history',
            'error_code', 'error_message',
            'segments', 'cost',
            'retry_count', 'max_retries',
            'metadata', 'ip_address', 'user_agent',
            'created_at', 'scheduled_at', 'sent_at', 'delivered_at', 'failed_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'sent_at', 'delivered_at',
            'failed_at', 'message_length', 'segments', 'cost'
        ]


class UserSMSPreferencesSerializer(serializers.ModelSerializer):
    """Serializer for user SMS preferences."""
    
    class Meta:
        model = UserSMSPreferences
        fields = [
            'id', 'user_id',
            'phone_number', 'is_verified', 'verified_at',
            'opt_in', 'opt_in_at', 'opt_out_at',
            'enabled_types', 'disabled_types',
            'daily_limit', 'monthly_limit',
            'quiet_hours_enabled', 'quiet_hours_start',
            'quiet_hours_end', 'quiet_hours_timezone',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'is_verified', 'verified_at',
            'opt_in_at', 'opt_out_at',
            'created_at', 'updated_at'
        ]
    
    def validate_phone_number(self, value):
        if value:
            import re
            if not re.match(r'^\+?[1-9]\d{1,14}$', value):
                raise ValidationError(
                    'Phone number must be in E.164 format (e.g., +1234567890)'
                )
        return value
    
    def validate_enabled_types(self, value):
        valid_types = [
            'analysis_complete', 'new_device_login', 'resume_expiring',
            'job_match', 'interview_reminder', 'application_status',
            'security_alert', 'account_update', 'promotional', 'system'
        ]
        for item in value:
            if item not in valid_types:
                raise ValidationError(f'Invalid notification type: {item}')
        return value


class SMSBlacklistSerializer(serializers.ModelSerializer):
    """Serializer for SMS blacklist."""
    
    class Meta:
        model = SMSBlacklist
        fields = ['id', 'phone_number', 'reason', 'expires_at', 'created_at']
        read_only_fields = ['id', 'created_at']


class SMSDailyStatsSerializer(serializers.ModelSerializer):
    """Serializer for daily SMS stats."""
    
    class Meta:
        model = SMSDailyStats
        fields = [
            'date', 'total_sent', 'total_delivered',
            'total_failed', 'total_cost',
            'by_template', 'by_provider',
            'created_at'
        ]
        read_only_fields = '__all__'


class SMSWebhookLogSerializer(serializers.ModelSerializer):
    """Serializer for webhook log."""
    
    class Meta:
        model = SMSWebhookLog
        fields = ['id', 'message_id', 'status', 'payload', 'processed', 'processed_at', 'created_at']
        read_only_fields = '__all__'


class SMSRequestSerializer(serializers.Serializer):
    """Serializer for sending SMS."""
    phone_number = serializers.CharField(max_length=20, required=False)
    template_id = serializers.CharField(max_length=100)
    variables = serializers.DictField(required=False, default=dict)
    scheduled_at = serializers.DateTimeField(required=False)


class SMSBulkRequestSerializer(serializers.Serializer):
    """Serializer for bulk SMS."""
    phone_numbers = serializers.ListField(child=serializers.CharField(max_length=20))
    template_id = serializers.CharField(max_length=100)
    variables = serializers.DictField(required=False, default=dict)
    user_ids = serializers.ListField(child=serializers.UUIDField(), required=False)


class SMSVerifySendSerializer(serializers.Serializer):
    """Serializer for sending verification code."""
    phone_number = serializers.CharField(max_length=20)


class SMSVerifyRequestSerializer(serializers.Serializer):
    """Serializer for phone verification."""
    phone_number = serializers.CharField(max_length=20)
    code = serializers.CharField(max_length=10)


class SMSOptInSerializer(serializers.Serializer):
    """Serializer for opt-in/out."""
    opt_in = serializers.BooleanField()
    phone_number = serializers.CharField(max_length=20, required=False)


class SMSNotificationTypeSerializer(serializers.Serializer):
    """Serializer for notification type preferences."""
    enabled_types = serializers.ListField(child=serializers.CharField(), required=False)
    disabled_types = serializers.ListField(child=serializers.CharField(), required=False)


class SMSQuietHoursSerializer(serializers.Serializer):
    """Serializer for quiet hours."""
    enabled = serializers.BooleanField(default=False)
    start = serializers.TimeField(required=False)
    end = serializers.TimeField(required=False)
    timezone = serializers.CharField(max_length=50, default='UTC')


class SMSStatusUpdateSerializer(serializers.Serializer):
    """Serializer for status webhook."""
    message_id = serializers.CharField(max_length=255)
    status = serializers.CharField(max_length=20)
    error_code = serializers.CharField(required=False)
    error_message = serializers.CharField(required=False)
    delivered_at = serializers.DateTimeField(required=False)