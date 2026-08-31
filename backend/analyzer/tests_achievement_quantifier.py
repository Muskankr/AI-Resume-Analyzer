"""Tests for the Resume Achievement Quantifier."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .achievement_quantifier import (
    QuantificationResult,
    _detect_verb,
    _detect_weak_verb,
    _get_suggestions,
    _has_quantification,
    _is_bullet,
    quantify_achievements,
)
from .achievement_quantifier_serializers import (
    QuantificationRequestSerializer,
    QuantificationResultSerializer,
)
from .models import ResumeAnalysis

User = get_user_model()


class IsBulletTests(TestCase):
    def test_dash_bullet(self):
        self.assertTrue(_is_bullet("- Built a dashboard"))

    def test_long_line(self):
        self.assertTrue(_is_bullet("Developed and maintained a production system"))

    def test_short_heading(self):
        self.assertFalse(_is_bullet("Skills"))

    def test_empty(self):
        self.assertFalse(_is_bullet(""))


class HasQuantificationTests(TestCase):
    def test_percentage(self):
        self.assertTrue(_has_quantification("Improved by 30%"))

    def test_dollar(self):
        self.assertTrue(_has_quantification("Saved $50K"))

    def test_none(self):
        self.assertFalse(_has_quantification("Built a web app"))


class DetectVerbTests(TestCase):
    def test_known_verb(self):
        self.assertEqual(_detect_verb("Built a REST API"), "built")

    def test_no_verb(self):
        self.assertIsNone(_detect_verb("The system works well"))


class DetectWeakVerbTests(TestCase):
    def test_responsible_for(self):
        self.assertEqual(_detect_weak_verb("Responsible for managing team"), "responsible for")

    def test_no_weak(self):
        self.assertIsNone(_detect_weak_verb("Led the migration"))


class GetSuggestionsTests(TestCase):
    def test_returns_list(self):
        suggestions = _get_suggestions("performance")
        self.assertIsInstance(suggestions, list)
        self.assertGreater(len(suggestions), 0)

    def test_unknown_category(self):
        suggestions = _get_suggestions("nonexistent")
        self.assertEqual(len(suggestions), 0)


class QuantifyAchievementsTests(TestCase):
    def test_basic(self):
        text = (
            "- Improved API performance\n"
            "- Responsible for managing the team\n"
            "- Reduced latency by 40%\n"
            "- Built a dashboard"
        )
        result = quantify_achievements(text)
        self.assertIsInstance(result, QuantificationResult)
        self.assertEqual(result.total_bullets, 4)
        self.assertEqual(result.quantified_bullets, 1)
        self.assertEqual(result.unquantified_bullets, 3)

    def test_all_quantified(self):
        text = (
            "- Increased revenue by 25%\n"
            "- Saved $50K annually\n"
            "- Reduced errors by 40%"
        )
        result = quantify_achievements(text)
        self.assertEqual(result.quantification_rate, 100.0)

    def test_no_bullets(self):
        result = quantify_achievements("No bullets here")
        self.assertEqual(result.total_bullets, 0)

    def test_quick_wins(self):
        text = (
            "- Built a system\n"
            "- Led the team\n"
            "- Developed features\n"
            "- Reduced costs by 30%"
        )
        result = quantify_achievements(text)
        self.assertGreater(len(result.top_quick_wins), 0)

    def test_summary(self):
        result = quantify_achievements("- Improved performance by 30%")
        self.assertTrue(len(result.summary) > 0)

    def test_as_dict(self):
        result = quantify_achievements("- Built something great")
        d = result.as_dict()
        self.assertIn("total_bullets", d)
        self.assertIn("bullet_analyses", d)


class SerializerTests(TestCase):
    def test_request_valid(self):
        s = QuantificationRequestSerializer(data={"resume_text": "text"})
        self.assertTrue(s.is_valid(), s.errors)

    def test_result_roundtrip(self):
        result = quantify_achievements("- Led the project")
        s = QuantificationResultSerializer(result.as_dict())
        self.assertTrue(s.is_valid(), s.errors)


class QuantifyAchievementsAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = "/api/quantify-achievements/"

    def test_raw_text(self):
        resp = self.client.post(
            self.url,
            {"resume_text": "- Improved performance by 30%\n- Built a dashboard"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("total_bullets", resp.data)

    def test_analysis_id(self):
        user = User.objects.create_user(username="testu", password="pass123")
        analysis = ResumeAnalysis.objects.create(
            user=user, file_name="r.pdf", target_role="Backend",
            score=50, skills_found=[], matched_skills=[], missing_skills=[],
            suggestions=[], resume_text="- Led the team\n- Built API",
        )
        self.client.force_authenticate(user=user)
        resp = self.client.post(self.url, {"analysis_id": analysis.id}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_analysis_not_found(self):
        user = User.objects.create_user(username="testu2", password="pass123")
        self.client.force_authenticate(user=user)
        resp = self.client.post(self.url, {"analysis_id": 999999}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_empty_text(self):
        resp = self.client.post(self.url, {"resume_text": ""}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_input(self):
        resp = self.client.post(self.url, {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
