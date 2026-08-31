from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from analyzer.models import Skill
from organizations.models import Organization, OrganizationInvitation, OrganizationMembership

User = get_user_model()


class OrganizationFeatureTests(TestCase):
    def test_org_creation_sets_admin_membership(self):
        user = User.objects.create_user(username="alice", email="alice@example.com", password="secret")
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post(
            "/api/v1/organizations/",
            {"name": "Bootcamp 2026", "slug": "bootcamp-2026", "description": "AI cohort"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["name"], "Bootcamp 2026")
        self.assertTrue(Organization.objects.filter(name="Bootcamp 2026").exists())
        self.assertTrue(
            OrganizationMembership.objects.filter(
                organization__slug="bootcamp-2026",
                user=user,
                role=OrganizationMembership.ROLE_ADMIN,
            ).exists()
        )

    def test_org_specific_config_falls_back_to_global(self):
        global_skill = Skill.objects.create(name="Python", org=None)
        org = Organization.objects.create(name="Org", slug="org")

        self.assertEqual(Skill.objects.filter(org=org, name="Python").count(), 0)
        self.assertEqual(Skill.objects.filter(org__isnull=True, name="Python").first(), global_skill)

    def test_aggregate_analytics_omits_member_level_data(self):
        org = Organization.objects.create(name="Org", slug="org")
        admin = User.objects.create_user(username="admin", email="admin@example.com", password="secret")
        member = User.objects.create_user(username="member", email="member@example.com", password="secret")
        OrganizationMembership.objects.create(organization=org, user=admin, role=OrganizationMembership.ROLE_ADMIN, status=OrganizationMembership.STATUS_ACTIVE)
        OrganizationMembership.objects.create(organization=org, user=member, role=OrganizationMembership.ROLE_MEMBER, status=OrganizationMembership.STATUS_ACTIVE)

        client = APIClient()
        client.force_authenticate(user=admin)
        response = client.get(f"/api/v1/organizations/{org.id}/analytics/aggregate/")

        self.assertEqual(response.status_code, 200)
        payload = str(response.data)
        self.assertNotIn("user_id", payload)
        self.assertNotIn("email", payload)
        self.assertNotIn("resume_text", payload)
        self.assertGreaterEqual(response.data["total_members"], 2)

    def test_invite_and_accept_flow(self):
        org = Organization.objects.create(name="Org", slug="org")
        admin = User.objects.create_user(username="admin", email="admin@example.com", password="secret")
        invited = User.objects.create_user(username="invited", email="invited@example.com", password="secret")
        OrganizationMembership.objects.create(organization=org, user=admin, role=OrganizationMembership.ROLE_ADMIN, status=OrganizationMembership.STATUS_ACTIVE)

        invite = OrganizationInvitation.objects.create(
            organization=org,
            email="invited@example.com",
            invited_by=admin,
            token="abc123",
            expires_at=timezone.now() + timedelta(days=7),
        )

        client = APIClient()
        client.force_authenticate(user=invited)
        response = client.post("/api/v1/organizations/accept-invite/", {"token": invite.token}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(OrganizationMembership.objects.filter(organization=org, user=invited).exists())
