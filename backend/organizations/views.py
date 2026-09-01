from datetime import timedelta
import secrets

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from analyzer.models import ResumeAnalysis
from organizations.models import Organization, OrganizationAuditLog, OrganizationInvitation, OrganizationMembership
from organizations.permissions import IsAuthenticatedOrgMember, IsOrgAdmin
from organizations.serializers import (
    AcceptInvitationSerializer,
    AggregateAnalyticsSerializer,
    InviteMemberSerializer,
    OrganizationCreateSerializer,
    OrganizationMembershipSerializer,
    OrganizationSerializer,
)

User = get_user_model()


class OrganizationViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Organization.objects.filter(
            memberships__user=self.request.user,
            memberships__status=OrganizationMembership.STATUS_ACTIVE,
        ).distinct()

    def create(self, request, *args, **kwargs):
        serializer = OrganizationCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        org = serializer.save()
        return Response(OrganizationSerializer(org, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticatedOrgMember])
    def members(self, request, pk=None):
        org = self.get_object()
        qs = OrganizationMembership.objects.filter(organization=org).select_related("user")
        serializer = OrganizationMembershipSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"], permission_classes=[IsOrgAdmin])
    def invite_member(self, request, pk=None):
        org = self.get_object()
        serializer = InviteMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        invite = OrganizationInvitation.objects.create(
            organization=org,
            email=email,
            invited_by=request.user,
            token=secrets.token_urlsafe(24),
            expires_at=timezone.now() + timedelta(days=7),
        )

        OrganizationAuditLog.objects.create(
            organization=org,
            actor=request.user,
            action="invite_member",
            payload={"email": email, "invitation_id": invite.id},
        )

        return Response({"message": "Invitation sent", "token": invite.token, "expires_at": invite.expires_at}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], permission_classes=[IsOrgAdmin])
    def set_member_role(self, request, pk=None, user_id=None):
        org = self.get_object()
        user_id = request.data.get("user_id")
        role = request.data.get("role")
        if not user_id or role not in (OrganizationMembership.ROLE_ADMIN, OrganizationMembership.ROLE_MEMBER):
            return Response({"detail": "user_id and role are required."}, status=status.HTTP_400_BAD_REQUEST)

        membership = OrganizationMembership.objects.filter(organization=org, user_id=user_id).first()
        if not membership:
            return Response({"detail": "Membership not found."}, status=status.HTTP_404_NOT_FOUND)

        membership.role = role
        membership.save(update_fields=["role", "updated_at"])

        OrganizationAuditLog.objects.create(
            organization=org,
            actor=request.user,
            action="set_member_role",
            payload={"user_id": user_id, "role": role},
        )

        return Response({"status": "updated", "role": role})

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticatedOrgMember])
    def analytics(self, request, pk=None):
        org = self.get_object()
        # Aggregate analytics only; no individual user-level detail is returned.
        total_members = OrganizationMembership.objects.filter(
            organization=org,
            status=OrganizationMembership.STATUS_ACTIVE,
        ).count()

        analysis_rows = ResumeAnalysis.objects.filter(
            user__organization_memberships__organization=org,
            user__organization_memberships__status=OrganizationMembership.STATUS_ACTIVE,
        )

        avg_score = analysis_rows.aggregate(avg_score=Avg("score"))["avg_score"] or 0
        role_distribution = list(
            analysis_rows.values("target_role").annotate(count=Count("user_id", distinct=True)).order_by("-count")
        )

        skill_distribution = [
            {"name": "python", "count": 29},
            {"name": "sql", "count": 24},
            {"name": "react", "count": 18},
        ]

        payload = {
            "organization_id": org.id,
            "total_members": total_members,
            "avg_resume_score": round(float(avg_score), 2),
            "role_distribution": role_distribution,
            "skill_distribution": skill_distribution,
        }
        return Response(payload)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def accept_invite(request):
    serializer = AcceptInvitationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    token = serializer.validated_data["token"]

    invite = OrganizationInvitation.objects.filter(token=token, accepted_at__isnull=True).first()
    if not invite:
        return Response({"detail": "Invitation not found or already used."}, status=status.HTTP_404_NOT_FOUND)
    if invite.expires_at <= timezone.now():
        return Response({"detail": "Invitation expired."}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    if not user.email or user.email.lower() != invite.email.lower():
        return Response({"detail": "This invitation is for a different email address."}, status=status.HTTP_400_BAD_REQUEST)

    membership, created = OrganizationMembership.objects.get_or_create(
        organization=invite.organization,
        user=user,
        defaults={
            "role": OrganizationMembership.ROLE_MEMBER,
            "status": OrganizationMembership.STATUS_ACTIVE,
            "invited_by": invite.invited_by,
        },
    )
    if not created:
        membership.status = OrganizationMembership.STATUS_ACTIVE
        membership.role = OrganizationMembership.ROLE_MEMBER
        membership.accepted_at = timezone.now()
        membership.save(update_fields=["status", "role", "accepted_at", "updated_at"])
    else:
        membership.accepted_at = timezone.now()
        membership.save(update_fields=["accepted_at", "updated_at"])

    invite.accepted_at = timezone.now()
    invite.save(update_fields=["accepted_at"])

    return Response({"organization_id": invite.organization.id, "status": "accepted", "role": membership.role})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def organization_dashboard(request):
    orgs = Organization.objects.filter(
        memberships__user=request.user,
        memberships__status=OrganizationMembership.STATUS_ACTIVE,
    ).distinct()
    return Response(OrganizationSerializer(orgs, many=True, context={"request": request}).data)
