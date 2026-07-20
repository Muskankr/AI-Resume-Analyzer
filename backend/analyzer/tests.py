"""Unit tests for the backend analysis pipeline (``analyzer.services.analyze_resume``).

These tests exercise the pure scoring/skill-matching logic without needing a
real PDF or a database: ``pdfplumber.open`` is mocked to return a fake
PDF whose pages yield the text we control, and the persistence branch is
mocked so no ``ResumeAnalysis`` row is ever written.
"""

from types import SimpleNamespace
from unittest.mock import patch

from django.test import TestCase

from analyzer.services import analyze_resume


class _FakePage:
    """Mimics a ``pdfplumber`` page object."""

    def __init__(self, text: str):
        self._text = text

    def extract_text(self):
        return self._text


class _FakePDF:
    """Mimics the object returned by ``pdfplumber.open(...)``."""

    def __init__(self, text: str):
        self.pages = [_FakePage(text)]

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def _fake_pdf(text: str) -> _FakePDF:
    """Build a fake ``pdfplumber.open`` return value from raw text."""
    return _FakePDF(text)


class AnalyzeResumeTests(TestCase):
    @patch("analyzer.services.pdfplumber.open")
    def test_detects_known_skills(self, mock_open):
        mock_open.return_value = _fake_pdf(
            "Experienced with Python, Django, React and JavaScript."
        )
        result = analyze_resume("dummy.pdf", "Frontend Developer")

        detected = {s.lower() for s in result["skills_found"]}
        self.assertIn("python", detected)
        self.assertIn("django", detected)
        self.assertIn("react", detected)
        self.assertIn("javascript", detected)

    @patch("analyzer.services.pdfplumber.open")
    def test_role_match_and_missing(self, mock_open):
        # The "Frontend Developer" role requires 8 skills; we only supply 3.
        mock_open.return_value = _fake_pdf("HTML CSS JavaScript")
        result = analyze_resume("dummy.pdf", "Frontend Developer")

        self.assertIn("html", result["matched_skills"])
        self.assertIn("css", result["matched_skills"])
        self.assertIn("javascript", result["matched_skills"])
        self.assertIn("react", result["missing_skills"])
        self.assertIn("git", result["missing_skills"])
        # score = matched / required * 100 -> 3 / 8 * 100 = 37
        self.assertEqual(result["score"], 3 * 100 // 8)

    @patch("analyzer.services.pdfplumber.open")
    def test_suggestions_generated_for_missing(self, mock_open):
        mock_open.return_value = _fake_pdf("HTML CSS JavaScript")
        result = analyze_resume("dummy.pdf", "Frontend Developer")

        self.assertEqual(len(result["suggestions"]), len(result["missing_skills"]))
        self.assertTrue(
            all(
                skill.title() in suggestion
                for skill, suggestion in zip(
                    result["missing_skills"], result["suggestions"]
                )
            )
        )

    @patch("analyzer.services.pdfplumber.open")
    def test_empty_text_yields_zero_score(self, mock_open):
        mock_open.return_value = _fake_pdf("")
        result = analyze_resume("dummy.pdf", "Backend Developer")

        # No text -> no detected skills and a 0 score...
        self.assertEqual(result["skills_found"], [])
        self.assertEqual(result["score"], 0)
        # ...but every role skill is now "missing", so suggestions are generated
        # for all of them (the resume is empty, nothing matches).
        self.assertEqual(len(result["missing_skills"]), 8)
        self.assertEqual(
            result["suggestions"],
            [
                "Add projects or experience with " + skill.title()
                for skill in result["missing_skills"]
            ],
        )

    @patch("analyzer.services.pdfplumber.open")
    def test_unknown_role_uses_detected_count(self, mock_open):
        # An unknown role falls back to scoring by detected-skill count:
        # score = min(len(detected) * 10, 100).
        mock_open.return_value = _fake_pdf("Python SQL Excel")
        result = analyze_resume("dummy.pdf", "Some Unknown Role")

        self.assertEqual(
            result["score"],
            min(len(result["skills_found"]) * 10, 100),
        )
        self.assertEqual(result["target_role"], "Some Unknown Role")

    @patch("analyzer.services.pdfplumber.open")
    def test_job_description_comparison_is_reported(self, mock_open):
        mock_open.return_value = _fake_pdf("Experienced with Python and Django.")
        result = analyze_resume(
            "dummy.pdf",
            "Frontend Developer",
            job_description="Need Python, React, and Django experience.",
        )

        self.assertEqual(result["jd_matching_skills"], ["python", "django"])
        self.assertEqual(result["jd_missing_skills"], ["react"])
        self.assertEqual(result["job_description_match_score"], 67)
        self.assertEqual(result["ats_keyword_coverage"], "67%")
        self.assertIn("react", result["jd_suggestions"][0])

    @patch("analyzer.services.ResumeAnalysis.objects.create")
    @patch("analyzer.services.pdfplumber.open")
    def test_persists_analysis_when_user_provided(self, mock_open, mock_create):
        mock_open.return_value = _fake_pdf("Python Django")
        fake_user = SimpleNamespace(id=42)
        with patch("analyzer.services.User.objects.get", return_value=fake_user):
            result = analyze_resume(
                "dummy.pdf",
                "Backend Developer",
                file_name="my_resume.pdf",
                user_id=42,
            )

        mock_create.assert_called_once()
        kwargs = mock_create.call_args.kwargs
        self.assertIs(kwargs["user"], fake_user)
        self.assertEqual(kwargs["file_name"], "my_resume.pdf")
        self.assertEqual(kwargs["score"], result["score"])
        self.assertEqual(kwargs["target_role"], "Backend Developer")

    @patch("analyzer.services.ResumeAnalysis.objects.create")
    @patch("analyzer.services.pdfplumber.open")
    def test_no_persistence_without_user(self, mock_open, mock_create):
        mock_open.return_value = _fake_pdf("Python Django")
        analyze_resume("dummy.pdf", "Backend Developer")
        mock_create.assert_not_called()


from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient

from analyzer.comparison import compare_versions
from analyzer.models import ResumeAnalysis


def _make_analysis(user, **overrides):
    defaults = dict(
        file_name="resume.pdf",
        score=50,
        skills_found=["python", "sql"],
        suggestions=[],
        matched_skills=["python"],
        missing_skills=["react"],
        target_role="Backend Developer",
        resume_text="Python developer\nWorked with SQL",
    )
    defaults.update(overrides)
    return ResumeAnalysis.objects.create(user=user, **defaults)


class CompareVersionsEngineTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="pw123456")

    def test_score_delta_and_skill_diffs(self):
        older = _make_analysis(
            self.user,
            score=40,
            skills_found=["python", "sql"],
            matched_skills=["python"],
            missing_skills=["react", "git"],
            resume_text="Python developer\nWorked with SQL",
        )
        newer = _make_analysis(
            self.user,
            score=70,
            skills_found=["python", "sql", "react"],
            matched_skills=["python", "react"],
            missing_skills=["git"],
            resume_text="Python developer\nWorked with SQL\nBuilt UIs with React",
        )

        result = compare_versions(older, newer).as_dict()

        self.assertEqual(result["score_delta"], 30)
        self.assertIn("react", result["added_skills"])
        self.assertEqual(result["removed_skills"], [])
        self.assertIn("react", result["newly_matched_skills"])
        self.assertEqual(result["newly_missing_skills"], [])
        self.assertIn("git", result["still_missing_skills"])
        self.assertTrue(any(d["type"] == "added" for d in result["text_diff"]))
        self.assertTrue(any("improved" in insight for insight in result["insights"]))

    def test_score_regression_is_explained(self):
        older = _make_analysis(self.user, score=80, matched_skills=["python", "react"], missing_skills=[])
        newer = _make_analysis(self.user, score=55, matched_skills=["python"], missing_skills=["react"])

        result = compare_versions(older, newer).as_dict()

        self.assertEqual(result["score_delta"], -25)
        self.assertIn("react", result["newly_missing_skills"])
        self.assertTrue(any("dropped" in insight for insight in result["insights"]))

    def test_identical_versions_yield_no_diff_message(self):
        older = _make_analysis(self.user)
        newer = _make_analysis(self.user)

        result = compare_versions(older, newer).as_dict()

        self.assertEqual(result["score_delta"], 0)
        self.assertEqual(result["added_skills"], [])
        self.assertEqual(result["removed_skills"], [])


class CompareVersionsAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="bob", password="pw123456")
        self.other_user = User.objects.create_user(username="eve", password="pw123456")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.older = _make_analysis(self.user, score=40)
        self.newer = _make_analysis(self.user, score=65, skills_found=["python", "sql", "docker"])

    def test_compare_requires_auth(self):
        anon_client = APIClient()
        resp = anon_client.get(
            "/api/compare/", {"older": self.older.id, "newer": self.newer.id}
        )
        self.assertEqual(resp.status_code, 401)

    def test_compare_returns_diff(self):
        resp = self.client.get(
            "/api/compare/", {"older": self.older.id, "newer": self.newer.id}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["score_delta"], 25)
        self.assertIn("docker", resp.data["added_skills"])
        self.assertTrue(len(resp.data["insights"]) > 0)

    def test_compare_rejects_missing_params(self):
        resp = self.client.get("/api/compare/", {"older": self.older.id})
        self.assertEqual(resp.status_code, 400)

    def test_compare_rejects_same_id(self):
        resp = self.client.get(
            "/api/compare/", {"older": self.older.id, "newer": self.older.id}
        )
        self.assertEqual(resp.status_code, 400)

    def test_compare_blocks_other_users_analyses(self):
        foreign = _make_analysis(self.other_user, score=90)
        resp = self.client.get(
            "/api/compare/", {"older": self.older.id, "newer": foreign.id}
        )
        self.assertEqual(resp.status_code, 404)
