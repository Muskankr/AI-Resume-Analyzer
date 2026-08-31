"""
Tests for the Resume Content Quality Rewriter.

Covers:
    - Core engine (rewrite_content)
    - Weak verb detection and replacement
    - Passive voice detection
    - Filler phrase detection
    - Missing quantification detection
    - Sentence length checking
    - Quality score computation
    - API endpoint (POST /api/rewrite-content/)
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .content_rewriter import (
    ContentRewriteResult,
    RewriteSuggestion,
    _check_filler_phrases,
    _check_no_quantification,
    _check_passive_voice,
    _check_sentence_length,
    _check_weak_verb,
    _compute_quality_score,
    _has_quantification,
    _is_bullet_line,
    rewrite_content,
)
from .content_rewriter_serializers import (
    ContentRewriteRequestSerializer,
    ContentRewriteResultSerializer,
)
from .models import ResumeAnalysis

User = get_user_model()


# ── Unit tests: helper functions ──────────────────────────────────────────


class IsBulletLineTests(TestCase):
    def test_bullet_with_dash(self):
        self.assertTrue(_is_bullet_line("- Built a REST API"))

    def test_bullet_with_bullet_char(self):
        self.assertTrue(_is_bullet_line("• Developed React components"))

    def test_bullet_with_number(self):
        self.assertTrue(_is_bullet_line("1. Managed a team of 5"))

    def test_long_line_without_marker(self):
        self.assertTrue(_is_bullet_line(
            "Developed and implemented a comprehensive microservices architecture"
        ))

    def test_short_line(self):
        self.assertFalse(_is_bullet_line("Skills"))

    def test_empty_line(self):
        self.assertFalse(_is_bullet_line(""))

    def test_heading(self):
        self.assertFalse(_is_bullet_line("EXPERIENCE"))


class HasQuantificationTests(TestCase):
    def test_percentage(self):
        self.assertTrue(_has_quantification("Improved performance by 30%"))

    def test_dollar_amount(self):
        self.assertTrue(_has_quantification("Managed $500K budget"))

    def test_user_count(self):
        self.assertTrue(_has_quantification("Served 10000 users"))

    def test_no_quantification(self):
        self.assertFalse(_has_quantification("Built a web application"))

    def test_time_saved(self):
        self.assertTrue(_has_quantification("Saved 20 hours weekly"))


# ── Unit tests: individual checkers ──────────────────────────────────────


class WeakVerbTests(TestCase):
    def test_responsible_for(self):
        suggestions = _check_weak_verb("- Responsible for managing a team", 1)
        self.assertEqual(len(suggestions), 1)
        self.assertEqual(suggestions[0].issue_type, "weak_verb")
        self.assertIn("managed", suggestions[0].suggested_text.lower())

    def test_worked_on(self):
        suggestions = _check_weak_verb("- Worked on the frontend", 2)
        self.assertEqual(len(suggestions), 1)
        self.assertIn("developed", suggestions[0].suggested_text.lower())

    def test_no_weak_verb(self):
        suggestions = _check_weak_verb("- Led the migration to Kubernetes", 3)
        self.assertEqual(len(suggestions), 0)

    def test_case_insensitive(self):
        suggestions = _check_weak_verb("- HELPED WITH the deployment", 4)
        self.assertEqual(len(suggestions), 1)


class PassiveVoiceTests(TestCase):
    def test_passive_detected(self):
        suggestions = _check_passive_voice(
            "- The system was developed by the team", 1
        )
        self.assertEqual(len(suggestions), 1)
        self.assertEqual(suggestions[0].issue_type, "passive_voice")

    def test_active_voice(self):
        suggestions = _check_passive_voice(
            "- Developed the system using React", 2
        )
        self.assertEqual(len(suggestions), 0)


class FillerPhraseTests(TestCase):
    def test_various_tasks(self):
        suggestions = _check_filler_phrases(
            "- Handled various tasks related to frontend", 1
        )
        self.assertEqual(len(suggestions), 1)
        self.assertEqual(suggestions[0].issue_type, "filler")

    def test_utilize(self):
        suggestions = _check_filler_phrases(
            "- Utilized Python for data analysis", 2
        )
        self.assertEqual(len(suggestions), 1)
        self.assertEqual(suggestions[0].issue_type, "filler")

    def test_no_filler(self):
        suggestions = _check_filler_phrases(
            "- Built a real-time dashboard with React", 3
        )
        self.assertEqual(len(suggestions), 0)


class NoQuantificationTests(TestCase):
    def test_bullet_without_metrics(self):
        suggestions = _check_no_quantification(
            "- Led the development of a customer-facing portal that served users", 1
        )
        self.assertEqual(len(suggestions), 1)
        self.assertEqual(suggestions[0].issue_type, "no_quantification")

    def test_bullet_with_metrics(self):
        suggestions = _check_no_quantification(
            "- Increased revenue by 25% through optimized pricing", 2
        )
        self.assertEqual(len(suggestions), 0)

    def test_short_line_skipped(self):
        suggestions = _check_no_quantification("- Built API", 3)
        self.assertEqual(len(suggestions), 0)

    def test_non_bullet_skipped(self):
        suggestions = _check_no_quantification("EXPERIENCE", 4)
        self.assertEqual(len(suggestions), 0)


class SentenceLengthTests(TestCase):
    def test_long_line(self):
        line = "- " + "word " * 40
        suggestions = _check_sentence_length(line.strip(), 1)
        self.assertEqual(len(suggestions), 1)
        self.assertEqual(suggestions[0].issue_type, "too_long")

    def test_normal_line(self):
        suggestions = _check_sentence_length(
            "- Built a React dashboard for real-time analytics", 2
        )
        self.assertEqual(len(suggestions), 0)


# ── Unit tests: quality score ────────────────────────────────────────────


class QualityScoreTests(TestCase):
    def test_perfect_score(self):
        score = _compute_quality_score(5, [])
        self.assertEqual(score, 100)

    def test_deductions(self):
        issues = [
            RewriteSuggestion(
                original_text="a", suggested_text="b",
                issue_type="weak_verb", priority="high",
                impact_score=7, explanation="x", line_number=1,
            )
            for _ in range(3)
        ]
        score = _compute_quality_score(10, issues)
        self.assertLess(score, 100)

    def test_no_bullets(self):
        score = _compute_quality_score(0, [])
        self.assertEqual(score, 50)


# ── Integration tests: rewrite_content ──────────────────────────────────


class RewriteContentTests(TestCase):
    def test_basic_analysis(self):
        text = (
            "John Doe\n"
            "EXPERIENCE\n"
            "- Responsible for building web applications\n"
            "- Worked on the frontend team\n"
            "- Developed React components for the dashboard\n"
            "SKILLS\n"
            "Python, JavaScript, React"
        )
        result = rewrite_content(text)
        self.assertIsInstance(result, ContentRewriteResult)
        self.assertGreater(result.bullet_lines_found, 0)
        self.assertGreater(result.issues_found, 0)

    def test_clean_resume(self):
        text = (
            "- Architected a microservices system serving 50K users\n"
            "- Reduced API latency by 40% through caching\n"
            "- Led a team of 6 engineers across 3 projects\n"
            "- Automated deployment pipeline, saving 15 hours weekly"
        )
        result = rewrite_content(text)
        self.assertGreater(result.overall_quality_score, 70)

    def test_summary_generated(self):
        text = "- Responsible for managing projects"
        result = rewrite_content(text)
        self.assertTrue(len(result.summary) > 0)

    def test_top_priority_actions(self):
        text = (
            "- Responsible for building apps\n"
            "- Worked on the frontend\n"
            "- Assisted in deployment\n"
            "- Led the team"
        )
        result = rewrite_content(text)
        self.assertGreater(len(result.top_priority_actions), 0)
        self.assertLessEqual(len(result.top_priority_actions), 5)

    def test_category_counts(self):
        text = (
            "- Responsible for managing\n"
            "- Various tasks completed\n"
            "- Handled daily operations"
        )
        result = rewrite_content(text)
        self.assertIn("weak_verb", result.category_counts)

    def test_as_dict_roundtrip(self):
        text = "- Led the project successfully"
        result = rewrite_content(text)
        d = result.as_dict()
        self.assertIn("suggestions", d)
        self.assertIn("overall_quality_score", d)


# ── Serializer tests ──────────────────────────────────────────────────────


class SerializerTests(TestCase):
    def test_request_serializer_valid(self):
        s = ContentRewriteRequestSerializer(data={"resume_text": "Some text"})
        self.assertTrue(s.is_valid(), s.errors)

    def test_request_serializer_analysis_id(self):
        s = ContentRewriteRequestSerializer(
            data={"analysis_id": 1, "resume_text": "text"}
        )
        self.assertTrue(s.is_valid(), s.errors)

    def test_result_serializer_roundtrip(self):
        result = rewrite_content("- Led the project")
        s = ContentRewriteResultSerializer(result.as_dict())
        self.assertTrue(s.is_valid(), s.errors)


# ── API endpoint tests ────────────────────────────────────────────────────


class RewriteContentAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = "/api/rewrite-content/"

    def test_raw_text_success(self):
        resp = self.client.post(
            self.url,
            {
                "resume_text": (
                    "EXPERIENCE\n"
                    "- Responsible for building web apps\n"
                    "- Worked on the frontend\n"
                    "- Developed React components"
                )
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("suggestions", resp.data)
        self.assertIn("overall_quality_score", resp.data)

    def test_analysis_id_success(self):
        user = User.objects.create_user(
            username="testuser", password="testpass123"
        )
        analysis = ResumeAnalysis.objects.create(
            user=user,
            file_name="resume.pdf",
            target_role="Frontend Developer",
            experience_level="Mid-Level",
            score=55,
            skills_found=["react"],
            matched_skills=["react"],
            missing_skills=["typescript"],
            suggestions=[],
            resume_text="- Responsible for building apps\n- Worked on frontend",
        )
        self.client.force_authenticate(user=user)
        resp = self.client.post(
            self.url, {"analysis_id": analysis.id}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("suggestions", resp.data)

    def test_analysis_id_not_found(self):
        user = User.objects.create_user(
            username="testuser2", password="testpass123"
        )
        self.client.force_authenticate(user=user)
        resp = self.client.post(
            self.url, {"analysis_id": 999999}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_analysis_id_other_user(self):
        owner = User.objects.create_user(
            username="owner", password="pass123"
        )
        other = User.objects.create_user(
            username="other", password="pass123"
        )
        analysis = ResumeAnalysis.objects.create(
            user=owner,
            file_name="resume.pdf",
            target_role="Backend Developer",
            experience_level="Senior",
            score=40,
            skills_found=[],
            matched_skills=[],
            missing_skills=[],
            suggestions=[],
            resume_text="- Led the team",
        )
        self.client.force_authenticate(user=other)
        resp = self.client.post(
            self.url, {"analysis_id": analysis.id}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_empty_text_returns_400(self):
        resp = self.client.post(
            self.url, {"resume_text": ""}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_input_returns_400(self):
        resp = self.client.post(self.url, {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
