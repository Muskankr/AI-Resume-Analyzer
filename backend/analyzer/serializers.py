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
        data = super().validate(attrs)
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        request = self.context.get("request")
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

