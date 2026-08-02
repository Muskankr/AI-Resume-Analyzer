from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
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
    class Meta:
        model = ResumeAnalysis
        fields = ("id", "share_id", "file_name", "score", "skills_found", "suggestions",
                  "matched_skills", "missing_skills", "target_role", "created_at", "resume_text",
                  "cover_letter_text", "cover_letter_feedback", "interview_questions")


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

    class Meta:
        model = User
        fields = ("username", "email")

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

