"""Database model for the stable, user-scoped resume score badge."""

import uuid

from django.contrib.auth.models import User
from django.db import models


class ResumeBadge(models.Model):
    """One stable public badge URL per user.

    The current score is deliberately not stored here. The public SVG endpoint
    resolves the user's newest ResumeAnalysis on each request, so one badge URL
    automatically reflects future resume analyses.
    """

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="resume_badge",
    )
    badge_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username}'s resume score badge"
