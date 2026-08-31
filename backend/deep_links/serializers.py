"""
Deep Links Serializers for API
"""

from rest_framework import serializers
from .models import (
    DeepLink,
    DeepLinkClick,
    JobPosting,
    JobMatch,
    DeepLinkAnalytics,
    DeepLinkDomain
)


class DeepLinkSerializer(serializers.ModelSerializer):
    """Serializer for deep links."""
    
    full_url = serializers.SerializerMethodField()
    
    class Meta:
        model = DeepLink
        fields = [
            'id', 'title', 'company', 'location',
            'short_code', 'redirect_url', 'original_url',
            'source', 'job_id', 'match_score',
            'click_count', 'unique_click_count', 'last_clicked_at',
            'is_active', 'is_featured', 'expires_at',
            'created_at', 'updated_at', 'full_url'
        ]
        read_only_fields = [
            'id', 'short_code', 'click_count', 'unique_click_count',
            'last_clicked_at', 'created_at', 'updated_at'
        ]
    
    def get_full_url(self, obj):
        """Get full URL for the deep link."""
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(f'/apply/{obj.short_code}')
        return f'/apply/{obj.short_code}'


class DeepLinkClickSerializer(serializers.ModelSerializer):
    """Serializer for deep link clicks."""
    
    class Meta:
        model = DeepLinkClick
        fields = [
            'id', 'deep_link', 'user_id', 'session_id',
            'ip_address', 'user_agent', 'referer',
            'consent_given', 'time_on_page', 'scrolled', 'interacted',
            'country', 'city', 'metadata',
            'clicked_at'
        ]
        read_only_fields = ['id', 'clicked_at']


class JobPostingSerializer(serializers.ModelSerializer):
    """Serializer for job postings."""
    
    deep_link = DeepLinkSerializer(read_only=True)
    
    class Meta:
        model = JobPosting
        fields = [
            'id', 'title', 'company', 'location',
            'description', 'requirements', 'salary_range',
            'external_id', 'external_url', 'source',
            'deep_link', 'is_active', 'is_remote', 'is_featured',
            'category', 'seniority_level', 'employment_type',
            'skills', 'benefits', 'metadata',
            'created_at', 'updated_at', 'expires_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class JobMatchSerializer(serializers.ModelSerializer):
    """Serializer for job matches."""
    
    job_title = serializers.CharField(source='job_posting.title', read_only=True)
    company = serializers.CharField(source='job_posting.company', read_only=True)
    location = serializers.CharField(source='job_posting.location', read_only=True)
    deep_link = DeepLinkSerializer(read_only=True)
    
    class Meta:
        model = JobMatch
        fields = [
            'id', 'user_id', 'resume_id',
            'job_posting', 'job_title', 'company', 'location',
            'deep_link',
            'match_score', 'skills_match', 'experience_match', 'education_match',
            'matched_skills', 'missing_skills', 'match_metadata',
            'is_applied', 'applied_at', 'is_viewed', 'viewed_at',
            'application_status', 'application_notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DeepLinkAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for deep link analytics."""
    
    class Meta:
        model = DeepLinkAnalytics
        fields = [
            'id', 'deep_link', 'date',
            'total_clicks', 'unique_clicks', 'click_rate',
            'by_source', 'by_device', 'by_location',
            'avg_time_on_page', 'interaction_rate',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DeepLinkDomainSerializer(serializers.ModelSerializer):
    """Serializer for deep link domains."""
    
    class Meta:
        model = DeepLinkDomain
        fields = [
            'id', 'domain', 'is_trusted', 'is_active',
            'click_count', 'requires_consent', 'allowed_paths',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DeepLinkRequestSerializer(serializers.Serializer):
    """Serializer for creating a deep link."""
    title = serializers.CharField(max_length=255)
    company = serializers.CharField(max_length=255)
    location = serializers.CharField(max_length=255, required=False)
    original_url = serializers.URLField(max_length=1000)
    source = serializers.CharField(max_length=100, required=False)
    job_id = serializers.CharField(max_length=255, required=False)
    match_score = serializers.FloatField(default=0, min_value=0, max_value=100)


class DeepLinkClickRequestSerializer(serializers.Serializer):
    """Serializer for tracking a click."""
    deep_link_id = serializers.UUIDField()
    consent_given = serializers.BooleanField(default=False)
    time_on_page = serializers.IntegerField(default=0)
    scrolled = serializers.BooleanField(default=False)
    interacted = serializers.BooleanField(default=False)


class JobMatchRequestSerializer(serializers.Serializer):
    """Serializer for job match request."""
    user_id = serializers.UUIDField()
    job_posting_id = serializers.UUIDField(required=False)
    title = serializers.CharField(max_length=255, required=False)
    company = serializers.CharField(max_length=255, required=False)
    original_url = serializers.URLField(required=False)


class DeepLinkStatsSerializer(serializers.Serializer):
    """Serializer for deep link statistics."""
    total_links = serializers.IntegerField()
    total_clicks = serializers.IntegerField()
    unique_clicks = serializers.IntegerField()
    average_match_score = serializers.FloatField()
    click_through_rate = serializers.FloatField()
    top_performing = serializers.ListField()
    by_source = serializers.DictField()
    by_date = serializers.DictField()