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


class ResumeAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeAnalysis
        fields = ("id", "share_id", "file_name", "score", "skills_found", "suggestions",
                  "matched_skills", "missing_skills", "target_role", "created_at", "resume_text")


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
