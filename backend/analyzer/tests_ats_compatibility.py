"""Tests for the ATS Compatibility Checker."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .ats_compatibility import (
    ATSCompatibilityResult,
    _check_contact_info,
    _check_date_formats,
    _check_character_encoding,
    _check_section_headers,
    _check_education_parseability,
    _check_skills_structure,
    _check_length,
    _check_keyword_placement,
    _grade_for,
    check_ats_compatibility,
)
from .ats_compatibility_serializers import (
    ATSCompatibilityRequestSerializer,
    ATSCompatibilityResultSerializer,
)
from .models import ResumeAnalysis

User = get_user_model()


class GradeTests(TestCase):
    def test_a_plus(self):
        self.assertEqual(_grade_for(95), "A+")
    def test_a(self):
        self.assertEqual(_grade_for(85), "A")
    def test_b_plus(self):
        self.assertEqual(_grade_for(75), "B+")
    def test_c(self):
        self.assertEqual(_grade_for(50), "C")
    def test_f(self):
        self.assertEqual(_grade_for(20), "F")


class SectionHeaderTests(TestCase):
    def test_all_core_sections(self):
        text = "SUMMARY\nExperienced dev.\nEXPERIENCE\nWork history.\nEDUCATION\nBS in CS.\nSKILLS\nPython, JS."
        result = _check_section_headers(text)
        self.assertEqual(result.status, "pass")

    def test_missing_core(self):
        text = "Just some random text with no headers."
        result = _check_section_headers(text)
        self.assertIn(result.status, ("warning", "fail"))


class ContactInfoTests(TestCase):
    def test_full_contact(self):
        text = "john@email.com +1-555-123-4567 linkedin.com/in/john github.com/john"
        result = _check_contact_info(text)
        self.assertEqual(result.status, "pass")
        self.assertGreaterEqual(result.score, 70)

    def test_no_contact(self):
        text = "Experienced developer with 5 years of experience."
        result = _check_contact_info(text)
        self.assertIn(result.status, ("warning", "fail"))


class DateFormatTests(TestCase):
    def test_consistent(self):
        text = "Jan 2023 - Present\nMar 2021 - Dec 2022\nJun 2019 - Feb 2021"
        result = _check_date_formats(text)
        self.assertEqual(result.status, "pass")

    def test_no_dates(self):
        text = "No dates at all in this resume."
        result = _check_date_formats(text)
        self.assertEqual(result.status, "warning")


class CharacterEncodingTests(TestCase):
    def test_clean_text(self):
        text = "Built a REST API with Python and Django."
        result = _check_character_encoding(text)
        self.assertEqual(result.status, "pass")

    def test_problematic_chars(self):
        text = "Built a REST API\u200b with \u201cPython\u201d and Django."
        result = _check_character_encoding(text)
        self.assertIn(result.status, ("warning", "fail"))


class LengthTests(TestCase):
    def test_good_length(self):
        text = " ".join(["word"] * 500)
        result = _check_length(text)
        self.assertEqual(result.status, "pass")

    def test_too_short(self):
        text = " ".join(["word"] * 50)
        result = _check_length(text)
        self.assertEqual(result.status, "warning")

    def test_too_long(self):
        text = " ".join(["word"] * 1500)
        result = _check_length(text)
        self.assertIn(result.status, ("warning", "fail"))


class EducationTests(TestCase):
    def test_good_education(self):
        text = "EDUCATION\nBachelor of Science in Computer Science, MIT, 2020"
        result = _check_education_parseability(text)
        self.assertEqual(result.status, "pass")

    def test_no_education(self):
        text = "EXPERIENCE\nWorked at Google."
        result = _check_education_parseability(text)
        self.assertEqual(result.status, "warning")


class SkillsTests(TestCase):
    def test_skills_section(self):
        text = "SKILLS\nPython, JavaScript, React, Django, SQL"
        result = _check_skills_structure(text)
        self.assertEqual(result.status, "pass")

    def test_no_skills(self):
        text = "EXPERIENCE\nBuilt stuff."
        result = _check_skills_structure(text)
        self.assertEqual(result.status, "warning")


class CheckATSCompatibilityTests(TestCase):
    def test_full_resume(self):
        text = (
            "SUMMARY\nSenior developer with 8 years of experience.\n\n"
            "EXPERIENCE\n"
            "- Jan 2020 - Present: Senior Engineer at Google\n"
            "- Mar 2017 - Dec 2019: Engineer at Meta\n\n"
            "EDUCATION\n"
            "Bachelor of Science in CS, Stanford, 2017\n\n"
            "SKILLS\n"
            "Python, JavaScript, React, Django, SQL, Docker, AWS\n\n"
            "Contact: john@email.com, +1-555-123-4567"
        )
        result = check_ats_compatibility(text)
        self.assertIsInstance(result, ATSCompatibilityResult)
        self.assertGreater(result.overall_score, 60)
        self.assertEqual(len(result.checks), 10)

    def test_poor_resume(self):
        text = "random text without structure or headers"
        result = check_ats_compatibility(text)
        self.assertLess(result.overall_score, 60)

    def test_as_dict(self):
        result = check_ats_compatibility("EXPERIENCE\n- Built stuff.\nSKILLS\nPython")
        d = result.as_dict()
        self.assertIn("overall_score", d)
        self.assertIn("checks", d)
        self.assertIn("summary", d)


class SerializerTests(TestCase):
    def test_request_valid(self):
        s = ATSCompatibilityRequestSerializer(data={"resume_text": "text"})
        self.assertTrue(s.is_valid(), s.errors)

    def test_result_roundtrip(self):
        result = check_ats_compatibility("EXPERIENCE\nPython dev.\nSKILLS\nPython")
        s = ATSCompatibilityResultSerializer(result.as_dict())
        self.assertTrue(s.is_valid(), s.errors)


class ATSCompatibilityAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = "/api/ats-compatibility/"

    def test_raw_text(self):
        resp = self.client.post(
            self.url,
            {"resume_text": "SUMMARY\nDev.\nEXPERIENCE\nWork.\nEDUCATION\nBS.\nSKILLS\nPython"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("overall_score", resp.data)

    def test_analysis_id(self):
        user = User.objects.create_user(username="testu", password="pass123")
        analysis = ResumeAnalysis.objects.create(
            user=user, file_name="r.pdf", target_role="Backend",
            score=50, skills_found=[], matched_skills=[], missing_skills=[],
            suggestions=[], resume_text="EXPERIENCE\nBuilt API.\nSKILLS\nPython",
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
