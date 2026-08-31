"""
Reports Models for Anonymized Aggregate Reporting
"""

import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from datetime import datetime, timedelta


class ReportExport(models.Model):
    """Track report exports."""
    
    REPORT_TYPES = [
        ('summary', 'Summary Report'),
        ('detailed', 'Detailed Report'),
        ('skills_gap', 'Skills Gap Analysis'),
        ('score_distribution', 'Score Distribution'),
        ('trend_analysis', 'Trend Analysis'),
        ('comparison', 'Comparison Report'),
        ('custom', 'Custom Report'),
    ]
    
    FORMAT_CHOICES = [
        ('csv', 'CSV'),
        ('excel', 'Excel'),
        ('json', 'JSON'),
        ('pdf', 'PDF'),
    ]
    
    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Organization
    organization_id = models.UUIDField(db_index=True)
    created_by = models.UUIDField(db_index=True)
    
    # Report details
    report_type = models.CharField(max_length=50, choices=REPORT_TYPES)
    report_name = models.CharField(max_length=255)
    format = models.CharField(max_length=20, choices=FORMAT_CHOICES, default='csv')
    
    # Filters
    date_range_start = models.DateTimeField(null=True, blank=True)
    date_range_end = models.DateTimeField(null=True, blank=True)
    filters = models.JSONField(default=dict, blank=True)
    
    # Data
    include_metrics = models.JSONField(default=list, blank=True)
    include_charts = models.JSONField(default=list, blank=True)
    include_summary = models.BooleanField(default=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='queued')
    progress = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    
    # Results
    file_url = models.URLField(max_length=500, blank=True)
    file_size = models.BigIntegerField(default=0)
    record_count = models.IntegerField(default=0)
    data_summary = models.JSONField(default=dict, blank=True)
    
    # Error
    error_message = models.TextField(blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'report_exports'
        indexes = [
            models.Index(fields=['organization_id']),
            models.Index(fields=['created_by']),
            models.Index(fields=['status']),
            models.Index(fields=['-created_at']),
        ]
        verbose_name = _("Report Export")
        verbose_name_plural = _("Report Exports")
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.report_name} - {self.status}"
    
    def mark_as_processing(self):
        self.status = 'processing'
        self.started_at = datetime.now()
        self.save(update_fields=['status', 'started_at'])
    
    def mark_as_completed(self, file_url=None, file_size=0, record_count=0, data_summary=None):
        self.status = 'completed'
        self.progress = 100
        self.completed_at = datetime.now()
        if file_url:
            self.file_url = file_url
        self.file_size = file_size
        self.record_count = record_count
        if data_summary:
            self.data_summary = data_summary
        self.save(update_fields=['status', 'progress', 'completed_at', 'file_url', 'file_size', 'record_count', 'data_summary'])
    
    def mark_as_failed(self, error_message):
        self.status = 'failed'
        self.error_message = error_message
        self.save(update_fields=['status', 'error_message'])
    
    def update_progress(self, progress):
        self.progress = min(progress, 100)
        self.save(update_fields=['progress'])


class ReportSchedule(models.Model):
    """Schedule recurring reports."""
    
    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('biweekly', 'Bi-weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Organization
    organization_id = models.UUIDField(db_index=True)
    created_by = models.UUIDField(db_index=True)
    
    # Schedule details
    report_type = models.CharField(max_length=50, choices=ReportExport.REPORT_TYPES)
    report_name = models.CharField(max_length=255)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    format = models.CharField(max_length=20, choices=ReportExport.FORMAT_CHOICES, default='csv')
    
    # Filters
    filters = models.JSONField(default=dict, blank=True)
    include_metrics = models.JSONField(default=list, blank=True)
    
    # Delivery
    recipients = models.JSONField(default=list, help_text="List of email addresses")
    send_to_admins = models.BooleanField(default=True)
    
    # Schedule
    next_run = models.DateTimeField(db_index=True)
    last_run = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'report_schedules'
        indexes = [
            models.Index(fields=['organization_id']),
            models.Index(fields=['next_run']),
            models.Index(fields=['is_active']),
        ]
        verbose_name = _("Report Schedule")
        verbose_name_plural = _("Report Schedules")
    
    def __str__(self):
        return f"{self.report_name} - {self.frequency}"


class ReportTemplate(models.Model):
    """Pre-defined report templates."""
    
    TEMPLATE_TYPES = [
        ('summary', 'Summary Report'),
        ('detailed', 'Detailed Report'),
        ('skills_gap', 'Skills Gap Analysis'),
        ('score_distribution', 'Score Distribution'),
        ('trend_analysis', 'Trend Analysis'),
        ('comparison', 'Comparison Report'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    template_id = models.CharField(max_length=100, unique=True, db_index=True)
    template_type = models.CharField(max_length=50, choices=TEMPLATE_TYPES)
    description = models.TextField(blank=True)
    
    # Report configuration
    default_filters = models.JSONField(default=dict, blank=True)
    default_metrics = models.JSONField(default=list, blank=True)
    default_charts = models.JSONField(default=list, blank=True)
    
    # Sections
    sections = models.JSONField(default=list, help_text="List of report sections")
    is_active = models.BooleanField(default=True)
    is_system = models.BooleanField(default=False)
    
    # Usage
    usage_count = models.IntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'report_templates'
        verbose_name = _("Report Template")
        verbose_name_plural = _("Report Templates")
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.template_type})"


class ReportAuditLog(models.Model):
    """Audit log for report exports."""
    
    ACTION_CHOICES = [
        ('create', 'Created'),
        ('view', 'Viewed'),
        ('download', 'Downloaded'),
        ('schedule', 'Scheduled'),
        ('cancel', 'Cancelled'),
        ('delete', 'Deleted'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Context
    organization_id = models.UUIDField(db_index=True)
    user_id = models.UUIDField(db_index=True)
    report_id = models.UUIDField(null=True, blank=True)
    
    # Action
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    details = models.JSONField(default=dict, blank=True)
    
    # IP and user agent
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Timestamp
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'report_audit_logs'
        indexes = [
            models.Index(fields=['organization_id']),
            models.Index(fields=['user_id']),
            models.Index(fields=['-timestamp']),
        ]
        verbose_name = _("Report Audit Log")
        verbose_name_plural = _("Report Audit Logs")
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.action} by {self.user_id} at {self.timestamp}"


class ReportCache(models.Model):
    """Cache for report data to improve performance."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cache_key = models.CharField(max_length=255, unique=True, db_index=True)
    data = models.JSONField()
    
    # Metadata
    organization_id = models.UUIDField(db_index=True)
    report_type = models.CharField(max_length=50)
    
    # Expiry
    expires_at = models.DateTimeField()
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'report_caches'
        indexes = [
            models.Index(fields=['cache_key']),
            models.Index(fields=['organization_id']),
            models.Index(fields=['expires_at']),
        ]
        verbose_name = _("Report Cache")
        verbose_name_plural = _("Report Caches")
    
    def __str__(self):
        return self.cache_key
    
    def is_expired(self):
        return datetime.now() > self.expires_at


# Default report templates
DEFAULT_REPORT_TEMPLATES = {
    'summary_report': {
        'name': 'Executive Summary Report',
        'template_id': 'summary_report',
        'template_type': 'summary',
        'description': 'High-level summary of key metrics and trends',
        'default_metrics': ['total_users', 'active_users', 'avg_score', 'completion_rate'],
        'default_charts': ['score_distribution', 'trend_over_time'],
        'sections': ['overview', 'key_metrics', 'trends', 'recommendations'],
        'is_system': True
    },
    'detailed_report': {
        'name': 'Detailed Analytics Report',
        'template_id': 'detailed_report',
        'template_type': 'detailed',
        'description': 'Comprehensive report with all metrics and breakdowns',
        'default_metrics': ['all'],
        'default_charts': ['score_distribution', 'category_scores', 'skills_gap', 'trend_over_time', 'comparison'],
        'sections': ['overview', 'demographics', 'performance', 'skills_analysis', 'trends', 'insights'],
        'is_system': True
    },
    'skills_gap_report': {
        'name': 'Skills Gap Analysis',
        'template_id': 'skills_gap_report',
        'template_type': 'skills_gap',
        'description': 'Analysis of common skill gaps across the organization',
        'default_metrics': ['skills_mastery', 'skill_gap_identify', 'recommendations'],
        'default_charts': ['skills_heatmap', 'gap_analysis'],
        'sections': ['overview', 'top_skills', 'skill_gaps', 'training_recommendations'],
        'is_system': True
    },
    'score_distribution_report': {
        'name': 'Score Distribution Report',
        'template_id': 'score_distribution_report',
        'template_type': 'score_distribution',
        'description': 'Distribution of scores across the organization',
        'default_metrics': ['avg_score', 'median_score', 'score_range', 'percentiles'],
        'default_charts': ['score_histogram', 'score_breakdown'],
        'sections': ['overview', 'distribution', 'percentiles', 'breakdown'],
        'is_system': True
    },
    'trend_analysis_report': {
        'name': 'Trend Analysis Report',
        'template_id': 'trend_analysis_report',
        'template_type': 'trend_analysis',
        'description': 'Analysis of trends over time',
        'default_metrics': ['trend_direction', 'change_percentage', 'growth_rate'],
        'default_charts': ['trend_line', 'seasonal_pattern'],
        'sections': ['overview', 'historical_trends', 'forecast', 'insights'],
        'is_system': True
    },
    'comparison_report': {
        'name': 'Comparison Report',
        'template_id': 'comparison_report',
        'template_type': 'comparison',
        'description': 'Compare metrics across different segments',
        'default_metrics': ['comparison_metrics'],
        'default_charts': ['bar_chart', 'radar_chart'],
        'sections': ['overview', 'comparison_table', 'visual_comparison', 'insights'],
        'is_system': True
    }
}