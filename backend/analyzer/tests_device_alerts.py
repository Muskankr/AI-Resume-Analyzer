from django.core import mail
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from analyzer.models import KnownDevice


class KnownDeviceAlertsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="alertsuser", password="password123", email="alerts@example.com")

    def test_first_login_registered_silently(self):
        # Verify no known devices exist initially
        self.assertEqual(KnownDevice.objects.filter(user=self.user).count(), 0)

        # Login
        resp = self.client.post("/api/auth/login/", {
            "username": "alertsuser",
            "password": "password123",
            "captcha_token": "test-captcha-token",
        }, HTTP_USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0", REMOTE_ADDR="127.0.0.1")

        self.assertEqual(resp.status_code, 200)
        # Check KnownDevice was created
        self.assertEqual(KnownDevice.objects.filter(user=self.user).count(), 1)
        # Verify NO email was sent
        self.assertEqual(len(mail.outbox), 0)

    def test_subsequent_login_same_device_no_alert(self):
        # Register first device silently
        KnownDevice.objects.create(
            user=self.user,
            ip_address="127.0.0.1",
            device_info="Chrome on Windows"
        )

        # Login again from same IP/UA
        resp = self.client.post("/api/auth/login/", {
            "username": "alertsuser",
            "password": "password123",
            "captcha_token": "test-captcha-token",
        }, HTTP_USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", REMOTE_ADDR="127.0.0.1")

        self.assertEqual(resp.status_code, 200)
        # Verify still 1 known device and no emails sent
        self.assertEqual(KnownDevice.objects.filter(user=self.user).count(), 1)
        self.assertEqual(len(mail.outbox), 0)

    def test_new_device_login_sends_email_alert(self):
        # Register first device silently
        KnownDevice.objects.create(
            user=self.user,
            ip_address="127.0.0.1",
            device_info="Chrome on Windows"
        )

        # Login from a new UA (Firefox on macOS)
        resp = self.client.post("/api/auth/login/", {
            "username": "alertsuser",
            "password": "password123",
            "captcha_token": "test-captcha-token",
        }, HTTP_USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15) Firefox/120.0", REMOTE_ADDR="127.0.0.1")

        self.assertEqual(resp.status_code, 200)
        # Verify 2 known devices exist now
        self.assertEqual(KnownDevice.objects.filter(user=self.user).count(), 2)
        # Verify email was sent!
        self.assertEqual(len(mail.outbox), 1)

        # Verify email contents
        email = mail.outbox[0]
        self.assertEqual(email.to, ["alerts@example.com"])
        self.assertIn("Security Alert", email.subject)
        self.assertIn("Firefox on macOS", email.body)
        self.assertIn("/reset-password/", email.body)

    def test_new_location_login_sends_email_alert(self):
        # Register first device silently
        KnownDevice.objects.create(
            user=self.user,
            ip_address="127.0.0.1",
            device_info="Chrome on Windows"
        )

        # Login from a new IP (simulating new location)
        resp = self.client.post("/api/auth/login/", {
            "username": "alertsuser",
            "password": "password123",
            "captcha_token": "test-captcha-token",
        }, HTTP_USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0", REMOTE_ADDR="192.168.1.50")

        self.assertEqual(resp.status_code, 200)
        # Verify 2 known devices exist now
        self.assertEqual(KnownDevice.objects.filter(user=self.user).count(), 2)
        # Verify email was sent!
        self.assertEqual(len(mail.outbox), 1)

        # Verify email contents
        email = mail.outbox[0]
        self.assertEqual(email.to, ["alerts@example.com"])
        self.assertIn("Security Alert", email.subject)
        self.assertIn("192.168.1.50", email.body)
        self.assertIn("/reset-password/", email.body)
