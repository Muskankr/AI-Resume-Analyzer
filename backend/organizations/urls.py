from django.urls import path

from organizations.views import OrganizationViewSet, accept_invite, organization_dashboard

urlpatterns = [
    path("organizations/", OrganizationViewSet.as_view({"get": "list", "post": "create"}), name="organizations-list"),
    path("organizations/dashboard/", organization_dashboard, name="organizations-dashboard"),
    path("organizations/accept-invite/", accept_invite, name="accept-invite"),
    path("organizations/<int:pk>/", OrganizationViewSet.as_view({"get": "retrieve"}), name="organizations-detail"),
    path("organizations/<int:pk>/members/", OrganizationViewSet.as_view({"get": "members"}), name="organizations-members"),
    path("organizations/<int:pk>/members/invite/", OrganizationViewSet.as_view({"post": "invite_member"}), name="organizations-invite-member"),
    path("organizations/<int:pk>/members/role/", OrganizationViewSet.as_view({"post": "set_member_role"}), name="organizations-set-member-role"),
    path("organizations/<int:pk>/analytics/aggregate/", OrganizationViewSet.as_view({"get": "analytics"}), name="organizations-analytics"),
]
