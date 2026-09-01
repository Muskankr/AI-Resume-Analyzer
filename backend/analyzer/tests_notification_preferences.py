from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from .models import UserProfile


class NotificationPreferenceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="notification-user",
            email="notification@example.com",
            password="test-password-123",
        )
        self.profile, _ = UserProfile.objects.get_or_create(user=self.user)
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_defaults_are_documented_and_persisted(self):
        self.profile.refresh_from_db()
        self.assertFalse(self.profile.weekly_digest_opt_in)
        self.assertEqual(self.profile.notification_preferences, {})

        response = self.client.get("/api/profile/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["weekly_digest_opt_in"], False)
        self.assertEqual(
            response.data["notification_preferences"],
            {"in_app": True, "browser": False},
        )

    def test_all_notification_preferences_persist(self):
        response = self.client.put(
            "/api/profile/",
            {
                "username": self.user.username,
                "email": self.user.email,
                "weekly_digest_opt_in": True,
                "notification_preferences": {
                    "in_app": False,
                    "browser": True,
                },
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        self.profile.refresh_from_db()
        self.assertTrue(self.profile.weekly_digest_opt_in)
        self.assertEqual(
            self.profile.notification_preferences,
            {"in_app": False, "browser": True},
        )

        response = self.client.get("/api/profile/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["weekly_digest_opt_in"], True)
        self.assertEqual(
            response.data["notification_preferences"],
            {"in_app": False, "browser": True},
        )

    def test_partial_notification_update_keeps_existing_values(self):
        self.profile.notification_preferences = {
            "in_app": False, "browser": True}
        self.profile.save(update_fields=["notification_preferences"])

        response = self.client.put(
            "/api/profile/",
            {
                "username": self.user.username,
                "email": self.user.email,
                "notification_preferences": {"in_app": True},
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.profile.refresh_from_db()
        self.assertEqual(
            self.profile.notification_preferences,
            {"in_app": True, "browser": True},
        )
