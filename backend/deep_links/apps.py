"""
Deep Links App Configuration
"""

from django.apps import AppConfig


class DeepLinksConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'deep_links'
    verbose_name = 'Deep Links & Job Postings'
    
    def ready(self):
        """Initialize app when ready."""
        try:
            import deep_links.signals  # noqa
        except ImportError:
            pass