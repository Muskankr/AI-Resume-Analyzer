from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class CheckAvailabilityViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.existing_user = User.objects.create_user(
            username="testuser",
            email="testuser@example.com",
            password="Password123!"
        )

    def test_check_username_available(self):
        response = self.client.get("/api/auth/check-availability/?field=username&value=newuser")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("isAvailable"))
        self.assertEqual(response.data.get("field"), "username")

    def test_check_username_taken(self):
        response = self.client.get("/api/auth/check-availability/?field=username&value=testuser")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data.get("isAvailable"))
        self.assertEqual(response.data.get("field"), "username")

    def test_check_username_case_insensitive_taken(self):
        response = self.client.get("/api/auth/check-availability/?field=username&value=TESTUSER")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data.get("isAvailable"))

    def test_check_email_available(self):
        response = self.client.get("/api/auth/check-availability/?field=email&value=newemail@example.com")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("isAvailable"))
        self.assertEqual(response.data.get("field"), "email")

    def test_check_email_taken(self):
        response = self.client.get("/api/auth/check-availability/?field=email&value=testuser@example.com")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data.get("isAvailable"))
        self.assertEqual(response.data.get("field"), "email")

    def test_check_empty_value(self):
        response = self.client.get("/api/auth/check-availability/?field=username&value=")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("isAvailable"))

    def test_check_invalid_field(self):
        response = self.client.get("/api/auth/check-availability/?field=invalid&value=something")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("isAvailable"))
