"""
Reports App Configuration
"""

from django.apps import AppConfig


class ReportsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'reports'
    verbose_name = 'Anonymized Reports'
    
    def ready(self):
        """Initialize app when ready."""
        try:
            import reports.signals  # noqa
        except ImportError:
            pass
        
        # Create default templates
        self._create_default_templates()
    
    def _create_default_templates(self):
        """Create default report templates."""
        try:
            from .models import ReportTemplate, DEFAULT_REPORT_TEMPLATES
            
            for key, template_data in DEFAULT_REPORT_TEMPLATES.items():
                exists = ReportTemplate.objects.filter(
                    template_id=template_data['template_id']
                ).exists()
                if not exists:
                    ReportTemplate.objects.create(**template_data)
        except:
            pass