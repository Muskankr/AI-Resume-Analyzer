from django.shortcuts import get_object_or_404

from organizations.models import Organization, OrganizationMembership


class OrganizationContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.org = None
        request.user_org_membership = None

        if not request.user.is_authenticated:
            return self.get_response(request)

        org_id = request.resolver_match.kwargs.get("org_id") if request.resolver_match else None
        if org_id:
            org = get_object_or_404(Organization, id=org_id)
            request.org = org
            request.user_org_membership = OrganizationMembership.objects.filter(
                organization=org,
                user=request.user,
                status=OrganizationMembership.STATUS_ACTIVE,
            ).first()

        return self.get_response(request)
