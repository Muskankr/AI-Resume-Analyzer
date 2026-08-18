from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from drf_spectacular.utils import OpenApiResponse, extend_schema
from .models import Resume, ResumeAnalysis, UserProfile


class ResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = "__all__"


class SignupSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ("username", "email", "password")

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_password(self, value):
        """Run the project's configured password validators.

        ``AUTH_PASSWORD_VALIDATORS`` is set in settings but nothing was calling
        it — ``min_length=6`` here was the only rule in force, and
        ``set_password()`` does not validate. The length, common-password and
        all-numeric checks the project believes it has were dead config on
        every path that sets a password. The reset flow now runs the same
        validators, so the two agree on what is acceptable.
        """
        # Passed in so UserAttributeSimilarityValidator can compare the
        # password against the username being registered.
        candidate = User(username=self.initial_data.get("username") or "")

        try:
            validate_password(value, user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))

        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import UserProfile

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        profile, _ = UserProfile.objects.get_or_create(user=user)
        token['is_verified'] = profile.is_verified
        return token

    def validate(self, attrs):
        request = self.context.get("request")
        if request and hasattr(request, "data"):
            captcha_token = request.data.get("captcha_token") or request.data.get("captcha")
            from .views import verify_captcha_token
            if not verify_captcha_token(captcha_token):
                raise serializers.ValidationError(
                    {"captcha_token": ["CAPTCHA verification failed. Please complete the security challenge."]}
                )

        data = super().validate(attrs)
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        data['username'] = self.user.username
        data['is_verified'] = profile.is_verified

        if profile.avatar:
            if request:
                data["avatar_url"] = request.build_absolute_uri(profile.avatar.url)
            else:
                data["avatar_url"] = profile.avatar.url
        else:
            data["avatar_url"] = None
        return data


class ResumeAnalysisSerializer(serializers.ModelSerializer):
    """Full record, including the extracted text. Used for a single analysis."""

    class Meta:
        model = ResumeAnalysis
        fields = ("id", "share_id", "file_name", "score", "skills_found", "suggestions",
                  "matched_skills", "missing_skills", "target_role", "created_at", "resume_text",
                  "cover_letter_text", "cover_letter_feedback", "interview_questions")


class ResumeAnalysisListSerializer(serializers.ModelSerializer):
    """Slim record for history listings.

    Drops ``resume_text``, ``cover_letter_text``, ``cover_letter_feedback`` and
    ``interview_questions`` — several KB per row that the history sidebar
    fetches and immediately discards. Fetch a single analysis from
    ``/api/history/<id>/`` when the full text is actually needed.
    """

    class Meta:
        model = ResumeAnalysis
        fields = ("id", "share_id", "file_name", "score", "skills_found", "suggestions",
                  "matched_skills", "missing_skills", "target_role", "created_at")

class VersionComparisonSerializer(serializers.Serializer):
    older_id = serializers.IntegerField()
    newer_id = serializers.IntegerField()
    older_label = serializers.CharField()
    newer_label = serializers.CharField()
    older_score = serializers.IntegerField()
    newer_score = serializers.IntegerField()
    score_delta = serializers.IntegerField()
    added_skills = serializers.ListField(child=serializers.CharField())
    removed_skills = serializers.ListField(child=serializers.CharField())
    newly_matched_skills = serializers.ListField(child=serializers.CharField())
    newly_missing_skills = serializers.ListField(child=serializers.CharField())
    still_missing_skills = serializers.ListField(child=serializers.CharField())
    text_diff = serializers.ListField(child=serializers.DictField())
    insights = serializers.ListField(child=serializers.CharField())


class UserProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True, allow_blank=False)
    weekly_digest_opt_in = serializers.BooleanField(required=False, default=False)

    class Meta:
        model = User
        fields = ("username", "email", "weekly_digest_opt_in")

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        ret["weekly_digest_opt_in"] = profile.weekly_digest_opt_in
        return ret

    def update(self, instance, validated_data):
        weekly_digest_opt_in = validated_data.pop("weekly_digest_opt_in", None)
        user = super().update(instance, validated_data)
        if weekly_digest_opt_in is not None:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.weekly_digest_opt_in = weekly_digest_opt_in
            profile.save()
        return user

    def validate_email(self, value):
        user = None
        if "request" in self.context and self.context["request"].user:
            user = self.context["request"].user
        qs = User.objects.filter(email__iexact=value)
        if user:
            qs = qs.exclude(pk=user.pk)
        if qs.exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_username(self, value):
        user = None
        if "request" in self.context and self.context["request"].user:
            user = self.context["request"].user
        qs = User.objects.filter(username__iexact=value)
        if user:
            qs = qs.exclude(pk=user.pk)
        if qs.exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value


from .models import SuggestionFeedback

class SuggestionFeedbackSerializer(serializers.ModelSerializer):
    """Read representation of one stored vote."""

    class Meta:
        model = SuggestionFeedback
        fields = ("id", "analysis", "suggestion_text", "vote", "comment", "updated_at")
        read_only_fields = fields


from .models import Webhook
from .url_safety import UnsafeURLError, assert_url_is_safe


class WebhookSerializer(serializers.ModelSerializer):
    """Read/write representation of a registered webhook.

    ``secret`` is never in the output. It is returned exactly once, by the
    create view, in the response to the POST that generated it — the same
    pattern every webhook provider uses, because a secret that can be re-read
    from a list endpoint is only as protected as the weakest session that can
    reach that endpoint.
    """

    #: Read-only summary of how the last attempt went, so a user can tell a
    #: healthy webhook from one that has been failing since they set it up.
    status = serializers.SerializerMethodField()

    class Meta:
        model = Webhook
        fields = (
            "id",
            "url",
            "description",
            "is_active",
            "created_at",
            "status",
        )
        read_only_fields = ("id", "created_at", "status")

    def get_status(self, obj):
        return {
            "last_delivery_at": (
                obj.last_delivery_at.isoformat() if obj.last_delivery_at else None
            ),
            "last_status_code": obj.last_status_code,
            "last_error": obj.last_error,
            "consecutive_failures": obj.consecutive_failures,
        }

    def validate_url(self, value):
        """Reject anything the fetcher would not be allowed to reach.

        This is the same check the resume-import path runs (#583). Registering
        the URL is the point at which a user can be told *why* it was refused;
        by delivery time the request is in a background task with nobody
        watching, so that check — which also runs, because DNS changes — can
        only log.
        """
        try:
            assert_url_is_safe(value)
        except UnsafeURLError as exc:
            raise serializers.ValidationError(
                "That URL cannot be used as a webhook destination. It must be a "
                "public HTTPS or HTTP address on port 80 or 443 — internal, "
                "loopback and cloud-metadata addresses are not permitted."
            ) from exc
        return value

    def validate(self, attrs):
        """Reject a duplicate before the database constraint has to."""
        user = self.context["request"].user
        url = attrs.get("url", getattr(self.instance, "url", None))

        duplicates = Webhook.objects.filter(user=user, url=url)
        if self.instance is not None:
            duplicates = duplicates.exclude(pk=self.instance.pk)

        if duplicates.exists():
            raise serializers.ValidationError(
                {"url": "You have already registered a webhook for that URL."}
            )

        return attrs
