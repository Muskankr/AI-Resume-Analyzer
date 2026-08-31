"""
Deep Links Models for "Apply Directly" Feature
"""

import uuid
import hashlib
import random
import string
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator, URLValidator
from django.core.exceptions import ValidationError
from datetime import datetime, timedelta


class DeepLink(models.Model):
    """
    Deep link to a job posting.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Job details
    title = models.CharField(max_length=255, db_index=True)
    company = models.CharField(max_length=255, db_index=True)
    location = models.CharField(max_length=255, blank=True)
    original_url = models.URLField(max_length=1000, validators=[URLValidator()])
    
    # Deep link
    short_code = models.CharField(max_length=20, unique=True, db_index=True)
    redirect_url = models.URLField(max_length=1000, blank=True)
    
    # Metadata
    source = models.CharField(max_length=100, blank=True, help_text="Source of job posting")
    job_id = models.CharField(max_length=255, blank=True, help_text="External job ID")
    
    # Match data
    match_score = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    match_metadata = models.JSONField(default=dict, blank=True)
    
    # Engagement
    click_count = models.IntegerField(default=0)
    unique_click_count = models.IntegerField(default=0)
    last_clicked_at = models.DateTimeField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    
    # Expiry
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Consent tracking
    consent_required = models.BooleanField(default=True)
    consent_obtained = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'deep_links'
        indexes = [
            models.Index(fields=['short_code']),
            models.Index(fields=['title']),
            models.Index(fields=['company']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['is_active']),
        ]
        verbose_name = _("Deep Link")
        verbose_name_plural = _("Deep Links")
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} at {self.company}"
    
    def save(self, *args, **kwargs):
        if not self.short_code:
            self.short_code = self._generate_short_code()
        if not self.redirect_url:
            self.redirect_url = self._generate_redirect_url()
        super().save(*args, **kwargs)
    
    def _generate_short_code(self, length: int = 8) -> str:
        """Generate a unique short code."""
        characters = string.ascii_letters + string.digits
        code = ''.join(random.choices(characters, k=length))
        
        # Ensure uniqueness
        while DeepLink.objects.filter(short_code=code).exists():
            code = ''.join(random.choices(characters, k=length))
        
        return code
    
    def _generate_redirect_url(self) -> str:
        """Generate redirect URL."""
        return f"/apply/{self.short_code}"
    
    def get_absolute_url(self) -> str:
        """Get absolute URL for the deep link."""
        return f"/apply/{self.short_code}"
    
    def increment_click(self, user_id: str = None, ip_address: str = None) -> None:
        """Increment click count."""
        self.click_count += 1
        
        # Track unique clicks
        if user_id:
            has_clicked = DeepLinkClick.objects.filter(
                deep_link=self,
                user_id=user_id
            ).exists()
            if not has_clicked:
                self.unique_click_count += 1
        else:
            # Track by IP if no user
            if ip_address:
                has_clicked = DeepLinkClick.objects.filter(
                    deep_link=self,
                    ip_address=ip_address
                ).exists()
                if not has_clicked:
                    self.unique_click_count += 1
        
        self.last_clicked_at = datetime.now()
        self.save(update_fields=['click_count', 'unique_click_count', 'last_clicked_at'])
    
    def is_expired(self) -> bool:
        """Check if the deep link is expired."""
        if self.expires_at:
            return datetime.now() > self.expires_at
        return False


class DeepLinkClick(models.Model):
    """
    Track clicks on deep links.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relationship
    deep_link = models.ForeignKey(DeepLink, on_delete=models.CASCADE, related_name='clicks')
    
    # User tracking
    user_id = models.UUIDField(null=True, blank=True, db_index=True)
    session_id = models.CharField(max_length=255, blank=True)
    
    # Context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    referer = models.URLField(max_length=500, blank=True)
    
    # Consent
    consent_given = models.BooleanField(default=False)
    
    # Engagement
    time_on_page = models.IntegerField(default=0, help_text="Time spent on page in seconds")
    scrolled = models.BooleanField(default=False)
    interacted = models.BooleanField(default=False)
    
    # Location (optional)
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    clicked_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'deep_link_clicks'
        indexes = [
            models.Index(fields=['deep_link']),
            models.Index(fields=['user_id']),
            models.Index(fields=['session_id']),
            models.Index(fields=['-clicked_at']),
        ]
        verbose_name = _("Deep Link Click")
        verbose_name_plural = _("Deep Link Clicks")
        ordering = ['-clicked_at']
    
    def __str__(self):
        return f"Click on {self.deep_link.title} at {self.clicked_at}"


class JobPosting(models.Model):
    """
    Job posting model for storing job data.
    """
    
    SOURCE_CHOICES = [
        ('manual', 'Manual'),
        ('api', 'API'),
        ('scraped', 'Scraped'),
        ('imported', 'Imported'),
        ('user', 'User Submitted'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Job details
    title = models.CharField(max_length=255, db_index=True)
    company = models.CharField(max_length=255, db_index=True)
    location = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    requirements = models.TextField(blank=True)
    salary_range = models.CharField(max_length=100, blank=True)
    
    # External
    external_id = models.CharField(max_length=255, blank=True, db_index=True)
    external_url = models.URLField(max_length=1000, blank=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='manual')
    
    # Deep link
    deep_link = models.OneToOneField(DeepLink, on_delete=models.SET_NULL, null=True, blank=True, related_name='job_posting')
    
    # Status
    is_active = models.BooleanField(default=True)
    is_remote = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    
    # Categories
    category = models.CharField(max_length=100, blank=True)
    seniority_level = models.CharField(max_length=50, blank=True)
    employment_type = models.CharField(max_length=50, blank=True)
    
    # Metadata
    skills = models.JSONField(default=list, blank=True)
    benefits = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'job_postings'
        indexes = [
            models.Index(fields=['title']),
            models.Index(fields=['company']),
            models.Index(fields=['external_id']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['is_active']),
        ]
        verbose_name = _("Job Posting")
        verbose_name_plural = _("Job Postings")
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} at {self.company}"


class JobMatch(models.Model):
    """
    Job match between a user/resume and a job posting.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relationships
    user_id = models.UUIDField(db_index=True)
    resume_id = models.UUIDField(null=True, blank=True)
    job_posting = models.ForeignKey(JobPosting, on_delete=models.CASCADE, related_name='matches')
    deep_link = models.ForeignKey(DeepLink, on_delete=models.CASCADE, related_name='matches')
    
    # Match score
    match_score = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    skills_match = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    experience_match = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    education_match = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    
    # Match details
    matched_skills = models.JSONField(default=list, blank=True)
    missing_skills = models.JSONField(default=list, blank=True)
    match_metadata = models.JSONField(default=dict, blank=True)
    
    # Status
    is_applied = models.BooleanField(default=False)
    applied_at = models.DateTimeField(null=True, blank=True)
    is_viewed = models.BooleanField(default=False)
    viewed_at = models.DateTimeField(null=True, blank=True)
    
    # Application tracking
    application_status = models.CharField(max_length=50, blank=True)
    application_notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'job_matches'
        indexes = [
            models.Index(fields=['user_id']),
            models.Index(fields=['job_posting']),
            models.Index(fields=['-match_score']),
            models.Index(fields=['-created_at']),
        ]
        unique_together = [['user_id', 'job_posting']]
        verbose_name = _("Job Match")
        verbose_name_plural = _("Job Matches")
        ordering = ['-match_score']
    
    def __str__(self):
        return f"Match {self.match_score}% - {self.user_id} to {self.job_posting.title}"
    
    def mark_as_applied(self):
        """Mark match as applied."""
        self.is_applied = True
        self.applied_at = datetime.now()
        self.save(update_fields=['is_applied', 'applied_at'])
    
    def mark_as_viewed(self):
        """Mark match as viewed."""
        self.is_viewed = True
        self.viewed_at = datetime.now()
        self.save(update_fields=['is_viewed', 'viewed_at'])


class DeepLinkAnalytics(models.Model):
    """
    Analytics data for deep links.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relationship
    deep_link = models.ForeignKey(DeepLink, on_delete=models.CASCADE, related_name='analytics')
    
    # Date
    date = models.DateField(db_index=True)
    
    # Metrics
    total_clicks = models.IntegerField(default=0)
    unique_clicks = models.IntegerField(default=0)
    click_rate = models.FloatField(default=0)
    
    # Breakdown
    by_source = models.JSONField(default=dict, blank=True)
    by_device = models.JSONField(default=dict, blank=True)
    by_location = models.JSONField(default=dict, blank=True)
    
    # Engagement
    avg_time_on_page = models.IntegerField(default=0)
    interaction_rate = models.FloatField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'deep_link_analytics'
        indexes = [
            models.Index(fields=['deep_link']),
            models.Index(fields=['date']),
            models.Index(fields=['-created_at']),
        ]
        unique_together = [['deep_link', 'date']]
        verbose_name = _("Deep Link Analytics")
        verbose_name_plural = _("Deep Link Analytics")
        ordering = ['-date']


class DeepLinkDomain(models.Model):
    """
    Trusted domains for deep links.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    domain = models.CharField(max_length=255, unique=True, db_index=True)
    is_trusted = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    click_count = models.IntegerField(default=0)
    
    # Security
    requires_consent = models.BooleanField(default=True)
    allowed_paths = models.JSONField(default=list, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'deep_link_domains'
        verbose_name = _("Deep Link Domain")
        verbose_name_plural = _("Deep Link Domains")
    
    def __str__(self):
        return self.domain