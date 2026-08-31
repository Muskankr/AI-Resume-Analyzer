"""
Reminders App Configuration
"""

from django.apps import AppConfig


class RemindersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'reminders'
    verbose_name = 'Email Reminders'
    
    def ready(self):
        """Initialize app when ready."""
        try:
            import reminders.signals  # noqa
        except ImportError:
            pass
        
        # Create default templates
        self._create_default_templates()
    
    def _create_default_templates(self):
        """Create default reminder templates."""
        try:
            from .models import ReminderTemplate, DEFAULT_REMINDER_TEMPLATES
            
            for key, template_data in DEFAULT_REMINDER_TEMPLATES.items():
                exists = ReminderTemplate.objects.filter(
                    template_id=template_data['template_id']
                ).exists()
                if not exists:
                    ReminderTemplate.objects.create(**template_data)
        except:
            pass