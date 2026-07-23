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


from analyzer.url_fetcher import convert_to_direct_download_url, download_and_validate_url


class UrlFetcherTests(TestCase):
    def test_convert_gdrive_url(self):
        gdrive_share_url = "https://drive.google.com/file/d/11A2b3C4d5E6f7G8h9I/view?usp=sharing"
        direct_url, filename = convert_to_direct_download_url(gdrive_share_url)
        self.assertEqual(direct_url, "https://drive.google.com/uc?export=download&id=11A2b3C4d5E6f7G8h9I")
        self.assertEqual(filename, "gdrive_11A2b3C4d5E6f7G8h9I.pdf")

    def test_convert_dropbox_url(self):
        dropbox_url = "https://www.dropbox.com/s/xyz123/my_resume.pdf?dl=0"
        direct_url, filename = convert_to_direct_download_url(dropbox_url)
        self.assertIn("dl=1", direct_url)
        self.assertEqual(filename, "my_resume.pdf")

    def test_invalid_url_scheme_raises_value_error(self):
        with self.assertRaises(ValueError) as ctx:
            download_and_validate_url("ftp://example.com/file.pdf")
        self.assertIn("valid URL starting with http", str(ctx.exception))
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from unittest.mock import patch
from types import SimpleNamespace
from django.test import TestCase

from analyzer.comparison import compare_versions
from analyzer.models import ResumeAnalysis
from analyzer.services import analyze_resume
from analyzer.url_fetcher import convert_to_direct_download_url, download_and_validate_url


def _fake_pdf(text):
    return SimpleNamespace(pages=[SimpleNamespace(extract_text=lambda: text)])


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


class HealthCheckTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_check_healthy(self):
        resp = self.client.get("/api/health/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["status"], "healthy")
        self.assertEqual(resp.data["services"]["api"], "up")
        self.assertEqual(resp.data["services"]["database"], "up")

    @patch("django.db.connection.cursor")
    def test_health_check_unhealthy(self, mock_cursor):
        # Mock database connection cursor to throw an exception
        mock_cursor.side_effect = Exception("Database is down")
        resp = self.client.get("/api/health/")
        self.assertEqual(resp.status_code, 503)
        self.assertEqual(resp.data["status"], "unhealthy")
        self.assertEqual(resp.data["services"]["database"], "down")
        self.assertIn("Database is down", resp.data["error"])


class DeleteAccountTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.username = "testuser"
        self.password = "validpassword123"
        self.user = User.objects.create_user(username=self.username, password=self.password)
        
        # Create some resume analyses to verify cascade deletion
        _make_analysis(self.user, score=60, file_name="resume1.pdf")
        _make_analysis(self.user, score=80, file_name="resume2.pdf")

    def test_delete_account_requires_authentication(self):
        resp = self.client.delete("/api/auth/delete-account/", {"password": self.password, "confirm_text": "DELETE"}, format="json")
        self.assertEqual(resp.status_code, 401)
        self.assertTrue(User.objects.filter(username=self.username).exists())

    def test_delete_account_incorrect_password(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.delete("/api/auth/delete-account/", {"password": "wrongpassword", "confirm_text": "DELETE"}, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Incorrect password", resp.data["error"])
        self.assertTrue(User.objects.filter(username=self.username).exists())

    def test_delete_account_incorrect_confirm_text(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.delete("/api/auth/delete-account/", {"password": self.password, "confirm_text": "DELET"}, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("type 'DELETE' exactly", resp.data["error"])
        self.assertTrue(User.objects.filter(username=self.username).exists())

    def test_delete_account_success(self):
        self.client.force_authenticate(user=self.user)
        
        # Check that the analyses exist beforehand
        self.assertEqual(ResumeAnalysis.objects.filter(user=self.user).count(), 2)
        
        resp = self.client.delete("/api/auth/delete-account/", {"password": self.password, "confirm_text": "DELETE"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("permanently deleted", resp.data["detail"])
        
        # Check that user is deleted from the database
        self.assertFalse(User.objects.filter(username=self.username).exists())
        
        # Check cascade deletion: related analyses must be deleted too
        self.assertEqual(ResumeAnalysis.objects.filter(user_id=self.user.id).count(), 0)


class CsrfProtectionTests(TestCase):
    def setUp(self):
        self.username = "testuser"
        self.password = "validpassword123"
        self.user = User.objects.create_user(username=self.username, password=self.password)
        # Instantiate a client that strictly enforces CSRF checks
        self.client = APIClient(enforce_csrf=True)

    def test_session_auth_enforces_csrf_rejection(self):
        # Log in using Django session auth
        self.client.login(username=self.username, password=self.password)
        
        # A state-changing request (POST) to a session-authenticated view
        # (e.g. Django Admin) without CSRF token should return 403 Forbidden
        response = self.client.post("/admin/login/", {"username": self.username, "password": self.password})
        self.assertEqual(response.status_code, 403)

    def test_jwt_auth_does_not_require_csrf(self):
        # Log in to retrieve JWT access token
        resp = self.client.post("/api/auth/login/", {"username": self.username, "password": self.password}, format="json")
        token = resp.data["access"]
        
        # Authenticate using JWT Authorization header
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        
        # Accessing an authenticated endpoint (history) should succeed
        # without CSRF headers because headers are immune to CSRF
        response = self.client.get("/api/history/")
        self.assertEqual(response.status_code, 200)

