import secrets
import uuid
from datetime import timedelta

from django.conf import settings
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
    partial_skills = models.JSONField(default=list, blank=True)
    missing_skills = models.JSONField(default=list)
    target_role = models.CharField(max_length=100)
    experience_level = models.CharField(max_length=50, default="Mid-Level", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    job_description = models.TextField(blank=True, null=True)
    resume_text = models.TextField(blank=True, null=True)
    cover_letter_text = models.TextField(blank=True, null=True)
    cover_letter_feedback = models.JSONField(blank=True, null=True)
    interview_questions = models.JSONField(blank=True, null=True)
    
    # JD Match features
    job_match_score = models.IntegerField(blank=True, null=True)
    jd_missing_skills = models.JSONField(default=list, blank=True)
    jd_matched_skills = models.JSONField(default=list, blank=True)

    # --- Public sharing ---------------------------------------------------
    #
    # ``share_id`` is still assigned at creation, because it is the row's stable
    # public name and generating it lazily would mean a nullable unique column.
    # What changed is that holding the id is no longer sufficient:
    # :meth:`is_share_live` is now the question the public endpoint asks, and it
    # is false until someone turns sharing on.

    share_id = models.UUIDField(default=uuid.uuid4, unique=True)

    #: Whether the owner has published this analysis. Off by default — an
    #: analysis used to be reachable by anyone who learned its id from the
    #: moment it was created, which is not a decision the owner ever made.
    share_enabled = models.BooleanField(default=False)

    #: When sharing was last turned on or rotated. Shown in the UI so a user
    #: looking at an old analysis can tell how long a link has been live.
    share_created_at = models.DateTimeField(null=True, blank=True)

    #: When the link stops working. Always set while sharing is on — a link with
    #: no end is the state this exists to remove.
    share_expires_at = models.DateTimeField(null=True, blank=True)

    #: Rough traffic counter, so "did anyone actually open this?" has an answer
    #: and an unexpected number is a reason to revoke. Incremented with an F()
    #: expression, so it is a lower bound under concurrency rather than a lie.
    share_view_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at", "-id"]),
            models.Index(fields=["target_role"]),
        ]

    def __str__(self):
        return f"{self.user.username} — {self.file_name} ({self.score}%)"

    def is_share_live(self, at=None):
        """Return ``True`` when the public endpoint should answer for this row.

        Both halves matter. ``share_enabled`` is the owner's decision;
        ``share_expires_at`` is the clock. A row that is enabled but past its
        expiry is not live, and is left alone rather than rewritten — expiry is
        evaluated on read so a revocation never depends on a cleanup job having
        run.
        """
        if not self.share_enabled:
            return False
        if self.share_expires_at is None:
            # Enabled with no expiry should be unreachable — `enable_sharing` is
            # the only way to set the flag and it always sets a date. Treated as
            # not-live rather than trusted, because the failure mode of the
            # other choice is an immortal link.
            return False
        return self.share_expires_at > (at or timezone.now())

    def enable_sharing(self, lifetime_days, rotate=False, at=None):
        """Publish this analysis for ``lifetime_days``, optionally under a new id.

        Args:
            lifetime_days: Life of the link from now. The caller is expected to
                have passed the value through ``sharing.clamp_lifetime_days``.
            rotate: Issue a fresh ``share_id``, which invalidates every copy of
                the previous link. This is the "I sent it to the wrong person"
                button, and it is separate from revoking because the common case
                is wanting a working link, just not *that* one.
            at: Clock override, for tests.

        Returns:
            ``self``, saved.
        """
        now = at or timezone.now()

        if rotate or not self.share_enabled:
            # A link that is off is being turned on, which is a new publication
            # even if the id is unchanged; resetting the counter keeps the
            # number answering "views since I shared it" rather than an
            # all-time total that spans a revocation.
            self.share_view_count = 0
        if rotate:
            self.share_id = uuid.uuid4()

        self.share_enabled = True
        self.share_created_at = now
        self.share_expires_at = now + timedelta(days=lifetime_days)
        self.save(
            update_fields=[
                "share_id",
                "share_enabled",
                "share_created_at",
                "share_expires_at",
                "share_view_count",
            ]
        )
        return self

    def revoke_sharing(self):
        """Turn the link off and clear its expiry.

        The ``share_id`` is deliberately left in place. Re-enabling later should
        be a decision about *whether* to share, not a forced rotation, and
        keeping the id means a user who re-enables does not have to re-send a
        link they already distributed. :meth:`enable_sharing` with
        ``rotate=True`` is there for when they do want a clean break.
        """
        self.share_enabled = False
        self.share_expires_at = None
        self.save(update_fields=["share_enabled", "share_expires_at"])
        return self

    def register_share_view(self):
        """Count one public read, without reading the row back first.

        ``F("share_view_count") + 1`` so two concurrent views cannot both write
        the same number. The in-memory instance is intentionally *not*
        refreshed — the view has no use for the new value, and refreshing would
        cost a second query on the hot path of a public endpoint.
        """
        type(self).objects.filter(pk=self.pk).update(
            share_view_count=models.F("share_view_count") + 1
        )


class BatchUpload(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="batch_uploads", null=True, blank=True)
    status = models.CharField(max_length=50, default="Pending")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    total_files = models.IntegerField(default=0)
    processed_files = models.IntegerField(default=0)
    results = models.JSONField(default=list, blank=True)
    error_message = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"Batch {self.id} ({self.status})"



class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    avatar = models.FileField(upload_to="avatars/", blank=True, null=True)
    weekly_digest_opt_in = models.BooleanField(default=False)
    notification_preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text="Per-channel notification preferences. Missing keys use documented defaults.",
    )

    def __str__(self):
        return f"{self.user.username}'s Profile"


class KnownDevice(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="known_devices")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device_info = models.CharField(max_length=255)
    last_login = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'ip_address', 'device_info')

    def __str__(self):
        return f"{self.user.username} - {self.device_info} ({self.ip_address})"


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


class ApplicationLog(models.Model):
    """
    Model to track job applications and their outcomes for A/B testing resume versions.
    """
    STATUS_CHOICES = [
        ('applied', 'Applied'),
        ('screening', 'Screening'),
        ('interviewed', 'Interviewed'),
        ('rejected', 'Rejected'),
        ('offered', 'Offered'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='application_logs')
    resume_analysis = models.ForeignKey('ResumeAnalysis', on_delete=models.SET_NULL, null=True, related_name='application_logs')
    company_name = models.CharField(max_length=255)
    job_title = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='applied')
    applied_date = models.DateField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-applied_date']
        verbose_name = 'Application Log'
        verbose_name_plural = 'Application Logs'

    def __str__(self):
        return f"{self.job_title} at {self.company_name} - {self.status}"