"""
Branding App Configuration
"""

from django.apps import AppConfig


class BrandingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'branding'
    verbose_name = 'Branding & White-label'
    
    def ready(self):
        """Import signals when app is ready."""
        try:
            import branding.signals  # noqa
        except ImportError:
            pass