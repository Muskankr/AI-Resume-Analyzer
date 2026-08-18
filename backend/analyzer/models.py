import secrets
import uuid

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class Resume(models.Model):
    file = models.FileField(upload_to="resumes/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return str(self.id)


class ResumeAnalysis(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="analyses")
    file_name = models.CharField(max_length=255)
    score = models.IntegerField()
    skills_found = models.JSONField(default=list)
    suggestions = models.JSONField(default=list)
    matched_skills = models.JSONField(default=list)
    missing_skills = models.JSONField(default=list)
    target_role = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    job_description = models.TextField(blank=True, null=True)
    resume_text = models.TextField(blank=True, null=True)
    share_id = models.UUIDField(default=uuid.uuid4, unique=True)
    cover_letter_text = models.TextField(blank=True, null=True)
    cover_letter_feedback = models.JSONField(blank=True, null=True)
    interview_questions = models.JSONField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} — {self.file_name} ({self.score}%)"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    is_verified = models.BooleanField(default=False)
    avatar = models.FileField(upload_to="avatars/", blank=True, null=True)
    weekly_digest_opt_in = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username}'s Profile (Verified: {self.is_verified})"


def generate_webhook_secret():
    """Return a fresh signing secret for a webhook.

    ``token_hex(32)`` gives 64 hex characters from 256 bits of entropy, which
    matches the ``max_length`` on the field below.
    """
    return secrets.token_hex(32)


class Webhook(models.Model):
    """An HTTP endpoint a user has asked us to notify.

    Deliveries are signed. Each webhook carries its own :attr:`secret`, and
    every request is sent with an HMAC-SHA256 of the exact body it is carrying,
    so a receiver can tell a genuine delivery from anyone who has learned the
    URL. Without that the URL itself is the only credential, and URLs leak —
    into logs, proxies and bug reports.

    The delivery bookkeeping fields exist because a webhook that has quietly
    stopped working is indistinguishable from one that has had nothing to
    report. Recording the last outcome lets the API answer "is this working?".
    """

    #: The one event that exists today. Named rather than free-form so a
    #: receiver can switch on it, and so adding a second event later does not
    #: change the shape of the payload for the first.
    EVENT_ANALYSIS_COMPLETED = "resume_analysis.completed"
    EVENT_PING = "ping"

    #: Consecutive failures before the webhook is switched off. An endpoint that
    #: has been failing this long is almost always gone for good, and retrying
    #: forever means every future analysis pays for it.
    MAX_CONSECUTIVE_FAILURES = 10

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="webhooks")
    url = models.URLField(max_length=500)
    #: Free-text label so a user with several webhooks can tell them apart.
    description = models.CharField(max_length=120, blank=True, default="")
    secret = models.CharField(max_length=64, default=generate_webhook_secret)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    #: Outcome of the most recent delivery attempt.
    last_delivery_at = models.DateTimeField(null=True, blank=True)
    last_status_code = models.IntegerField(null=True, blank=True)
    last_error = models.CharField(max_length=255, blank=True, default="")
    consecutive_failures = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            # The same endpoint registered twice would just get every event
            # twice. Scoped to the user: two people may legitimately point at
            # the same collector.
            models.UniqueConstraint(
                fields=["user", "url"], name="unique_webhook_url_per_user"
            )
        ]

    def __str__(self):
        return f"{self.user.username} - {self.url}"

    def record_success(self, status_code):
        """Note a delivery that the receiver accepted."""
        self.last_delivery_at = timezone.now()
        self.last_status_code = status_code
        self.last_error = ""
        self.consecutive_failures = 0
        self.save(
            update_fields=[
                "last_delivery_at",
                "last_status_code",
                "last_error",
                "consecutive_failures",
            ]
        )

    def record_failure(self, error, status_code=None):
        """Note a delivery that did not land, disabling the hook if it keeps up."""
        self.last_delivery_at = timezone.now()
        self.last_status_code = status_code
        # Truncated rather than rejected: the message is diagnostic, and a long
        # one from a misbehaving server should not fail the write that records
        # the misbehaviour.
        self.last_error = str(error)[:255]
        self.consecutive_failures += 1

        fields = [
            "last_delivery_at",
            "last_status_code",
            "last_error",
            "consecutive_failures",
        ]

        if self.consecutive_failures >= self.MAX_CONSECUTIVE_FAILURES:
            self.is_active = False
            fields.append("is_active")

        self.save(update_fields=fields)


class SuggestionFeedback(models.Model):
    """A user's up/down vote on one suggestion from one of their analyses.

    Suggestions are generated from a template, so votes are the only signal
    available for whether the recommendations are worth reading. One row per
    (user, analysis, suggestion): voting again updates the existing row rather
    than stacking duplicates.
    """

    UP = "up"
    DOWN = "down"
    VOTE_CHOICES = [(UP, "Helpful"), (DOWN, "Not helpful")]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="suggestion_feedback"
    )
    analysis = models.ForeignKey(
        ResumeAnalysis, on_delete=models.CASCADE, related_name="suggestion_feedback"
    )
    suggestion_text = models.TextField()
    #: SHA-256 of the suggestion text. The uniqueness constraint keys on this
    #: rather than the text itself, because databases limit how many bytes an
    #: index entry may hold and suggestions have no length bound.
    suggestion_hash = models.CharField(max_length=64, db_index=True)
    vote = models.CharField(max_length=4, choices=VOTE_CHOICES)
    comment = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "analysis", "suggestion_hash"],
                name="unique_feedback_per_suggestion",
            )
        ]

    @staticmethod
    def hash_suggestion(text: str) -> str:
        import hashlib

        return hashlib.sha256((text or "").strip().encode("utf-8")).hexdigest()

    def save(self, *args, **kwargs):
        # Keep the hash in step with the text no matter who writes the row.
        self.suggestion_hash = self.hash_suggestion(self.suggestion_text)
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username} voted {self.vote} on \"{self.suggestion_text[:40]}\""


class Skill(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Role(models.Model):
    name = models.CharField(max_length=100, unique=True)
    skills = models.ManyToManyField(Skill, related_name="roles")

    def __str__(self):
        return self.name


from django.db.models.signals import post_save, post_delete, m2m_changed
from django.dispatch import receiver
from django.core.cache import cache

@receiver([post_save, post_delete], sender=Role)
@receiver([post_save, post_delete], sender=Skill)
def invalidate_role_skills_cache(sender, **kwargs):
    cache.delete("role_skills_dict")

@receiver(m2m_changed, sender=Role.skills.through)
def invalidate_m2m_cache(sender, **kwargs):
    cache.delete("role_skills_dict")

