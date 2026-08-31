"""
Unit tests for the Resume Format and Structure Normalizer.

Validates section detection, chronological sorting, and bullet point standardization.
"""

from django.test import TestCase
from .structure_normalizer import (
    identify_sections,
    normalize_bullet_points,
    normalize_resume,
)


class StructureNormalizerTests(TestCase):
    """Test suite for resume structure normalization logic."""

    def test_identify_sections_detects_headers(self):
        """Test that standard section headers are correctly identified."""
        resume = """
        John Doe
        john@example.com
        
        SUMMARY
        Experienced developer.
        
        EXPERIENCE
        Did some coding.
        
        EDUCATION
        BS Computer Science
        """
        sections = identify_sections(resume)

        self.assertIn("john@example.com", sections["contact"])
        self.assertIn("Experienced developer", sections["summary"])
        self.assertIn("Did some coding", sections["experience"])
        self.assertIn("BS Computer Science", sections["education"])

    def test_normalize_bullet_points_standardizes_format(self):
        """Test that various bullet point formats are standardized to hyphens."""
        text = """
        * Developed a web app
        • Managed a team
        1. Created a database
        Optimized the system
        """
        normalized = normalize_bullet_points(text)
        lines = normalized.split("\n")

        self.assertTrue(lines[0].startswith("- Developed"))
        self.assertTrue(lines[1].startswith("- Managed"))
        self.assertTrue(lines[2].startswith("- Created"))
        self.assertTrue(lines[3].startswith("- Optimized"))  # Detected via action verb

    def test_normalize_bullet_points_ignores_non_bullets(self):
        """Test that regular sentences without action verbs are not forced into bullets."""
        text = "This is a regular sentence about my hobbies."
        normalized = normalize_bullet_points(text)
        self.assertEqual(normalized, "This is a regular sentence about my hobbies.")

    def test_normalize_resume_full_flow(self):
        """Test the full normalization flow from raw text to structured output."""
        raw_resume = """
        Jane Smith
        555-1234
        
        work history
        * built a react app
        led a team of 5
        
        skills
        python, aws
        """
        result = normalize_resume(raw_resume)

        self.assertIn("sections", result)
        self.assertIn("changes_made", result)

        sections = result["sections"]
        self.assertIn("555-1234", sections.get("contact", ""))
        self.assertIn("- built a react app", sections.get("experience", ""))
        self.assertIn("- led a team of 5", sections.get("experience", ""))

        self.assertTrue(len(result["changes_made"]) > 0)

    def test_normalize_resume_empty_input(self):
        """Test that empty input is handled gracefully."""
        result = normalize_resume("")
        self.assertEqual(result, {"sections": {}, "changes_made": []})
