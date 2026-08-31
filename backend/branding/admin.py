"""
Admin Configuration for Branding
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import OrganizationBranding, BrandingAuditLog


@admin.register(OrganizationBranding)
class OrganizationBrandingAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'organization_id',
        'brand_name',
        'primary_color',
        'theme_type',
        'is_active',
        'created_at'
    ]
    list_filter = ['theme_type', 'is_active', 'created_at']
    search_fields = ['brand_name', 'organization_id', 'tagline']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Brand Identity', {
            'fields': ('organization_id', 'brand_name', 'tagline')
        }),
        ('Colors', {
            'fields': (
                'primary_color', 'secondary_color', 'accent_color',
                'background_color', 'text_color', 'link_color'
            ),
            'classes': ('wide',)
        }),
        ('Dark Mode Colors', {
            'fields': (
                'dark_primary_color', 'dark_secondary_color',
                'dark_background_color', 'dark_text_color'
            ),
            'classes': ('collapse',)
        }),
        ('Typography', {
            'fields': ('primary_font', 'secondary_font', 'font_size')
        }),
        ('Logos', {
            'fields': (
                'logo_url', 'logo_dark_url', 'favicon_url',
                'email_logo_url', 'logo_width', 'logo_height'
            )
        }),
        ('Widget Settings', {
            'fields': (
                'widget_primary_color', 'widget_secondary_color',
                'widget_border_radius', 'widget_shadow'
            ),
            'classes': ('collapse',)
        }),
        ('Advanced', {
            'fields': (
                'custom_css', 'custom_js', 'hide_powered_by',
                'enable_custom_domain', 'custom_domain', 'custom_favicon'
            ),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('theme_type', 'is_active', 'updated_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def color_preview(self, obj):
        return format_html(
            '<div style="display:flex;gap:4px;">'
            '<span style="display:inline-block;width:20px;height:20px;'
            'background:{};border-radius:4px;border:1px solid #ddd;"></span>'
            '<span style="display:inline-block;width:20px;height:20px;'
            'background:{};border-radius:4px;border:1px solid #ddd;"></span>'
            '<span style="display:inline-block;width:20px;height:20px;'
            'background:{};border-radius:4px;border:1px solid #ddd;"></span>'
            '</div>',
            obj.primary_color, obj.secondary_color, obj.accent_color
        )
    color_preview.short_description = 'Colors'
    
    actions = ['activate_branding', 'deactivate_branding']
    
    def activate_branding(self, request, queryset):
        queryset.update(is_active=True)
    activate_branding.short_description = "Activate selected branding"
    
    def deactivate_branding(self, request, queryset):
        queryset.update(is_active=False)
    deactivate_branding.short_description = "Deactivate selected branding"


@admin.register(BrandingAuditLog)
class BrandingAuditLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'branding_id', 'user_id', 'action', 'timestamp']
    list_filter = ['action', 'timestamp']
    search_fields = ['branding_id', 'user_id']
    readonly_fields = ['id', 'branding_id', 'user_id', 'action', 'changes', 'timestamp']
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False