from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from analyzer.models import UserProfile


class LoginErrorTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Normal user
        self.user = User.objects.create_user(username="normaluser", password="password123", email="normal@example.com")

        # Locked/inactive user
        self.locked_user = User.objects.create_user(username="lockeduser", password="password123", email="locked@example.com")
        self.locked_user.is_active = False
        self.locked_user.save()

        # Unverified user (profile exists and is_verified=False)
        self.unverified_user = User.objects.create_user(username="unverifieduser", password="password123", email="unverified@example.com")
        profile, _ = UserProfile.objects.get_or_create(user=self.unverified_user)
        # Set is_verified attribute dynamically if the database field does not exist yet on main
        profile.is_verified = False
        profile.save()

    def test_nonexistent_user_returns_generic_error(self):
        resp = self.client.post("/api/auth/login/", {"username": "nonexistent", "password": "password123"})
        self.assertEqual(resp.status_code, 401)
        self.assertIn("No active account found with the given credentials.", resp.data["detail"])
        # Verify no user enumeration: code/username is not leaked
        self.assertNotIn("code", resp.data)

    def test_wrong_password_returns_generic_error(self):
        resp = self.client.post("/api/auth/login/", {"username": "normaluser", "password": "wrongpassword"})
        self.assertEqual(resp.status_code, 401)
        self.assertIn("No active account found with the given credentials.", resp.data["detail"])

    def test_locked_user_returns_locked_error(self):
        resp = self.client.post("/api/auth/login/", {"username": "lockeduser", "password": "password123"})
        self.assertEqual(resp.status_code, 401)
        self.assertIn("locked or deactivated", resp.data["detail"])
        self.assertEqual(resp.data["code"], "account_locked")

    def test_unverified_user_returns_unverified_error(self):
        resp = self.client.post("/api/auth/login/", {"username": "unverifieduser", "password": "password123"})
        self.assertEqual(resp.status_code, 401)
        self.assertIn("not verified", resp.data["detail"])
        self.assertEqual(resp.data["code"], "email_unverified")
        self.assertEqual(resp.data["email"], "unverified@example.com")
