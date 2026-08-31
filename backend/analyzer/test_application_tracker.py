import json
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, Client
from django.utils import timezone
from rest_framework import status

from .models import ApplicationLog


class ApplicationTrackerAPITestCase(TestCase):
    """Tests for the Job Application Tracker endpoints."""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="trackeruser",
            password="testpass123",
            email="tracker@test.com",
        )
        self.client.force_login(self.user)

        # Create some sample applications
        self.app1 = ApplicationLog.objects.create(
            user=self.user,
            company_name="Acme Corp",
            job_title="Frontend Engineer",
            status="applied",
        )
        self.app2 = ApplicationLog.objects.create(
            user=self.user,
            company_name="TechStart",
            job_title="Backend Developer",
            status="interviewed",
        )
        self.app3 = ApplicationLog.objects.create(
            user=self.user,
            company_name="BigCo",
            job_title="Full Stack Engineer",
            status="offered",
        )

    # ── LIST ──────────────────────────────────────────────────────

    def test_list_applications(self):
        resp = self.client.get("/api/applications/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data["results"]), 3)

    def test_list_filter_by_status(self):
        resp = self.client.get("/api/applications/?status=offered")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data["results"]), 1)
        self.assertEqual(resp.data["results"][0]["company_name"], "BigCo")

    def test_list_unauthenticated(self):
        self.client.logout()
        resp = self.client.get("/api/applications/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_only_own_applications(self):
        other_user = User.objects.create_user(
            username="other", password="pass123"
        )
        ApplicationLog.objects.create(
            user=other_user,
            company_name="OtherCo",
            job_title="Designer",
            status="screening",
        )
        resp = self.client.get("/api/applications/")
        self.assertEqual(len(resp.data["results"]), 3)

    # ── CREATE ────────────────────────────────────────────────────

    def test_create_application(self):
        payload = {
            "company_name": "NewStartup",
            "job_title": "DevOps Engineer",
            "notes": "Referred by John",
        }
        resp = self.client.post(
            "/api/applications/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["company_name"], "NewStartup")
        self.assertEqual(resp.data["status"], "applied")  # default

    def test_create_with_invalid_status(self):
        payload = {
            "company_name": "BadCo",
            "job_title": "Intern",
            "status": "invalid_status",
        }
        resp = self.client.post(
            "/api/applications/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_missing_required_fields(self):
        resp = self.client.post(
            "/api/applications/",
            data=json.dumps({"notes": "missing fields"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # ── DETAIL / PATCH / DELETE ───────────────────────────────────

    def test_get_application_detail(self):
        resp = self.client.get(f"/api/applications/{self.app1.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["company_name"], "Acme Corp")

    def test_get_nonexistent_application(self):
        resp = self.client.get("/api/applications/99999/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_patch_application_status(self):
        resp = self.client.patch(
            f"/api/applications/{self.app1.id}/",
            data=json.dumps({"status": "screening"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.app1.refresh_from_db()
        self.assertEqual(self.app1.status, "screening")

    def test_patch_application_company_name(self):
        resp = self.client.patch(
            f"/api/applications/{self.app2.id}/",
            data=json.dumps({"company_name": "TechStart Inc."}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_delete_application(self):
        resp = self.client.delete(f"/api/applications/{self.app1.id}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            ApplicationLog.objects.filter(id=self.app1.id).exists()
        )

    def test_delete_nonexistent(self):
        resp = self.client.delete("/api/applications/99999/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    # ── STATS ─────────────────────────────────────────────────────

    def test_stats_endpoint(self):
        resp = self.client.get("/api/applications/stats/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data
        self.assertEqual(data["total"], 3)
        self.assertIn("by_status", data)
        self.assertIn("interview_rate", data)
        self.assertIn("offer_rate", data)
        self.assertIn("rejection_rate", data)
        self.assertIn("applications_this_week", data)
        self.assertIn("applications_this_month", data)

    def test_stats_empty_user(self):
        self.client.logout()
        other = User.objects.create_user(username="empty", password="pass")
        self.client.force_login(other)
        resp = self.client.get("/api/applications/stats/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["total"], 0)

    def test_stats_rate_calculation(self):
        """Verify rates are computed from the correct denominators."""
        resp = self.client.get("/api/applications/stats/")
        data = resp.data
        # 1 interviewed, 1 offered out of 3 total
        self.assertAlmostEqual(data["interview_rate"], 33.3, places=1)
        self.assertAlmostEqual(data["offer_rate"], 33.3, places=1)

    # ── PERMISSIONS ───────────────────────────────────────────────

    def test_cannot_access_others_applications(self):
        self.client.logout()
        other = User.objects.create_user(username="spy", password="pass")
        self.client.force_login(other)
        resp = self.client.get(f"/api/applications/{self.app1.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_patch_others_applications(self):
        self.client.logout()
        other = User.objects.create_user(username="spy", password="pass")
        self.client.force_login(other)
        resp = self.client.patch(
            f"/api/applications/{self.app1.id}/",
            data=json.dumps({"company_name": "Hacked"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
