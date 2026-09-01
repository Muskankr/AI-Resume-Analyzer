"""Unit tests for Pro Tier & Subscription features (#992)."""

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from analyzer.models import UserProfile, ResumeAnalysis
from analyzer.pro_tier_views import PRO_TIER_MATRIX


class ProTierSubscriptionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="tieruser",
            email="tieruser@example.com",
            password="Password123!",
        )
        self.client.force_authenticate(user=self.user)
        self.url = "/api/account/tier/"

    def test_default_tier_is_free(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        self.assertEqual(profile.tier, "free")

    def test_get_account_tier(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["current_tier"], "free")
        self.assertIn("matrix", resp.data)
        self.assertIn("free", resp.data["matrix"])
        self.assertIn("pro", resp.data["matrix"])

    def test_upgrade_to_pro_tier(self):
        resp = self.client.post(self.url, {"tier": "pro"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["current_tier"], "pro")

        profile = UserProfile.objects.get(user=self.user)
        self.assertEqual(profile.tier, "pro")

    def test_downgrade_to_free_tier(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        profile.tier = "pro"
        profile.save()

        resp = self.client.post(self.url, {"tier": "free"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["current_tier"], "free")

        profile.refresh_from_db()
        self.assertEqual(profile.tier, "free")

    def test_invalid_tier_returns_400(self):
        resp = self.client.post(self.url, {"tier": "ultra_super"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid tier selection", resp.data["error"])

    def test_history_limit_free_vs_pro(self):
        # Create 12 history items
        for i in range(12):
            ResumeAnalysis.objects.create(
                user=self.user,
                file_name=f"resume_{i}.pdf",
                score=70 + i,
                skills_found=["Python", "Django"],
            )

        # Free tier gets max 10 items
        resp_free = self.client.get("/api/history/")
        self.assertEqual(resp_free.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_free.data), 10)

        # Upgrade to Pro
        self.client.post(self.url, {"tier": "pro"}, format="json")

        # Pro tier gets all 12 items
        resp_pro = self.client.get("/api/history/")
        self.assertEqual(resp_pro.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_pro.data), 12)
