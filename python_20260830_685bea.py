"""
Core website generation logic
"""

import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from .templates import TemplateEngine
from .utils import WebsiteUtils

logger = logging.getLogger(__name__)

class WebsiteGenerator:
    """Main website generator class"""
    
    def __init__(self):
        self.template_engine = TemplateEngine()
        self.utils = WebsiteUtils()
    
    def generate_website(
        self,
        resume_data: Dict[str, Any],
        template: str = 'minimal',
        color_scheme: str = 'light',
        customizations: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate a personal website from resume data
        
        Args:
            resume_data: Parsed resume data
            template: Template name to use
            color_scheme: Color scheme to apply
            customizations: Custom CSS/HTML modifications
        
        Returns:
            Dictionary containing website files and metadata
        """
        try:
            # Prepare website data
            website_data = self.utils.prepare_website_data(resume_data)
            
            # Apply customizations
            custom_css = None
            custom_html = None
            if customizations:
                custom_css = customizations.get('custom_css')
                custom_html = customizations.get('custom_html')
                
                # Override data with custom values
                if customizations.get('name'):
                    website_data['name'] = customizations['name']
                if customizations.get('title'):
                    website_data['title'] = customizations['title']
                if customizations.get('summary'):
                    website_data['summary'] = customizations['summary']
                if customizations.get('skills'):
                    website_data['skills'] = customizations['skills']
            
            # Generate website bundle
            bundle = self.utils.generate_website_bundle(
                website_data,
                template,
                color_scheme,
                custom_css,
                custom_html
            )
            
            # Generate deployment configs
            deploy_config = self.utils.generate_deploy_config(website_data)
            
            # Prepare response
            return {
                'success': True,
                'website_data': website_data,
                'bundle': bundle,
                'deploy_config': deploy_config,
                'metadata': {
                    'template': template,
                    'color_scheme': color_scheme,
                    'generated_at': datetime.now().isoformat(),
                    'has_customizations': bool(customizations)
                }
            }
        
        except Exception as e:
            logger.error(f"Website generation failed: {str(e)}")
            return {
                'success': False,
                'error': f"Failed to generate website: {str(e)}"
            }
    
    def preview_website(
        self,
        resume_data: Dict[str, Any],
        template: str = 'minimal',
        color_scheme: str = 'light'
    ) -> str:
        """Generate preview HTML for the website"""
        result = self.generate_website(resume_data, template, color_scheme)
        if result.get('success') and result.get('bundle'):
            return result['bundle'].get('index.html', '')
        return '<html><body><h1>Preview generation failed</h1></body></html>'
    
    def get_available_templates(self) -> list:
        """Get list of available templates"""
        return self.template_engine.get_template_options()
    
    def get_available_color_schemes(self) -> list:
        """Get list of available color schemes"""
        return self.template_engine.get_color_scheme_options()
    
    def validate_customizations(self, customizations: Dict[str, Any]) -> Dict[str, Any]:
        """Validate customizations before applying"""
        errors = {}
        
        if customizations.get('custom_css'):
            # Basic CSS validation
            css = customizations['custom_css']
            if len(css) > 10000:
                errors['custom_css'] = 'CSS exceeds maximum length of 10000 characters'
            if '<script' in css.lower() or 'javascript:' in css.lower():
                errors['custom_css'] = 'CSS contains disallowed content'
        
        if customizations.get('custom_html'):
            html = customizations['custom_html']
            if len(html) > 5000:
                errors['custom_html'] = 'HTML exceeds maximum length of 5000 characters'
            if '<script' in html.lower() or 'javascript:' in html.lower():
                errors['custom_html'] = 'HTML contains disallowed content'
        
        return errors