"""DRF serializers for the ATS Compatibility Checker."""

from rest_framework import serializers


class ATSCheckItemSerializer(serializers.Serializer):
    check_name = serializers.CharField()
    category = serializers.ChoiceField(choices=["structure", "formatting", "content", "encoding", "keywords"])
    status = serializers.ChoiceField(choices=["pass", "warning", "fail"])
    score = serializers.IntegerField(min_value=0, max_value=100)
    message = serializers.CharField()
    suggestion = serializers.CharField()
    details = serializers.DictField(required=False, allow_null=True)


class ATSCompatibilityResultSerializer(serializers.Serializer):
    overall_score = serializers.IntegerField(min_value=0, max_value=100)
    grade = serializers.CharField()
    checks = ATSCheckItemSerializer(many=True)
    category_scores = serializers.DictField(child=serializers.IntegerField())
    estimated_ats_pass_rate = serializers.IntegerField(min_value=0, max_value=100)
    top_fixes = ATSCheckItemSerializer(many=True)
    summary = serializers.CharField()


class ATSCompatibilityRequestSerializer(serializers.Serializer):
    resume_text = serializers.CharField(max_length=50000)
    analysis_id = serializers.IntegerField(required=False, allow_null=True)
