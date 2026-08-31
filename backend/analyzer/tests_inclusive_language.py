"""
Unit tests for the Inclusive Language and Unconscious Bias Detector.

Validates bias detection accuracy, edge cases, and replacement generation logic.
"""

from django.test import TestCase
from .inclusive_language import (
    detect_biased_language,
    generate_inclusive_text,
    analyze_resume_inclusivity,
)


class InclusiveLanguageTests(TestCase):
    """Test suite for inclusive language detection and correction logic."""

    def test_detect_biased_language_finds_gender_coded(self):
        """Test that gender-coded words are correctly detected."""
        text = "I am an aggressive ninja developer who is a rockstar."
        detections = detect_biased_language(text)

        self.assertEqual(len(detections), 3)
        categories = [d["category"] for d in detections]
        self.assertTrue(all("Gender Coded" in cat for cat in categories))

    def test_detect_biased_language_finds_age_biased(self):
        """Test that age-biased phrases are correctly detected."""
        text = "As a digital native and young and energetic recent graduate..."
        detections = detect_biased_language(text)

        self.assertGreaterEqual(len(detections), 2)
        self.assertTrue(any("Age Biased" in d["category"] for d in detections))

    def test_detect_biased_language_finds_ableist(self):
        """Test that ableist language is correctly detected."""
        text = "That idea is crazy and the old system is lame."
        detections = detect_biased_language(text)

        self.assertGreaterEqual(len(detections), 2)
        self.assertTrue(any("Ableist" in d["category"] for d in detections))

    def test_detect_biased_language_case_insensitive(self):
        """Test that detection is case-insensitive but preserves original casing."""
        text = "I am a Rockstar Ninja."
        detections = detect_biased_language(text)

        self.assertEqual(len(detections), 2)
        self.assertEqual(detections[0]["phrase"], "Rockstar")
        self.assertEqual(detections[1]["phrase"], "Ninja")

    def test_generate_inclusive_text_replaces_phrases(self):
        """Test that the inclusive text generator correctly replaces biased phrases."""
        text = "I am an aggressive ninja developer."
        detections = detect_biased_language(text)
        inclusive_text = generate_inclusive_text(text, detections)

        self.assertNotIn("aggressive", inclusive_text.lower())
        self.assertNotIn("ninja", inclusive_text.lower())
        self.assertIn("driven", inclusive_text.lower())
        self.assertIn("expert", inclusive_text.lower())

    def test_generate_inclusive_text_preserves_casing(self):
        """Test that capitalization is preserved during replacement."""
        text = "Ninja developer needed."
        detections = detect_biased_language(text)
        inclusive_text = generate_inclusive_text(text, detections)

        self.assertIn("Expert", inclusive_text)

    def test_analyze_resume_inclusivity_full_flow(self):
        """Test the main analysis function with comprehensive data."""
        resume = """
        Professional Summary
        I am a young and energetic digital native who is a rockstar at coding. 
        I am aggressive in meeting deadlines and think the old system is crazy.
        """
        result = analyze_resume_inclusivity(resume)

        self.assertIn("detections", result)
        self.assertIn("inclusive_text", result)
        self.assertIn("inclusivity_score", result)
        self.assertIn("total_issues", result)

        self.assertGreater(result["total_issues"], 0)
        self.assertLess(result["inclusivity_score"], 100)
        self.assertNotIn("rockstar", result["inclusive_text"].lower())

    def test_analyze_resume_inclusivity_clean_text(self):
        """Test that clean, inclusive text scores 100."""
        clean_resume = (
            "I am an experienced software engineer proficient in Python and React."
        )
        result = analyze_resume_inclusivity(clean_resume)

        self.assertEqual(result["total_issues"], 0)
        self.assertEqual(result["inclusivity_score"], 100)
        self.assertEqual(result["inclusive_text"], clean_resume)

    def test_detect_biased_language_empty_input(self):
        """Test that empty or invalid input returns safely."""
        self.assertEqual(detect_biased_language(""), [])
        self.assertEqual(detect_biased_language(None), [])
