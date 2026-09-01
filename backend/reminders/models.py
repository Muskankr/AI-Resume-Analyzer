"""
Reminder Models for Resume-Expiration Re-Engagement
"""

import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from datetime import datetime, timedelta


class ReminderTemplate(models.Model):
    """Email reminder templates."""
    
    TEMPLATE_TYPES = [
        ('expiration_warning', 'Expiration Warning'),
        ('expiration_soon', 'Expiring Soon'),
        ('expired', 'Expired'),
        ('re_engagement', 'Re-engagement'),
        ('refresh_suggestion', 'Refresh Suggestion'),
        ('monthly_digest', 'Monthly Digest'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    template_id = models.CharField(max_length=100, unique=True, db_index=True)
    template_type = models.CharField(max_length=50, choices=TEMPLATE_TYPES, default='expiration_warning')
    
    # Content
    subject = models.CharField(max_length=200)
    content = models.TextField(help_text="Plain text content with {variables}")
    html_content = models.TextField(blank=True, help_text="HTML version with {variables}")
    
    # Variables
    required_variables = models.JSONField(default=list, blank=True)
    example_variables = models.JSONField(default=dict, blank=True)
    
    # Settings
    is_active = models.BooleanField(default=True)
    is_system = models.BooleanField(default=False)
    
    # Usage
    usage_count = models.IntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'reminder_templates'
        verbose_name = _("Reminder Template")
        verbose_name_plural = _("Reminder Templates")
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.template_id})"
    
    def render_subject(self, variables=None):
        """Render subject with variables."""
        variables = variables or {}
        try:
            return self.subject.format(**variables)
        except KeyError as e:
            return self.subject
    
    def render_content(self, variables=None, html=False):
        """Render content with variables."""
        variables = variables or {}
        content = self.html_content if html else self.content
        try:
            return content.format(**variables)
        except KeyError as e:
            return content


class ResumeExpirationReminder(models.Model):
    """Track resume expiration reminders."""
    
    REMINDER_TYPES = [
        ('warning', 'Warning (30 days before)'),
        ('soon', 'Expiring Soon (7 days before)'),
        ('expired', 'Expired'),
        ('re_engagement', 'Re-engagement'),
        ('refresh', 'Refresh Suggestion'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('opted_out', 'Opted Out'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # User
    user_id = models.UUIDField(db_index=True)
    user_email = models.EmailField()
    username = models.CharField(max_length=255, blank=True)
    
    # Resume
    resume_id = models.UUIDField(db_index=True, null=True, blank=True)
    resume_name = models.CharField(max_length=255, blank=True)
    last_analyzed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Reminder
    reminder_type = models.CharField(max_length=20, choices=REMINDER_TYPES, default='warning')
    template = models.ForeignKey(ReminderTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    subject = models.CharField(max_length=200, blank=True)
    content = models.TextField(blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Delivery
    sent_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True)
    
    # Engagement
    opened_count = models.IntegerField(default=0)
    clicked_count = models.IntegerField(default=0)
    
    # Metadata
    variables_used = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'resume_expiration_reminders'
        indexes = [
            models.Index(fields=['user_id']),
            models.Index(fields=['resume_id']),
            models.Index(fields=['status']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['expires_at']),
        ]
        verbose_name = _("Resume Expiration Reminder")
        verbose_name_plural = _("Resume Expiration Reminders")
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Reminder for {self.user_email} - {self.reminder_type} - {self.status}"
    
    def mark_as_sent(self):
        self.status = 'sent'
        self.sent_at = datetime.now()
        self.save(update_fields=['status', 'sent_at'])
    
    def mark_as_failed(self, error=None):
        self.status = 'failed'
        if error:
            self.error_message = error
        self.save(update_fields=['status', 'error_message'])
    
    def mark_as_opened(self):
        self.opened_count += 1
        if not self.opened_at:
            self.opened_at = datetime.now()
        self.save(update_fields=['opened_count', 'opened_at'])
    
    def mark_as_clicked(self):
        self.clicked_count += 1
        if not self.clicked_at:
            self.clicked_at = datetime.now()
        self.save(update_fields=['clicked_count', 'clicked_at'])


class ReminderLog(models.Model):
    """Log of all reminder activities."""
    
    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
        ('opened', 'Opened'),
        ('clicked', 'Clicked'),
        ('bounced', 'Bounced'),
        ('unsubscribed', 'Unsubscribed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    user_id = models.UUIDField(db_index=True)
    recipient_email = models.EmailField()
    
    reminder = models.ForeignKey(ResumeExpirationReminder, on_delete=models.SET_NULL, null=True, blank=True)
    reminder_type = models.CharField(max_length=50)
    
    subject = models.CharField(max_length=200, blank=True)
    content_preview = models.TextField(blank=True, max_length=500)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='queued')
    
    # Delivery details
    provider_message_id = models.CharField(max_length=255, blank=True)
    error_code = models.CharField(max_length=50, blank=True)
    error_message = models.TextField(blank=True)
    
    # Tracking
    opened_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True)
    bounced_at = models.DateTimeField(null=True, blank=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)
    
    # IP and user agent
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'reminder_logs'
        indexes = [
            models.Index(fields=['user_id']),
            models.Index(fields=['status']),
            models.Index(fields=['-created_at']),
        ]
        verbose_name = _("Reminder Log")
        verbose_name_plural = _("Reminder Logs")
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Log for {self.recipient_email} - {self.status}"


class UserReminderPreferences(models.Model):
    """User preferences for reminders."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField(unique=True, db_index=True)
    
    # Opt-in/out
    opt_in = models.BooleanField(default=True)
    opt_in_at = models.DateTimeField(null=True, blank=True)
    opt_out_at = models.DateTimeField(null=True, blank=True)
    
    # Frequency
    reminder_frequency_days = models.IntegerField(
        default=90,
        validators=[MinValueValidator(30), MaxValueValidator(365)]
    )
    warning_days_before = models.IntegerField(
        default=30,
        validators=[MinValueValidator(7), MaxValueValidator(60)]
    )
    
    # Types enabled
    enabled_types = models.JSONField(default=list, help_text="List of enabled reminder types")
    disabled_types = models.JSONField(default=list, help_text="List of disabled reminder types")
    
    # Quiet hours
    quiet_hours_enabled = models.BooleanField(default=False)
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)
    
    # Tracking
    last_reminder_sent = models.DateTimeField(null=True, blank=True)
    total_reminders_sent = models.IntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_reminder_preferences'
        verbose_name = _("User Reminder Preferences")
        verbose_name_plural = _("User Reminder Preferences")
    
    def __str__(self):
        return f"User {self.user_id} - {'Opted In' if self.opt_in else 'Opted Out'}"
    
    def is_quiet_hours(self):
        """Check if current time is within quiet hours."""
        if not self.quiet_hours_enabled or not self.quiet_hours_start or not self.quiet_hours_end:
            return False
        
        now = datetime.now().time()
        start = self.quiet_hours_start
        end = self.quiet_hours_end
        
        if start < end:
            return start <= now <= end
        else:
            return now >= start or now <= end


# Default Reminder Templates
DEFAULT_REMINDER_TEMPLATES = {
    'expiration_warning': {
        'name': 'Resume Expiration Warning',
        'template_id': 'expiration_warning',
        'template_type': 'expiration_warning',
        'subject': 'Your resume is expiring soon - {days} days left',
        'content': """
        Hi {username},
        
        Your resume "{resume_name}" will expire in {days} days.
        
        To keep your resume active and visible to employers, please refresh it before {expiry_date}.
        
        Click here to refresh your resume: {refresh_link}
        
        If you have any questions, feel free to reply to this email.
        
        Best regards,
        The AI Resume Analyzer Team
        """,
        'html_content': """
        <html>
        <body>
            <h2>Your resume is expiring soon!</h2>
            <p>Hi {username},</p>
            <p>Your resume "<strong>{resume_name}</strong>" will expire in <strong>{days} days</strong>.</p>
            <p>To keep your resume active and visible to employers, please refresh it before <strong>{expiry_date}</strong>.</p>
            <p><a href="{refresh_link}" style="background:#4F46E5;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Refresh Your Resume</a></p>
            <p>If you have any questions, feel free to reply to this email.</p>
            <p>Best regards,<br>The AI Resume Analyzer Team</p>
        </body>
        </html>
        """,
        'required_variables': ['username', 'resume_name', 'days', 'expiry_date', 'refresh_link'],
        'is_system': True
    },
    'expiration_soon': {
        'name': 'Resume Expiring Soon',
        'template_id': 'expiration_soon',
        'template_type': 'expiration_soon',
        'subject': 'URGENT: Your resume expires in {days} days!',
        'content': """
        Hi {username},
        
        Your resume "{resume_name}" expires in just {days} days!
        
        Don't miss out on opportunities. Refresh your resume now to stay visible to employers.
        
        Click here to refresh immediately: {refresh_link}
        
        Best regards,
        The AI Resume Analyzer Team
        """,
        'html_content': """
        <html>
        <body>
            <h2>⚠️ Your resume expires in {days} days!</h2>
            <p>Hi {username},</p>
            <p>Your resume "<strong>{resume_name}</strong>" expires in just <strong>{days} days</strong>!</p>
            <p>Don't miss out on opportunities. Refresh your resume now to stay visible to employers.</p>
            <p><a href="{refresh_link}" style="background:#EF4444;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Refresh Immediately</a></p>
            <p>Best regards,<br>The AI Resume Analyzer Team</p>
        </body>
        </html>
        """,
        'required_variables': ['username', 'resume_name', 'days', 'refresh_link'],
        'is_system': True
    },
    'expired': {
        'name': 'Resume Expired',
        'template_id': 'expired',
        'template_type': 'expired',
        'subject': 'Your resume has expired - Reactivate now!',
        'content': """
        Hi {username},
        
        Your resume "{resume_name}" has expired and is no longer visible to employers.
        
        Reactivate your resume to continue receiving job opportunities:
        {refresh_link}
        
        Best regards,
        The AI Resume Analyzer Team
        """,
        'html_content': """
        <html>
        <body>
            <h2>Your resume has expired</h2>
            <p>Hi {username},</p>
            <p>Your resume "<strong>{resume_name}</strong>" has expired and is no longer visible to employers.</p>
            <p>Reactivate your resume to continue receiving job opportunities:</p>
            <p><a href="{refresh_link}" style="background:#22C55E;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Reactivate Resume</a></p>
            <p>Best regards,<br>The AI Resume Analyzer Team</p>
        </body>
        </html>
        """,
        'required_variables': ['username', 'resume_name', 'refresh_link'],
        'is_system': True
    },
    're_engagement': {
        'name': 'Re-engagement Reminder',
        'template_id': 're_engagement',
        'template_type': 're_engagement',
        'subject': 'It\'s been a while - Update your resume!',
        'content': """
        Hi {username},
        
        We noticed you haven't updated your resume in {days_since_update} days.
        
        Employers are looking for candidates with fresh resumes. Update yours today:
        {refresh_link}
        
        Tips for updating your resume:
        - Add any new skills or certifications
        - Update your work experience
        - Refresh your summary
        
        Best regards,
        The AI Resume Analyzer Team
        """,
        'html_content': """
        <html>
        <body>
            <h2>It's been a while - Update your resume!</h2>
            <p>Hi {username},</p>
            <p>We noticed you haven't updated your resume in <strong>{days_since_update} days</strong>.</p>
            <p>Employers are looking for candidates with fresh resumes. Update yours today:</p>
            <p><a href="{refresh_link}" style="background:#8B5CF6;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Update Resume</a></p>
            <p><strong>Tips for updating your resume:</strong></p>
            <ul>
                <li>Add any new skills or certifications</li>
                <li>Update your work experience</li>
                <li>Refresh your summary</li>
            </ul>
            <p>Best regards,<br>The AI Resume Analyzer Team</p>
        </body>
        </html>
        """,
        'required_variables': ['username', 'days_since_update', 'refresh_link'],
        'is_system': True
    },
    'refresh_suggestion': {
        'name': 'Resume Refresh Suggestion',
        'template_id': 'refresh_suggestion',
        'template_type': 'refresh_suggestion',
        'subject': 'Make your resume stand out - Refresh it now!',
        'content': """
        Hi {username},
        
        Your resume "{resume_name}" could use a refresh. Here are some suggestions:
        
        {suggestions}
        
        Click here to refresh your resume: {refresh_link}
        
        Best regards,
        The AI Resume Analyzer Team
        """,
        'html_content': """
        <html>
        <body>
            <h2>Make your resume stand out!</h2>
            <p>Hi {username},</p>
            <p>Your resume "<strong>{resume_name}</strong>" could use a refresh. Here are some suggestions:</p>
            <div style="background:#F3F4F6;padding:15px;border-radius:5px;">
                {suggestions}
            </div>
            <p><a href="{refresh_link}" style="background:#10B981;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Refresh Your Resume</a></p>
            <p>Best regards,<br>The AI Resume Analyzer Team</p>
        </body>
        </html>
        """,
        'required_variables': ['username', 'resume_name', 'suggestions', 'refresh_link'],
        'is_system': True
    },
    'monthly_digest': {
        'name': 'Monthly Resume Digest',
        'template_id': 'monthly_digest',
        'template_type': 'monthly_digest',
        'subject': 'Your Resume Monthly Digest - {month} {year}',
        'content': """
        Hi {username},
        
        Here's your monthly resume digest for {month} {year}:
        
        📄 Your resume has been viewed {views} times
        🎯 {matches} job matches found
        ⭐ Your resume score is {score}/100
        
        Tips for improvement:
        {tips}
        
        Keep your resume up to date: {refresh_link}
        
        Best regards,
        The AI Resume Analyzer Team
        """,
        'html_content': """
        <html>
        <body>
            <h2>Your Resume Monthly Digest</h2>
            <p>Hi {username},</p>
            <p>Here's your monthly resume digest for <strong>{month} {year}</strong>:</p>
            <ul>
                <li>📄 Your resume has been viewed <strong>{views} times</strong></li>
                <li>🎯 <strong>{matches}</strong> job matches found</li>
                <li>⭐ Your resume score is <strong>{score}/100</strong></li>
            </ul>
            <div style="background:#F3F4F6;padding:15px;border-radius:5px;">
                <strong>Tips for improvement:</strong>
                {tips}
            </div>
            <p><a href="{refresh_link}" style="background:#4F46E5;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Update Your Resume</a></p>
            <p>Best regards,<br>The AI Resume Analyzer Team</p>
        </body>
        </html>
        """,
        'required_variables': ['username', 'month', 'year', 'views', 'matches', 'score', 'tips', 'refresh_link'],
        'is_system': True
    }
}