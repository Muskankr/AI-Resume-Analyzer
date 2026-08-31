"""
Serializers for website generation API
"""

from rest_framework import serializers
from typing import Dict, Any

class WebsiteGenerationSerializer(serializers.Serializer):
    """Serializer for website generation request"""
    
    resume_id = serializers.IntegerField(required=False, help_text="ID of existing resume analysis")
    resume_data = serializers.DictField(required=False, help_text="Resume data to use")
    template = serializers.ChoiceField(
        choices=['minimal', 'modern', 'professional', 'creative'],
        default='minimal',
        help_text="Template to use"
    )
    color_scheme = serializers.ChoiceField(
        choices=['light', 'dark', 'navy', 'teal', 'purple', 'blue', 'slate', 'indigo', 'coral', 'amber'],
        default='light',
        help_text="Color scheme to apply"
    )
    customizations = serializers.DictField(
        required=False,
        default={},
        help_text="Custom CSS/HTML modifications"
    )
    
    def validate(self, data):
        """Validate request data"""
        if not data.get('resume_id') and not data.get('resume_data'):
            raise serializers.ValidationError(
                "Either resume_id or resume_data must be provided"
            )
        
        if data.get('resume_id'):
            # Validate that resume exists
            from analyzer.models import Resume
            try:
                Resume.objects.get(id=data['resume_id'])
            except Resume.DoesNotExist:
                raise serializers.ValidationError(
                    f"Resume with ID {data['resume_id']} not found"
                )
        
        # Validate customizations
        customizations = data.get('customizations', {})
        if customizations:
            from .generators import WebsiteGenerator
            generator = WebsiteGenerator()
            errors = generator.validate_customizations(customizations)
            if errors:
                raise serializers.ValidationError(errors)
        
        return data
    
    def to_representation(self, instance):
        """Format response data"""
        return {
            'success': instance.get('success', False),
            'website_data': instance.get('website_data', {}),
            'metadata': instance.get('metadata', {}),
            'deploy_config': instance.get('deploy_config', {}),
            'error': instance.get('error')
        }

class WebsiteCustomizationSerializer(serializers.Serializer):
    """Serializer for website customizations"""
    
    name = serializers.CharField(required=False, max_length=100)
    title = serializers.CharField(required=False, max_length=100)
    summary = serializers.CharField(required=False, max_length=500)
    skills = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False
    )
    custom_css = serializers.CharField(required=False, max_length=10000)
    custom_html = serializers.CharField(required=False, max_length=5000)

class WebsiteExportSerializer(serializers.Serializer):
    """Serializer for website export options"""
    
    format = serializers.ChoiceField(
        choices=['zip', 'html'],
        default='zip',
        help_text="Export format"
    )
    include_deploy_config = serializers.BooleanField(
        default=True,
        help_text="Include deployment configuration files"
    )
    minify = serializers.BooleanField(
        default=False,
        help_text="Minify output files"
    )