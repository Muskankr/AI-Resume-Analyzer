"""
Admin Configuration for Deep Links
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    DeepLink,
    DeepLinkClick,
    JobPosting,
    JobMatch,
    DeepLinkAnalytics,
    DeepLinkDomain
)


@admin.register(DeepLink)
class DeepLinkAdmin(admin.ModelAdmin):
    list_display = ['id', 'job_posting_title', 'short_code', 'click_count', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['title', 'short_code', 'original_url']
    readonly_fields = ['id', 'short_code', 'created_at', 'updated_at']
    
    def job_posting_title(self, obj):
        return obj.title[:50]
    job_posting_title.short_description = 'Job Title'


@admin.register(DeepLinkClick)
class DeepLinkClickAdmin(admin.ModelAdmin):
    list_display = ['id', 'deep_link', 'clicked_at', 'ip_address', 'user_agent']
    list_filter = ['clicked_at']
    search_fields = ['deep_link__title', 'ip_address']
    readonly_fields = ['id', 'clicked_at']


@admin.register(JobPosting)
class JobPostingAdmin(admin.ModelAdmin):
    list_display = ['title', 'company', 'location', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at', 'source']
    search_fields = ['title', 'company', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(JobMatch)
class JobMatchAdmin(admin.ModelAdmin):
    list_display = ['user_id', 'job_posting', 'match_score', 'is_applied', 'created_at']
    list_filter = ['is_applied', 'created_at']
    search_fields = ['user_id', 'job_posting__title']
    readonly_fields = ['id', 'created_at']


@admin.register(DeepLinkAnalytics)
class DeepLinkAnalyticsAdmin(admin.ModelAdmin):
    list_display = ['deep_link', 'total_clicks', 'unique_clicks', 'click_rate', 'date']
    list_filter = ['date']
    search_fields = ['deep_link__title']
    readonly_fields = ['id', 'date']


@admin.register(DeepLinkDomain)
class DeepLinkDomainAdmin(admin.ModelAdmin):
    list_display = ['domain', 'is_trusted', 'is_active', 'click_count']
    list_filter = ['is_trusted', 'is_active']
    search_fields = ['domain']
    readonly_fields = ['id', 'created_at', 'updated_at']