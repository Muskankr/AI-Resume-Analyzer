"""
Branding Models for White-label Customization
Manages organization branding settings, logos, and themes.
"""

import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError


class OrganizationBranding(models.Model):
    """
    Organization branding settings model.
    Stores all white-label customization settings.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization_id = models.UUIDField(
        db_index=True,
        help_text=_("Reference to the organization this branding belongs to")
    )
    
    # Brand identity
    brand_name = models.CharField(max_length=255, blank=True, null=True)
    tagline = models.CharField(max_length=500, blank=True, null=True)
    
    # Colors - with validation
    color_validator = RegexValidator(
        regex=r'^#[0-9A-Fa-f]{6}$',
        message=_('Color must be a valid hex color code (e.g., #4F46E5)')
    )
    
    primary_color = models.CharField(
        max_length=7, default="#4F46E5", validators=[color_validator]
    )
    secondary_color = models.CharField(
        max_length=7, default="#7C3AED", validators=[color_validator]
    )
    accent_color = models.CharField(
        max_length=7, default="#10B981", validators=[color_validator]
    )
    background_color = models.CharField(
        max_length=7, default="#FFFFFF", validators=[color_validator]
    )
    text_color = models.CharField(
        max_length=7, default="#111827", validators=[color_validator]
    )
    link_color = models.CharField(
        max_length=7, default="#4F46E5", validators=[color_validator]
    )
    
    # Dark mode colors
    dark_primary_color = models.CharField(
        max_length=7, blank=True, null=True, validators=[color_validator]
    )
    dark_secondary_color = models.CharField(
        max_length=7, blank=True, null=True, validators=[color_validator]
    )
    dark_background_color = models.CharField(
        max_length=7, blank=True, null=True, validators=[color_validator]
    )
    dark_text_color = models.CharField(
        max_length=7, blank=True, null=True, validators=[color_validator]
    )
    
    # Fonts
    FONT_CHOICES = [
        ('Inter', 'Inter'), ('Poppins', 'Poppins'), ('Nunito', 'Nunito'),
        ('Quicksand', 'Quicksand'), ('Outfit', 'Outfit'),
        ('IBM Plex Sans', 'IBM Plex Sans'), ('system-ui', 'System UI'),
        ('Roboto', 'Roboto'), ('Open Sans', 'Open Sans'), ('Montserrat', 'Montserrat'),
    ]
    
    primary_font = models.CharField(
        max_length=100, default='Inter', choices=FONT_CHOICES
    )
    secondary_font = models.CharField(max_length=100, default='system-ui')
    font_size = models.CharField(max_length=20, default='16px')
    
    # Logo assets
    logo_url = models.URLField(max_length=500, blank=True, null=True)
    logo_dark_url = models.URLField(max_length=500, blank=True, null=True)
    favicon_url = models.URLField(max_length=500, blank=True, null=True)
    email_logo_url = models.URLField(max_length=500, blank=True, null=True)
    
    # Logo dimensions
    logo_width = models.IntegerField(default=180, validators=[MinValueValidator(50), MaxValueValidator(500)])
    logo_height = models.IntegerField(default=60, validators=[MinValueValidator(20), MaxValueValidator(200)])
    
    # Custom code
    custom_css = models.TextField(blank=True, null=True)
    custom_js = models.TextField(blank=True, null=True)
    
    # Widget settings
    widget_primary_color = models.CharField(
        max_length=7, blank=True, null=True, validators=[color_validator]
    )
    widget_secondary_color = models.CharField(
        max_length=7, blank=True, null=True, validators=[color_validator]
    )
    widget_border_radius = models.CharField(max_length=10, default='8px')
    widget_shadow = models.CharField(max_length=50, default='0 4px 6px -1px rgba(0,0,0,0.1)')
    
    # Email branding
    email_header_color = models.CharField(
        max_length=7, blank=True, null=True, validators=[color_validator]
    )
    email_footer_text = models.CharField(max_length=500, blank=True, null=True)
    
    # Advanced settings
    hide_powered_by = models.BooleanField(default=False)
    enable_custom_domain = models.BooleanField(default=False)
    custom_domain = models.CharField(max_length=255, blank=True, null=True)
    custom_favicon = models.URLField(max_length=500, blank=True, null=True)
    
    # Theme
    THEME_CHOICES = [('light', 'Light'), ('dark', 'Dark'), ('custom', 'Custom')]
    theme_type = models.CharField(max_length=20, default='light', choices=THEME_CHOICES)
    
    # Status
    is_active = models.BooleanField(default=True)
    updated_by = models.UUIDField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'organization_branding'
        indexes = [
            models.Index(fields=['organization_id']),
            models.Index(fields=['is_active']),
        ]
        verbose_name = _("Organization Branding")
        verbose_name_plural = _("Organization Brandings")
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"{self.brand_name or 'Branding'} - {self.organization_id}"
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'organization_id': str(self.organization_id),
            'brand_name': self.brand_name,
            'tagline': self.tagline,
            'primary_color': self.primary_color,
            'secondary_color': self.secondary_color,
            'accent_color': self.accent_color,
            'background_color': self.background_color,
            'text_color': self.text_color,
            'link_color': self.link_color,
            'dark_primary_color': self.dark_primary_color,
            'dark_secondary_color': self.dark_secondary_color,
            'dark_background_color': self.dark_background_color,
            'dark_text_color': self.dark_text_color,
            'primary_font': self.primary_font,
            'secondary_font': self.secondary_font,
            'font_size': self.font_size,
            'logo_url': self.logo_url,
            'logo_dark_url': self.logo_dark_url,
            'favicon_url': self.favicon_url,
            'email_logo_url': self.email_logo_url,
            'logo_width': self.logo_width,
            'logo_height': self.logo_height,
            'custom_css': self.custom_css,
            'custom_js': self.custom_js,
            'widget_primary_color': self.widget_primary_color or self.primary_color,
            'widget_secondary_color': self.widget_secondary_color or self.secondary_color,
            'widget_border_radius': self.widget_border_radius,
            'widget_shadow': self.widget_shadow,
            'email_header_color': self.email_header_color or self.primary_color,
            'email_footer_text': self.email_footer_text,
            'hide_powered_by': self.hide_powered_by,
            'enable_custom_domain': self.enable_custom_domain,
            'custom_domain': self.custom_domain,
            'custom_favicon': self.custom_favicon,
            'theme_type': self.theme_type,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class BrandingAuditLog(models.Model):
    """Audit log for branding changes."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branding_id = models.UUIDField(db_index=True)
    user_id = models.UUIDField(db_index=True)
    action = models.CharField(max_length=50, choices=[
        ('CREATE', 'Created'), ('UPDATE', 'Updated'), ('DELETE', 'Deleted'),
        ('RESET', 'Reset'), ('TEMPLATE_APPLY', 'Template Applied'),
        ('LOGO_UPLOAD', 'Logo Uploaded'),
    ])
    changes = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'branding_audit_log'
        indexes = [
            models.Index(fields=['branding_id']),
            models.Index(fields=['user_id']),
            models.Index(fields=['timestamp']),
        ]
        ordering = ['-timestamp']


# Branding templates
BRANDING_TEMPLATES = {
    "tech": {
        "name": "Tech Startup",
        "description": "Modern tech-focused branding with purple/blue theme",
        "primary_color": "#4F46E5",
        "secondary_color": "#7C3AED",
        "accent_color": "#10B981",
        "background_color": "#FFFFFF",
        "text_color": "#111827",
        "primary_font": "Inter"
    },
    "healthcare": {
        "name": "Healthcare",
        "description": "Clean, calming blue theme for healthcare",
        "primary_color": "#0EA5E9",
        "secondary_color": "#0284C7",
        "accent_color": "#22C55E",
        "background_color": "#F0F9FF",
        "text_color": "#0C4A6E",
        "primary_font": "Nunito"
    },
    "education": {
        "name": "Education",
        "description": "Warm purple theme for educational institutions",
        "primary_color": "#8B5CF6",
        "secondary_color": "#6D28D9",
        "accent_color": "#F59E0B",
        "background_color": "#FAF5FF",
        "text_color": "#4C1D95",
        "primary_font": "Poppins"
    },
    "finance": {
        "name": "Finance",
        "description": "Trustworthy green theme for financial services",
        "primary_color": "#059669",
        "secondary_color": "#047857",
        "accent_color": "#3B82F6",
        "background_color": "#ECFDF5",
        "text_color": "#064E3B",
        "primary_font": "IBM Plex Sans"
    },
    "nonprofit": {
        "name": "Nonprofit",
        "description": "Warm pink/purple theme for nonprofits",
        "primary_color": "#EC4899",
        "secondary_color": "#DB2777",
        "accent_color": "#8B5CF6",
        "background_color": "#FDF2F8",
        "text_color": "#831843",
        "primary_font": "Quicksand"
    },
    "sustainability": {
        "name": "Sustainability",
        "description": "Green theme for eco-friendly organizations",
        "primary_color": "#22C55E",
        "secondary_color": "#16A34A",
        "accent_color": "#06B6D4",
        "background_color": "#F0FDF4",
        "text_color": "#14532D",
        "primary_font": "Outfit"
    },
    "corporate": {
        "name": "Corporate",
        "description": "Professional dark blue theme for corporations",
        "primary_color": "#1E293B",
        "secondary_color": "#475569",
        "accent_color": "#F59E0B",
        "background_color": "#F8FAFC",
        "text_color": "#0F172A",
        "primary_font": "Roboto"
    },
    "creative": {
        "name": "Creative",
        "description": "Vibrant theme for creative agencies",
        "primary_color": "#FF6B6B",
        "secondary_color": "#FF9F43",
        "accent_color": "#A29BFE",
        "background_color": "#FFF5F5",
        "text_color": "#2D3436",
        "primary_font": "Montserrat"
    }
}