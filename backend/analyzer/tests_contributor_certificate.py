"""Unit tests for the Contributor Certificate generator (#963)."""

from unittest.mock import patch, MagicMock
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from analyzer.contributor_views import (
    compute_certificate_id,
    get_contribution_tier,
)


class ContributorCertificateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = "/api/contributor-certificate/"

    def test_compute_certificate_id(self):
        cert_id1 = compute_certificate_id("testuser", "Muskankr/AI-Resume-Analyzer", 3)
        cert_id2 = compute_certificate_id("testuser", "Muskankr/AI-Resume-Analyzer", 3)
        self.assertTrue(cert_id1.startswith("ARA-CONTR-"))
        self.assertEqual(cert_id1, cert_id2)

    def test_get_contribution_tier(self):
        self.assertEqual(get_contribution_tier(1)["tier"], "Bronze Contributor")
        self.assertEqual(get_contribution_tier(3)["tier"], "Silver Contributor")
        self.assertEqual(get_contribution_tier(6)["tier"], "Gold Contributor")
        self.assertEqual(get_contribution_tier(12)["tier"], "Platinum Contributor")

    def test_missing_username_returns_400(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", resp.data)

    def test_invalid_username_characters_returns_400(self):
        resp = self.client.get(self.url, {"username": "invalid user!@#"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid GitHub username format", resp.data["error"])

    @patch("analyzer.contributor_views.requests.get")
    def test_successful_certificate_generation(self, mock_get):
        # Mock user info response
        mock_user_resp = MagicMock()
        mock_user_resp.status_code = 200
        mock_user_resp.json.return_value = {
            "login": "octocat",
            "name": "The Octocat",
            "avatar_url": "https://github.com/octocat.png",
            "bio": "Building open source tools",
        }

        # Mock PR search response
        mock_pr_resp = MagicMock()
        mock_pr_resp.status_code = 200
        mock_pr_resp.json.return_value = {
            "total_count": 3,
            "items": [
                {
                    "number": 962,
                    "title": "Add bio/headline field to profile",
                    "html_url": "https://github.com/Muskankr/AI-Resume-Analyzer/pull/962",
                    "created_at": "2026-08-30T10:00:00Z",
                    "closed_at": "2026-08-31T12:00:00Z",
                },
                {
                    "number": 920,
                    "title": "Optimize resume bullet points",
                    "html_url": "https://github.com/Muskankr/AI-Resume-Analyzer/pull/920",
                    "created_at": "2026-08-15T09:00:00Z",
                    "closed_at": "2026-08-16T11:00:00Z",
                },
                {
                    "number": 880,
                    "title": "Fix ATS score ring visualization",
                    "html_url": "https://github.com/Muskankr/AI-Resume-Analyzer/pull/880",
                    "created_at": "2026-08-01T08:00:00Z",
                    "closed_at": "2026-08-02T10:00:00Z",
                },
            ],
        }

        def side_effect(url, *args, **kwargs):
            if "api.github.com/users/" in url:
                return mock_user_resp
            return mock_pr_resp

        mock_get.side_effect = side_effect

        resp = self.client.get(self.url, {"username": "octocat"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["certificate_id"].startswith("ARA-CONTR-"))
        self.assertEqual(resp.data["contributor"]["name"], "The Octocat")
        self.assertEqual(resp.data["contributor"]["username"], "octocat")
        self.assertEqual(resp.data["statistics"]["merged_prs_count"], 3)
        self.assertEqual(resp.data["statistics"]["tier"], "Silver Contributor")
        self.assertEqual(len(resp.data["pull_requests"]), 3)
        self.assertIn("verification_url", resp.data)

    @patch("analyzer.contributor_views.requests.get")
    def test_non_contributor_returns_404(self, mock_get):
        mock_user_resp = MagicMock()
        mock_user_resp.status_code = 200
        mock_user_resp.json.return_value = {"login": "newbie", "name": "Newbie"}

        mock_pr_resp = MagicMock()
        mock_pr_resp.status_code = 200
        mock_pr_resp.json.return_value = {"total_count": 0, "items": []}

        mock_get.side_effect = lambda url, *args, **kwargs: (
            mock_user_resp if "api.github.com/users/" in url else mock_pr_resp
        )

        resp = self.client.get(self.url, {"username": "newbie"})
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("No merged pull requests found", resp.data["error"])
