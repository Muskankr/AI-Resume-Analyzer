"""
Admin Configuration for Reports
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    ReportExport,
    ReportSchedule,
    ReportTemplate,
    ReportAuditLog,
    ReportCache
)


@admin.register(ReportExport)
class ReportExportAdmin(admin.ModelAdmin):
    list_display = ['id', 'organization_id', 'report_type', 'format', 'status', 'created_at']
    list_filter = ['report_type', 'format', 'status', 'created_at']
    search_fields = ['organization_id', 'created_by']
    readonly_fields = ['id', 'created_at', 'completed_at', 'file_size']
    
    def has_add_permission(self, request):
        return False


@admin.register(ReportSchedule)
class ReportScheduleAdmin(admin.ModelAdmin):
    list_display = ['id', 'organization_id', 'report_type', 'frequency', 'is_active', 'next_run']
    list_filter = ['frequency', 'is_active', 'report_type']
    search_fields = ['organization_id', 'recipients']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(ReportTemplate)
class ReportTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'template_id', 'report_type', 'is_active', 'created_at']
    list_filter = ['report_type', 'is_active']
    search_fields = ['name', 'template_id', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(ReportAuditLog)
class ReportAuditLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'organization_id', 'user_id', 'action', 'timestamp']
    list_filter = ['action', 'timestamp']
    search_fields = ['organization_id', 'user_id']
    readonly_fields = ['id', 'timestamp']
    
    def has_add_permission(self, request):
        return False


@admin.register(ReportCache)
class ReportCacheAdmin(admin.ModelAdmin):
    list_display = ['id', 'cache_key', 'expires_at', 'created_at']
    list_filter = ['created_at']
    search_fields = ['cache_key']
    readonly_fields = ['id', 'created_at', 'expires_at']
    
    def has_add_permission(self, request):
        return False