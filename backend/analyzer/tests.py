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


class SecurityHeadersTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_security_headers_are_present_on_api_responses(self):
        # Trigger an API request
        resp = self.client.get("/api/compare/")
        
        # Check that Content-Security-Policy is present and configured for APIs
        self.assertIn("Content-Security-Policy", resp)
        self.assertEqual(
            resp["Content-Security-Policy"],
            "default-src 'none'; frame-ancestors 'none';"
        )
        
        # Check standard secure headers
        self.assertIn("X-Frame-Options", resp)
        self.assertEqual(resp["X-Frame-Options"], "DENY")
        
        self.assertIn("X-Content-Type-Options", resp)
        self.assertEqual(resp["X-Content-Type-Options"], "nosniff")
        
        self.assertIn("Referrer-Policy", resp)
        self.assertEqual(resp["Referrer-Policy"], "strict-origin-when-cross-origin")

    def test_security_headers_are_present_on_html_responses(self):
        # Trigger an HTML view request
        resp = self.client.get("/admin/login/")
        
        # Check that Content-Security-Policy is configured for HTML/Admin
        self.assertIn("Content-Security-Policy", resp)
        self.assertIn("default-src 'self'", resp["Content-Security-Policy"])
        
        # Check standard secure headers
        self.assertIn("X-Frame-Options", resp)
        self.assertEqual(resp["X-Frame-Options"], "DENY")
        
        self.assertIn("X-Content-Type-Options", resp)
        self.assertEqual(resp["X-Content-Type-Options"], "nosniff")
        
        self.assertIn("Referrer-Policy", resp)
        self.assertEqual(resp["Referrer-Policy"], "strict-origin-when-cross-origin")





class CoverLetterAnalysisTests(TestCase):
    def test_analyze_cover_letter_tone_and_length(self):
        from analyzer.services import analyze_cover_letter
        
        # Test a short cover letter
        short_text = "I am interested in the Frontend Developer position. I have React skills."
        res = analyze_cover_letter(short_text, "Frontend Developer")
        self.assertEqual(res["length"]["status"], "Too short")
        self.assertTrue(res["relevance"]["references_role"])
        self.assertFalse(res["relevance"]["references_company"])

        # Test a good length cover letter with active tone and role/company references
        good_text = (
            "Dear Hiring Manager,\n\n"
            "I am excited to apply for the Frontend Developer position at Google. "
            "Over the past few years, I have designed and implemented several web applications. "
            "I led a team of developers to create responsive interfaces. I optimized the codebase "
            "and solved complex engineering challenges. I believe my background aligns perfectly with your team.\n\n"
            "Sincerely,\nJohn Doe"
        )
        res = analyze_cover_letter(good_text, "Frontend Developer")
        self.assertEqual(res["length"]["status"], "Good")
        self.assertIn("Confident", res["tone"]["label"])
        self.assertIn("Enthusiastic", res["tone"]["label"])
        self.assertTrue(res["relevance"]["references_role"])
        self.assertTrue(res["relevance"]["references_company"])

    @patch("analyzer.services.pdfplumber.open")
    def test_analyze_resume_with_cover_letter(self, mock_open):
        mock_open.return_value = _fake_pdf("Python Django developer")
        
        # We patch open to mock text extraction for the cover letter as well.
        # But analyze_resume calls extract_text_from_file twice. So let's mock extract_text_from_file.
        with patch("analyzer.services.extract_text_from_file") as mock_extract:
            mock_extract.side_effect = [
                "Python Django developer",  # Resume text
                "I am applying for Backend Developer role. I designed and implemented backend systems.",  # Cover letter text
            ]
            
            result = analyze_resume(
                file_path="dummy_resume.pdf",
                target_role="Backend Developer",
                file_name="resume.pdf",
                cover_letter_path="dummy_cl.pdf",
                cover_letter_name="cover_letter.pdf",
            )
            
            self.assertEqual(result["resume_text"], "Python Django developer")
            self.assertIsNotNone(result["cover_letter_text"])
            self.assertIsNotNone(result["cover_letter_feedback"])
            self.assertEqual(result["cover_letter_feedback"]["length"]["status"], "Too short")
            self.assertTrue(result["cover_letter_feedback"]["relevance"]["references_role"])



class InterviewQuestionTests(TestCase):
    def test_generate_interview_questions_valid(self):
        from analyzer.services import generate_interview_questions
        
        # Test generation with React skill and Frontend Developer target role
        questions = generate_interview_questions(["React", "TypeScript"], "Frontend Developer")
        self.assertTrue(len(questions) >= 5)
        self.assertTrue(len(questions) <= 8)
        
        # At least one question should be from React or TS
        has_tech = any("React" in q or "TypeScript" in q or "virtual DOM" in q or "generics" in q for q in questions)
        self.assertTrue(has_tech)

    @patch("analyzer.services.pdfplumber.open")
    def test_analyze_resume_generates_interview_questions(self, mock_open):
        mock_open.return_value = _fake_pdf("Expert in Python and SQL.")
        
        result = analyze_resume(
            file_path="dummy_resume.pdf",
            target_role="Backend Developer",
            file_name="resume.pdf",
        )
        
        self.assertIn("interview_questions", result)
        self.assertTrue(len(result["interview_questions"]) >= 5)

class JdAnalysisTests(TestCase):
    def test_analyze_jd_endpoint(self):
        from rest_framework import status
        
        # Test empty input error
        resp = self.client.post("/api/analyze-jd/", {"job_description": ""})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", resp.data)
        
        # Test valid input analysis with known skill keywords and stop words
        jd_text = (
            "We are seeking a React Developer. The candidate should have experience in React, "
            "JavaScript, HTML, and CSS. Working with teams to deliver responsive layouts is essential. "
            "React and TypeScript are strong plusses. The candidate will work in a fast-paced environment."
        )
        resp = self.client.post("/api/analyze-jd/", {"job_description": jd_text})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("keywords", resp.data)
        
        keywords = resp.data["keywords"]
        self.assertTrue(len(keywords) > 0)
        
        # Check that 'react' is recognized and tagged as a skill
        react_keyword = next((k for k in keywords if k["text"] == "react"), None)
        self.assertIsNotNone(react_keyword)
        self.assertEqual(react_keyword["type"], "skill")
        self.assertTrue(react_keyword["value"] >= 2)
        
        # Common English stop words like 'the' or 'and' or corporate fillers like 'candidate' shouldn't be here
        texts = [k["text"] for k in keywords]
        self.assertNotIn("the", texts)
        self.assertNotIn("and", texts)
        self.assertNotIn("candidate", texts)


class SkillsLeaderboardTests(TestCase):
    def test_skills_leaderboard_endpoint(self):
        from rest_framework import status
        from django.contrib.auth.models import User
        from analyzer.models import ResumeAnalysis
        
        user = User.objects.create_user(username="testuser", password="password123")
        ResumeAnalysis.objects.create(
            user=user,
            file_name="resume1.pdf",
            target_role="Frontend Developer",
            score=80,
            skills_found=["react", "javascript", "html"],
            matched_skills=["react", "javascript"],
            missing_skills=["typescript", "css"],
        )
        ResumeAnalysis.objects.create(
            user=user,
            file_name="resume2.pdf",
            target_role="Backend Developer",
            score=50,
            skills_found=["python"],
            matched_skills=["python"],
            missing_skills=["django", "sql"],
        )
        ResumeAnalysis.objects.create(
            user=user,
            file_name="resume3.pdf",
            target_role="Frontend Developer",
            score=90,
            skills_found=["react", "typescript"],
            matched_skills=["react", "typescript"],
            missing_skills=["css"],
        )
        
        resp = self.client.get("/api/skills-leaderboard/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        
        self.assertIn("total_analyses", resp.data)
        self.assertIn("matched_skills", resp.data)
        self.assertIn("missing_skills", resp.data)
        self.assertEqual(resp.data["total_analyses"], 3)
        
        resp_fe = self.client.get("/api/skills-leaderboard/?track=Frontend Developer")
        self.assertEqual(resp_fe.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_fe.data["total_analyses"], 2)
        
        matched_fe = resp_fe.data["matched_skills"]
        react_item = next((s for s in matched_fe if s["skill"] == "React"), None)
        self.assertIsNotNone(react_item)
        self.assertEqual(react_item["percentage"], 100)
        self.assertEqual(react_item["count"], 2)
        
        missing_fe = resp_fe.data["missing_skills"]
        css_item = next((s for s in missing_fe if s["skill"] == "Css"), None)
        self.assertIsNotNone(css_item)
        self.assertEqual(css_item["percentage"], 100)
        self.assertEqual(css_item["count"], 2)


from django.core.files.uploadedfile import SimpleUploadedFile

class ProfileAvatarTests(TestCase):
    def setUp(self):
        from django.contrib.auth.models import User
        self.user = User.objects.create_user(username="avataruser", password="password123")
        
    def test_login_returns_avatar_url(self):
        from rest_framework import status
        resp = self.client.post("/api/auth/login/", {"username": "avataruser", "password": "password123"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("avatar_url", resp.data)
        self.assertIsNone(resp.data["avatar_url"])

    def test_upload_and_delete_avatar(self):
        from rest_framework import status
        login_resp = self.client.post("/api/auth/login/", {"username": "avataruser", "password": "password123"})
        token = login_resp.data["access"]
        auth_headers = {"HTTP_AUTHORIZATION": f"Bearer {token}"}
        
        txt_file = SimpleUploadedFile("avatar.txt", b"plain text content", content_type="text/plain")
        resp = self.client.post("/api/profile/avatar/", {"avatar": txt_file}, **auth_headers)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", resp.data)
        
        large_file = SimpleUploadedFile("avatar.png", b"x" * (2 * 1024 * 1024 + 1), content_type="image/png")
        resp = self.client.post("/api/profile/avatar/", {"avatar": large_file}, **auth_headers)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        
        valid_img = SimpleUploadedFile("avatar.png", b"fake_png_binary_data", content_type="image/png")
        resp = self.client.post("/api/profile/avatar/", {"avatar": valid_img}, **auth_headers)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("avatar_url", resp.data)
        self.assertIsNotNone(resp.data["avatar_url"])
        
        login_resp = self.client.post("/api/auth/login/", {"username": "avataruser", "password": "password123"})
        self.assertIsNotNone(login_resp.data["avatar_url"])
        
        del_resp = self.client.delete("/api/profile/avatar/", **auth_headers)
        self.assertEqual(del_resp.status_code, status.HTTP_200_OK)
        
        login_resp = self.client.post("/api/auth/login/", {"username": "avataruser", "password": "password123"})
        self.assertIsNone(login_resp.data["avatar_url"])
