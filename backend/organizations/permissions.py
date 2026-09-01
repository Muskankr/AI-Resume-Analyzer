from rest_framework.permissions import BasePermission

from organizations.models import OrganizationMembership


class IsAuthenticatedOrgMember(BasePermission):
    message = "You must be an active member of this organization."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        org = getattr(request, "org", None)
        if not org:
            return False
        return OrganizationMembership.objects.filter(
            organization=org,
            user=request.user,
            status=OrganizationMembership.STATUS_ACTIVE,
        ).exists()


class IsOrgAdmin(BasePermission):
    message = "Organization administrators only."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        org = getattr(request, "org", None)
        if not org:
            return False
        return OrganizationMembership.objects.filter(
            organization=org,
            user=request.user,
            role=OrganizationMembership.ROLE_ADMIN,
            status=OrganizationMembership.STATUS_ACTIVE,
        ).exists()
