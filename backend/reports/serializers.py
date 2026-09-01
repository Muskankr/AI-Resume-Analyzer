"""
Report Serializers for API
"""

from rest_framework import serializers
from .models import (
    ReportExport,
    ReportSchedule,
    ReportTemplate,
    ReportAuditLog,
    ReportCache
)


class ReportExportSerializer(serializers.ModelSerializer):
    """Serializer for report exports."""
    
    class Meta:
        model = ReportExport
        fields = [
            'id', 'organization_id', 'created_by',
            'report_type', 'report_name', 'format',
            'date_range_start', 'date_range_end', 'filters',
            'include_metrics', 'include_charts', 'include_summary',
            'status', 'progress',
            'file_url', 'file_size', 'record_count', 'data_summary',
            'error_message', 'metadata',
            'created_at', 'started_at', 'completed_at', 'expires_at'
        ]
        read_only_fields = [
            'id', 'status', 'progress', 'file_url', 'file_size',
            'record_count', 'data_summary', 'error_message',
            'created_at', 'started_at', 'completed_at'
        ]


class ReportScheduleSerializer(serializers.ModelSerializer):
    """Serializer for report schedules."""
    
    class Meta:
        model = ReportSchedule
        fields = [
            'id', 'organization_id', 'created_by',
            'report_type', 'report_name', 'frequency', 'format',
            'filters', 'include_metrics',
            'recipients', 'send_to_admins',
            'next_run', 'last_run', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_run']


class ReportTemplateSerializer(serializers.ModelSerializer):
    """Serializer for report templates."""
    
    class Meta:
        model = ReportTemplate
        fields = [
            'id', 'name', 'template_id', 'template_type',
            'description',
            'default_filters', 'default_metrics', 'default_charts',
            'sections', 'is_active', 'is_system',
            'usage_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'usage_count']


class ReportAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for audit logs."""
    
    class Meta:
        model = ReportAuditLog
        fields = [
            'id', 'organization_id', 'user_id', 'report_id',
            'action', 'details',
            'ip_address', 'user_agent',
            'timestamp'
        ]
        read_only_fields = '__all__'


class ReportCacheSerializer(serializers.ModelSerializer):
    """Serializer for report cache."""
    
    class Meta:
        model = ReportCache
        fields = [
            'id', 'cache_key', 'data',
            'organization_id', 'report_type',
            'expires_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ReportRequestSerializer(serializers.Serializer):
    """Serializer for requesting a report."""
    report_type = serializers.ChoiceField(choices=ReportExport.REPORT_TYPES)
    report_name = serializers.CharField(max_length=255)
    format = serializers.ChoiceField(choices=ReportExport.FORMAT_CHOICES, default='csv')
    date_range_start = serializers.DateTimeField(required=False)
    date_range_end = serializers.DateTimeField(required=False)
    filters = serializers.DictField(required=False, default=dict)
    include_metrics = serializers.ListField(child=serializers.CharField(), required=False)
    include_charts = serializers.ListField(child=serializers.CharField(), required=False)
    include_summary = serializers.BooleanField(default=True)


class ReportScheduleRequestSerializer(serializers.Serializer):
    """Serializer for scheduling a report."""
    report_type = serializers.ChoiceField(choices=ReportExport.REPORT_TYPES)
    report_name = serializers.CharField(max_length=255)
    frequency = serializers.ChoiceField(choices=ReportSchedule.FREQUENCY_CHOICES)
    format = serializers.ChoiceField(choices=ReportExport.FORMAT_CHOICES, default='csv')
    filters = serializers.DictField(required=False, default=dict)
    include_metrics = serializers.ListField(child=serializers.CharField(), required=False)
    recipients = serializers.ListField(child=serializers.EmailField(), required=False)
    send_to_admins = serializers.BooleanField(default=True)


class ReportMetricsSerializer(serializers.Serializer):
    """Serializer for report metrics."""
    total_users = serializers.IntegerField()
    active_users = serializers.IntegerField()
    total_resumes = serializers.IntegerField()
    avg_score = serializers.FloatField()
    median_score = serializers.FloatField()
    min_score = serializers.FloatField()
    max_score = serializers.FloatField()
    completion_rate = serializers.FloatField()
    trend_direction = serializers.CharField()
    change_percentage = serializers.FloatField()
    growth_rate = serializers.FloatField()


class ReportStatsSerializer(serializers.Serializer):
    """Serializer for report statistics."""
    total_reports = serializers.IntegerField()
    completed = serializers.IntegerField()
    pending = serializers.IntegerField()
    failed = serializers.IntegerField()
    by_type = serializers.DictField()
    by_status = serializers.DictField()
    by_format = serializers.DictField()
    storage_used = serializers.IntegerField()