from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from .badge_models import ResumeBadge
from .models import ResumeAnalysis


class ResumeScoreBadgeTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="badge-user",
            password="test-password-123",
        )
        self.client = APIClient()

    def create_analysis(self, score):
        return ResumeAnalysis.objects.create(
            user=self.user,
            file_name=f"resume-{score}.pdf",
            score=score,
            skills_found=[],
            suggestions=[],
            matched_skills=[],
            partial_skills=[],
            missing_skills=[],
            target_role="Frontend Developer",
            experience_level="Junior",
        )

    def test_authenticated_endpoint_creates_stable_badge_and_markdown(self):
        self.client.force_authenticate(self.user)

        first = self.client.get("/api/badge/")
        second = self.client.get("/api/badge/")

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.data["badge_id"], second.data["badge_id"])
        self.assertIn("![ATS Score]", first.data["markdown"])
        self.assertIn("/api/badge/", first.data["badge_url"])
        self.assertEqual(ResumeBadge.objects.filter(user=self.user).count(), 1)

    def test_public_badge_requires_no_authentication(self):
        self.create_analysis(85)
        badge = ResumeBadge.objects.create(user=self.user)

        response = self.client.get(f"/api/badge/{badge.badge_id}/svg/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("image/svg+xml", response["Content-Type"])
        self.assertIn("85%", response.content.decode("utf-8"))
        self.assertEqual(
            response["Cache-Control"],
            "no-cache, no-store, must-revalidate",
        )

    def test_same_badge_url_tracks_latest_analysis_score(self):
        first = self.create_analysis(72)
        badge = ResumeBadge.objects.create(user=self.user)

        response_one = self.client.get(f"/api/badge/{badge.badge_id}/svg/")
        self.assertEqual(response_one.status_code, 200)
        self.assertIn("72%", response_one.content.decode("utf-8"))

        self.create_analysis(91)
        response_two = self.client.get(f"/api/badge/{badge.badge_id}/svg/")

        self.assertEqual(response_two.status_code, 200)
        self.assertIn("91%", response_two.content.decode("utf-8"))
        self.assertNotIn("72%", response_two.content.decode("utf-8"))
        self.assertNotEqual(
            first.id,
            ResumeAnalysis.objects.order_by("-created_at", "-id").first().id,
        )

    def test_badge_without_analysis_shows_na(self):
        badge = ResumeBadge.objects.create(user=self.user)

        response = self.client.get(f"/api/badge/{badge.badge_id}/svg/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("N/A", response.content.decode("utf-8"))

    def test_unknown_badge_returns_404(self):
        import uuid

        response = self.client.get(f"/api/badge/{uuid.uuid4()}/svg/")

        self.assertEqual(response.status_code, 404)

    def test_disabled_badge_returns_404(self):
        badge = ResumeBadge.objects.create(user=self.user, enabled=False)

        response = self.client.get(f"/api/badge/{badge.badge_id}/svg/")

        self.assertEqual(response.status_code, 404)

    def test_management_endpoint_requires_authentication(self):
        response = self.client.get("/api/badge/")
        self.assertEqual(response.status_code, 401)
