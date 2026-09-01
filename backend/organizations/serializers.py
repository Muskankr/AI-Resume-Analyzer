from rest_framework import serializers

from analyzer.models import Skill as GlobalSkill
from organizations.models import Organization, OrganizationMembership, OrganizationInvitation


class OrganizationSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = ["id", "name", "slug", "description", "role", "member_count"]

    def get_role(self, obj):
        request = self.context.get("request")
        if not request or not getattr(request, "user", None) or not request.user.is_authenticated:
            return None
        membership = OrganizationMembership.objects.filter(
            organization=obj,
            user=request.user,
            status=OrganizationMembership.STATUS_ACTIVE,
        ).first()
        return membership.role if membership else None

    def get_member_count(self, obj):
        return obj.memberships.filter(status=OrganizationMembership.STATUS_ACTIVE).count()


class OrganizationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["name", "slug", "description"]

    def create(self, validated_data):
        request = self.context.get("request")
        org = Organization.objects.create(created_by=request.user, **validated_data)
        OrganizationMembership.objects.create(
            organization=org,
            user=request.user,
            role=OrganizationMembership.ROLE_ADMIN,
            status=OrganizationMembership.STATUS_ACTIVE,
            invited_by=request.user,
        )
        return org


class OrganizationMembershipSerializer(serializers.ModelSerializer):
    email = serializers.SerializerMethodField()

    class Meta:
        model = OrganizationMembership
        fields = ["id", "user", "email", "role", "status", "accepted_at", "created_at"]

    def get_email(self, obj):
        return obj.user.email


class InviteMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()


class AcceptInvitationSerializer(serializers.Serializer):
    token = serializers.CharField()


class OrgCareerTrackSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField()
    slug = serializers.CharField()
    description = serializers.CharField(allow_blank=True, required=False)
    org = serializers.IntegerField(read_only=True)
    is_active = serializers.BooleanField(default=True)


class OrgSkillSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField()
    slug = serializers.CharField()
    description = serializers.CharField(allow_blank=True, required=False)
    org = serializers.IntegerField(read_only=True)
    is_active = serializers.BooleanField(default=True)


class AggregateAnalyticsSerializer(serializers.Serializer):
    organization_id = serializers.IntegerField()
    total_members = serializers.IntegerField()
    avg_resume_score = serializers.FloatField()
    role_distribution = serializers.ListField(child=serializers.DictField())
    skill_distribution = serializers.ListField(child=serializers.DictField())
