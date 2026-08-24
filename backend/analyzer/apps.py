from django.apps import AppConfig


class AnalyzerConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'analyzer'

    def ready(self):
        # ResumeBadge lives in a focused module to keep the large legacy models
        # module untouched. Importing it during app initialization registers the
        # model with Django's app registry.
        from . import badge_models  # noqa: F401
