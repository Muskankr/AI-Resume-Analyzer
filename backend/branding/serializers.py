"""
Branding Serializers for API
Handles validation and serialization of branding data.
"""

from rest_framework import serializers
from rest_framework.exceptions import ValidationError
import re

from .models import OrganizationBranding, BrandingAuditLog, BRANDING_TEMPLATES


class BrandingSerializer(serializers.ModelSerializer):
    """
    Serializer for OrganizationBranding model.
    """
    
    template_name = serializers.CharField(required=False, write_only=True)
    
    class Meta:
        model = OrganizationBranding
        fields = [
            'id', 'organization_id', 'brand_name', 'tagline',
            'primary_color', 'secondary_color', 'accent_color',
            'background_color', 'text_color', 'link_color',
            'dark_primary_color', 'dark_secondary_color',
            'dark_background_color', 'dark_text_color',
            'primary_font', 'secondary_font', 'font_size',
            'logo_url', 'logo_dark_url', 'favicon_url', 'email_logo_url',
            'logo_width', 'logo_height',
            'custom_css', 'custom_js',
            'widget_primary_color', 'widget_secondary_color',
            'widget_border_radius', 'widget_shadow',
            'email_header_color', 'email_footer_text',
            'hide_powered_by', 'enable_custom_domain',
            'custom_domain', 'custom_favicon',
            'theme_type', 'is_active',
            'template_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_primary_color(self, value):
        if value and not re.match(r'^#[0-9A-Fa-f]{6}$', value):
            raise ValidationError('Color must be a valid hex color code (e.g., #4F46E5)')
        return value
    
    def validate_font_size(self, value):
        if value and not re.match(r'^\d+(\.\d+)?(px|rem|em|%)$', value):
            raise ValidationError('Font size must include unit (e.g., 16px, 1rem)')
        return value
    
    def validate(self, data):
        if data.get('enable_custom_domain') and not data.get('custom_domain'):
            raise ValidationError({
                'custom_domain': 'Custom domain is required when custom domain is enabled'
            })
        
        if data.get('template_name'):
            template = BRANDING_TEMPLATES.get(data['template_name'])
            if template:
                data.pop('template_name')
                for key, value in template.items():
                    if key not in data or data.get(key) is None:
                        data[key] = value
            else:
                raise ValidationError({
                    'template_name': f"Template '{data['template_name']}' not found"
                })
        
        return data


class BrandingAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = BrandingAuditLog
        fields = ['id', 'branding_id', 'user_id', 'action', 'changes', 'timestamp']
        read_only_fields = ['id', 'timestamp']


class LogoUploadSerializer(serializers.Serializer):
    logo_type = serializers.ChoiceField(
        choices=['primary', 'dark', 'favicon', 'email'],
        default='primary'
    )
    file = serializers.FileField()
    
    def validate_file(self, value):
        if value.size > 5 * 1024 * 1024:
            raise ValidationError('File size exceeds 5MB limit')
        
        allowed_types = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/gif', 'image/webp']
        if value.content_type not in allowed_types:
            raise ValidationError(f'Unsupported file type: {value.content_type}')
        
        return value