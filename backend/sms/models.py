"""
SMS Models for Notification System
"""

import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from datetime import datetime, timedelta


class SMSProvider(models.Model):
    """SMS service provider configuration."""
    
    PROVIDER_TYPES = [
        ('twilio', 'Twilio'),
        ('aws_sns', 'AWS SNS'),
        ('vonage', 'Vonage'),
        ('telnyx', 'Telnyx'),
        ('plivo', 'Plivo'),
        ('messagebird', 'MessageBird'),
        ('custom', 'Custom'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    provider_type = models.CharField(max_length=50, choices=PROVIDER_TYPES, default='twilio')
    
    # API credentials
    api_key = models.CharField(max_length=255, blank=True)
    api_secret = models.CharField(max_length=255, blank=True)
    api_url = models.URLField(blank=True, null=True)
    
    # Twilio specific
    account_sid = models.CharField(max_length=255, blank=True)
    auth_token = models.CharField(max_length=255, blank=True)
    from_number = models.CharField(max_length=20, blank=True)
    messaging_service_sid = models.CharField(max_length=255, blank=True)
    status_callback_url = models.URLField(blank=True, null=True)
    
    # Rate limiting
    max_per_second = models.IntegerField(default=10)
    max_per_day = models.IntegerField(default=1000)
    daily_sent = models.IntegerField(default=0)
    
    # Cost
    cost_per_sms = models.DecimalField(max_digits=10, decimal_places=6, default=0.0075)
    currency = models.CharField(max_length=3, default='USD')
    
    # Health
    last_health_check = models.DateTimeField(null=True, blank=True)
    is_healthy = models.BooleanField(default=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sms_providers'
        verbose_name = _("SMS Provider")
        verbose_name_plural = _("SMS Providers")
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.provider_type})"
    
    def save(self, *args, **kwargs):
        if self.is_default:
            SMSProvider.objects.filter(is_default=True).update(is_default=False)
        super().save(*args, **kwargs)
    
    def increment_daily_count(self):
        self.daily_sent += 1
        self.save(update_fields=['daily_sent'])
    
    def reset_daily_count(self):
        self.daily_sent = 0
        self.save(update_fields=['daily_sent'])


class SMSTemplate(models.Model):
    """SMS message templates."""
    
    CATEGORIES = [
        ('verification', 'Verification'),
        ('notification', 'Notification'),
        ('alert', 'Alert'),
        ('reminder', 'Reminder'),
        ('marketing', 'Marketing'),
        ('transactional', 'Transactional'),
        ('system', 'System'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    template_id = models.CharField(max_length=100, unique=True, db_index=True)
    category = models.CharField(max_length=50, choices=CATEGORIES, default='notification')
    content = models.TextField(
        help_text="SMS content with {variables} for dynamic values. Max 160 characters."
    )
    
    # Variable validation
    required_variables = models.JSONField(default=list, blank=True)
    
    # Settings
    is_active = models.BooleanField(default=True)
    requires_opt_in = models.BooleanField(default=False)
    is_system = models.BooleanField(default=False)
    
    # Usage tracking
    usage_count = models.IntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sms_templates'
        verbose_name = _("SMS Template")
        verbose_name_plural = _("SMS Templates")
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.template_id})"
    
    def clean(self):
        if len(self.content) > 160:
            raise ValidationError({
                'content': 'SMS content cannot exceed 160 characters'
            })
        
        # Detect variables
        import re
        variables = re.findall(r'\{([^}]+)\}', self.content)
        self.required_variables = list(set(variables))
    
    def render(self, variables=None):
        """Render template with variables."""
        variables = variables or {}
        try:
            return self.content.format(**variables)
        except KeyError as e:
            raise ValueError(f"Missing variable: {e}")


class SMSLog(models.Model):
    """SMS delivery log."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('queued', 'Queued'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Recipient
    phone_number = models.CharField(max_length=20, db_index=True)
    user_id = models.UUIDField(null=True, blank=True, db_index=True)
    
    # Message
    template = models.ForeignKey(SMSTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    template_id_used = models.CharField(max_length=100, blank=True)
    message = models.TextField()
    message_length = models.IntegerField(default=0)
    
    # Provider
    provider = models.ForeignKey(SMSProvider, on_delete=models.SET_NULL, null=True)
    provider_message_id = models.CharField(max_length=255, blank=True, db_index=True)
    provider_response = models.JSONField(default=dict, blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    status_history = models.JSONField(default=list)
    error_code = models.CharField(max_length=20, blank=True)
    error_message = models.TextField(blank=True)
    
    # Delivery details
    segments = models.IntegerField(default=1)
    cost = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    
    # Retry
    retry_count = models.IntegerField(default=0)
    max_retries = models.IntegerField(default=3)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'sms_logs'
        indexes = [
            models.Index(fields=['phone_number']),
            models.Index(fields=['user_id']),
            models.Index(fields=['status']),
            models.Index(fields=['provider_message_id']),
            models.Index(fields=['-created_at']),
        ]
        verbose_name = _("SMS Log")
        verbose_name_plural = _("SMS Logs")
        ordering = ['-created_at']
    
    def __str__(self):
        return f"SMS to {self.phone_number} - {self.status}"
    
    def mark_as_sent(self, provider_message_id=None):
        self.status = 'sent'
        self.sent_at = datetime.now()
        if provider_message_id:
            self.provider_message_id = provider_message_id
        self.save(update_fields=['status', 'sent_at', 'provider_message_id'])
    
    def mark_as_delivered(self):
        self.status = 'delivered'
        self.delivered_at = datetime.now()
        self.save(update_fields=['status', 'delivered_at'])
    
    def mark_as_failed(self, error_code=None, error_message=None):
        self.status = 'failed'
        self.failed_at = datetime.now()
        if error_code:
            self.error_code = error_code
        if error_message:
            self.error_message = error_message
        self.save(update_fields=['status', 'failed_at', 'error_code', 'error_message'])


class UserSMSPreferences(models.Model):
    """User SMS notification preferences."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField(unique=True, db_index=True)
    
    phone_number = models.CharField(
        max_length=20,
        validators=[
            RegexValidator(
                regex=r'^\+?[1-9]\d{1,14}$',
                message='Phone number must be in E.164 format (e.g., +1234567890)'
            )
        ],
        blank=True
    )
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    verification_attempts = models.IntegerField(default=0)
    
    opt_in = models.BooleanField(default=False)
    opt_in_at = models.DateTimeField(null=True, blank=True)
    opt_out_at = models.DateTimeField(null=True, blank=True)
    
    # Notification types
    NOTIFICATION_TYPES = [
        ('analysis_complete', 'Analysis Complete'),
        ('new_device_login', 'New Device Login'),
        ('resume_expiring', 'Resume Expiring'),
        ('job_match', 'Job Match'),
        ('interview_reminder', 'Interview Reminder'),
        ('application_status', 'Application Status'),
        ('security_alert', 'Security Alert'),
        ('account_update', 'Account Update'),
        ('promotional', 'Promotional'),
        ('system', 'System'),
    ]
    
    enabled_types = models.JSONField(default=list)
    disabled_types = models.JSONField(default=list)
    
    # Limits
    daily_limit = models.IntegerField(default=5)
    monthly_limit = models.IntegerField(default=50)
    
    # Quiet hours
    quiet_hours_enabled = models.BooleanField(default=False)
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)
    quiet_hours_timezone = models.CharField(max_length=50, default='UTC')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_sms_preferences'
        verbose_name = _("User SMS Preferences")
        verbose_name_plural = _("User SMS Preferences")
    
    def __str__(self):
        return f"User {self.user_id} - {self.phone_number} - {'Opted In' if self.opt_in else 'Opted Out'}"
    
    def is_quiet_hours(self):
        """Check if current time is within quiet hours."""
        if not self.quiet_hours_enabled or not self.quiet_hours_start or not self.quiet_hours_end:
            return False
        
        from datetime import datetime
        now = datetime.now().time()
        
        if self.quiet_hours_start < self.quiet_hours_end:
            return self.quiet_hours_start <= now <= self.quiet_hours_end
        else:
            return now >= self.quiet_hours_start or now <= self.quiet_hours_end


class SMSBlacklist(models.Model):
    """Blacklisted phone numbers."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone_number = models.CharField(max_length=20, unique=True, db_index=True)
    reason = models.TextField(blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_by = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'sms_blacklist'
        verbose_name = _("SMS Blacklist")
        verbose_name_plural = _("SMS Blacklist")
    
    def __str__(self):
        return self.phone_number
    
    def is_expired(self):
        if not self.expires_at:
            return False
        return datetime.now() > self.expires_at


class SMSDailyStats(models.Model):
    """Daily SMS statistics."""
    
    date = models.DateField(unique=True, db_index=True)
    total_sent = models.IntegerField(default=0)
    total_delivered = models.IntegerField(default=0)
    total_failed = models.IntegerField(default=0)
    total_cost = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    
    # Breakdown by type
    by_template = models.JSONField(default=dict)
    by_provider = models.JSONField(default=dict)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'sms_daily_stats'
        verbose_name = _("SMS Daily Stats")
        verbose_name_plural = _("SMS Daily Stats")
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.date} - Sent: {self.total_sent}"


class SMSWebhookLog(models.Model):
    """Webhook delivery status log."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message_id = models.CharField(max_length=255, db_index=True)
    status = models.CharField(max_length=20)
    payload = models.JSONField()
    processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'sms_webhook_logs'
        verbose_name = _("SMS Webhook Log")
        verbose_name_plural = _("SMS Webhook Logs")
        ordering = ['-created_at']


# Default SMS Templates
DEFAULT_SMS_TEMPLATES = {
    'sms_verification': {
        'name': 'Phone Verification',
        'template_id': 'sms_verification',
        'category': 'verification',
        'content': 'Your verification code is: {code}. Valid for 10 minutes.',
        'requires_opt_in': False,
        'is_system': True
    },
    'sms_analysis_complete': {
        'name': 'Analysis Complete',
        'template_id': 'sms_analysis_complete',
        'category': 'notification',
        'content': '✅ Your resume analysis is complete! View results: {link}',
        'requires_opt_in': True
    },
    'sms_new_device_login': {
        'name': 'New Device Login Alert',
        'template_id': 'sms_new_device_login',
        'category': 'alert',
        'content': '🔐 New login from {device} at {location}. If not you, secure your account immediately.',
        'requires_opt_in': True
    },
    'sms_resume_expiring': {
        'name': 'Resume Expiring Soon',
        'template_id': 'sms_resume_expiring',
        'category': 'reminder',
        'content': '📄 Your resume "{resume_name}" expires in {days} days. Update now!',
        'requires_opt_in': True
    },
    'sms_job_match': {
        'name': 'Job Match Alert',
        'template_id': 'sms_job_match',
        'category': 'notification',
        'content': '💼 New job: {job_title} at {company} - {match_percentage}% match! Apply now.',
        'requires_opt_in': True
    },
    'sms_interview_reminder': {
        'name': 'Interview Reminder',
        'template_id': 'sms_interview_reminder',
        'category': 'reminder',
        'content': '🎯 Interview reminder: {company} tomorrow at {time}. Good luck!',
        'requires_opt_in': True
    },
    'sms_application_status': {
        'name': 'Application Status Update',
        'template_id': 'sms_application_status',
        'category': 'notification',
        'content': '📊 Application for {job_title} at {company}: {status}',
        'requires_opt_in': True
    },
    'sms_security_alert': {
        'name': 'Security Alert',
        'template_id': 'sms_security_alert',
        'category': 'alert',
        'content': '⚠️ Security alert: {message}. Please review your account immediately.',
        'requires_opt_in': True
    },
    'sms_account_update': {
        'name': 'Account Update',
        'template_id': 'sms_account_update',
        'category': 'notification',
        'content': '🔔 Account update: {message}. View your dashboard for details.',
        'requires_opt_in': True
    },
}