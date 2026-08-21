from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from analyzer.models import UserProfile

User = get_user_model()


class OAuthSocialAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_oauth_rejects_unsupported_provider(self):
        resp = self.client.post(
            "/api/auth/oauth/",
            {"provider": "facebook", "token": "abc"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Unsupported OAuth provider", resp.data["error"])

    def test_oauth_rejects_missing_token(self):
        resp = self.client.post(
            "/api/auth/oauth/",
            {"provider": "google"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("OAuth token or credential is required", resp.data["error"])

    def test_oauth_google_signup_new_user(self):
        resp = self.client.post(
            "/api/auth/oauth/",
            {
                "provider": "google",
                "token": "mock_token",
                "email": "newuser@example.com",
                "name": "New Google User",
                "avatar_url": "https://example.com/avatar.png",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.data)
        self.assertIn("refresh", resp.data)
        self.assertEqual(resp.data["email"], "newuser@example.com")
        self.assertTrue(resp.data["is_new_user"])
        self.assertEqual(resp.data["provider"], "google")

        # Verify user created in DB
        user = User.objects.filter(email="newuser@example.com").first()
        self.assertIsNotNone(user)
        self.assertFalse(user.has_usable_password())
        self.assertTrue(UserProfile.objects.filter(user=user).exists())

    def test_oauth_google_account_linking_existing_user(self):
        existing_user = User.objects.create_user(
            username="existing_dev",
            email="existing@example.com",
            password="OriginalPassword123!",
        )

        resp = self.client.post(
            "/api/auth/oauth/",
            {
                "provider": "google",
                "token": "mock_token",
                "email": "existing@example.com",
                "name": "Existing Dev",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["username"], "existing_dev")
        self.assertFalse(resp.data["is_new_user"])

        # Password remains valid and intact
        existing_user.refresh_from_db()
        self.assertTrue(existing_user.check_password("OriginalPassword123!"))

    def test_oauth_github_signup_and_login(self):
        resp = self.client.post(
            "/api/auth/oauth/",
            {
                "provider": "github",
                "token": "mock_token",
                "email": "octocat@github.com",
                "name": "octocat_coder",
                "avatar_url": "https://github.com/octocat.png",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.data)
        self.assertTrue(resp.data["is_new_user"])
        self.assertEqual(resp.data["provider"], "github")

        # Calling again with same credentials logs in without duplicate user
        resp2 = self.client.post(
            "/api/auth/oauth/",
            {
                "provider": "github",
                "token": "mock_token",
                "email": "octocat@github.com",
                "name": "octocat_coder",
            },
            format="json",
        )
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertFalse(resp2.data["is_new_user"])
        self.assertEqual(resp2.data["username"], resp.data["username"])
