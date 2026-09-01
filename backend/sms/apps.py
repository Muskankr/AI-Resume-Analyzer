"""
SMS App Configuration
"""

from django.apps import AppConfig
from django.db.models.signals import post_migrate


class SMSConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'sms'
    verbose_name = 'SMS Notifications'
    
    def ready(self):
        """Initialize app when ready."""
        import sms.signals  # noqa
        self._create_default_templates()
    
    def _create_default_templates(self):
        """Create default SMS templates on startup."""
        try:
            from .models import SMSTemplate, DEFAULT_SMS_TEMPLATES
            
            for key, template_data in DEFAULT_SMS_TEMPLATES.items():
                exists = SMSTemplate.objects.filter(
                    template_id=template_data['template_id']
                ).exists()
                if not exists:
                    SMSTemplate.objects.create(**template_data)
        except:
            pass