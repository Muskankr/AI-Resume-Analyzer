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
        fields = ("id", "file_name", "score", "skills_found", "suggestions",
                  "matched_skills", "missing_skills", "target_role", "created_at")
