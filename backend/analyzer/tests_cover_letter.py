from unittest.mock import patch
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from .models import ResumeAnalysis
from django.contrib.auth import get_user_model

User = get_user_model()

class CoverLetterGeneratorTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", email="test@example.com", password="password")
        self.client.force_authenticate(user=self.user)
        self.analysis = ResumeAnalysis.objects.create(
            user=self.user,
            resume_text="Software Engineer with 5 years of Python experience.",
            target_role="Software Engineer",
            experience_level="Mid-Level",
            score=85
        )
        self.url = reverse("generate_cover_letter")

    @patch("analyzer.cover_letter_generator.requests.post")
    def test_generate_cover_letter_success(self, mock_post):
        mock_post.return_value.json.return_value = {
            "choices": [{"message": {"content": "Here is a cover letter."}}]
        }
        mock_post.return_value.raise_for_status = lambda: None
        
        # Mock settings so we have an API key for the test
        with patch("analyzer.cover_letter_generator.settings") as mock_settings:
            mock_settings.OPENAI_API_KEY = "test-key"
            mock_settings.LLM_MODEL_NAME = "gpt-4o-mini"
            mock_settings.OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions"
            
            response = self.client.post(self.url, {
                "analysis_id": self.analysis.id,
                "job_description": "We are looking for a Python engineer with 5 years experience."
            })
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIn("draft", response.data)
            self.assertIn("[AI-GENERATED DRAFT - PLEASE REVIEW AND EDIT]", response.data["draft"])

    def test_missing_analysis_id(self):
        response = self.client.post(self.url, {
            "job_description": "We need a Python engineer."
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_missing_job_description(self):
        response = self.client.post(self.url, {
            "analysis_id": self.analysis.id
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
    def test_unauthorized(self):
        self.client.logout()
        response = self.client.post(self.url, {
            "analysis_id": self.analysis.id,
            "job_description": "Valid job description string of at least twenty characters."
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
    def test_other_user_analysis(self):
        other_user = User.objects.create_user(username="other", password="password")
        self.client.force_authenticate(user=other_user)
        response = self.client.post(self.url, {
            "analysis_id": self.analysis.id,
            "job_description": "Valid job description string of at least twenty characters."
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
