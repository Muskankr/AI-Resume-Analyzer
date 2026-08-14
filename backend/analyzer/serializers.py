from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Resume, ResumeAnalysis


class ResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = "__all__"


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ("username", "password")

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import UserProfile

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        request = self.context.get("request")
        if request and hasattr(request, "data"):
            from .views import CAPTCHA_FAILED_MESSAGE, verify_captcha_token

            # The whole body goes in: verifying a challenge needs the answer
            # the user typed, not just the token it arrived with.
            if not verify_captcha_token(request.data):
                raise serializers.ValidationError(
                    {"captcha_token": [CAPTCHA_FAILED_MESSAGE]}
                )

        data = super().validate(attrs)
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
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
