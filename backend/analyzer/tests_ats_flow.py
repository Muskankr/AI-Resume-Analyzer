"""
Unit tests for the ATS Reading Flow Simulator and Section Reorderer.

Validates section detection, flow scoring logic, and reordering suggestions.
"""

from django.test import TestCase
from .ats_flow_simulator import (
    identify_resume_sections,
    calculate_flow_score,
    generate_reordering_suggestions,
    simulate_ats_flow,
)


class ATSFlowTests(TestCase):
    """Test suite for ATS reading flow simulation logic."""

    def test_identify_resume_sections_detects_order(self):
        """Test that sections are detected in the correct order."""
        resume = """
        CONTACT
        John Doe
        
        SUMMARY
        Experienced developer.
        
        EXPERIENCE
        Did some coding.
        
        SKILLS
        Python, React
        """
        sections = identify_resume_sections(resume)

        self.assertEqual(len(sections), 4)
        self.assertEqual(sections[0]["name"], "contact")
        self.assertEqual(sections[1]["name"], "summary")
        self.assertEqual(sections[2]["name"], "experience")
        self.assertEqual(sections[3]["name"], "skills")

    def test_calculate_flow_score_perfect_order(self):
        """Test that perfectly ordered sections score 100."""
        sections = [
            {"name": "contact", "content_length": 50, "has_dead_zone": False},
            {"name": "summary", "content_length": 100, "has_dead_zone": False},
            {"name": "experience", "content_length": 200, "has_dead_zone": False},
            {"name": "skills", "content_length": 50, "has_dead_zone": False},
        ]
        score = calculate_flow_score(sections)
        self.assertEqual(score, 100)

    def test_calculate_flow_score_out_of_order(self):
        """Test that out-of-order sections are penalized."""
        sections = [
            {"name": "skills", "content_length": 50, "has_dead_zone": False},
            {"name": "experience", "content_length": 200, "has_dead_zone": False},
            {"name": "contact", "content_length": 50, "has_dead_zone": False},
        ]
        score = calculate_flow_score(sections)
        self.assertLess(score, 100)

    def test_calculate_flow_score_dead_zones(self):
        """Test that dead zones (large content blocks) are penalized."""
        sections = [
            {"name": "contact", "content_length": 50, "has_dead_zone": False},
            {"name": "experience", "content_length": 600, "has_dead_zone": True},
        ]
        score = calculate_flow_score(sections)
        self.assertLess(score, 100)

    def test_generate_reordering_suggestions_flags_issues(self):
        """Test that suggestions are generated for structural issues."""
        sections = [
            {"name": "skills", "content_length": 50, "has_dead_zone": False},
            {"name": "experience", "content_length": 600, "has_dead_zone": True},
        ]
        suggestions = generate_reordering_suggestions(sections)

        self.assertTrue(any("Contact" in s for s in suggestions))
        self.assertTrue(any("Skills" in s and "after" in s for s in suggestions))
        self.assertTrue(any("dead zones" in s.lower() for s in suggestions))

    def test_generate_reordering_suggestions_clean_resume(self):
        """Test that clean resumes get positive feedback."""
        sections = [
            {"name": "contact", "content_length": 50, "has_dead_zone": False},
            {"name": "summary", "content_length": 100, "has_dead_zone": False},
            {"name": "experience", "content_length": 200, "has_dead_zone": False},
        ]
        suggestions = generate_reordering_suggestions(sections)
        self.assertTrue(any("excellent" in s.lower() for s in suggestions))

    def test_simulate_ats_flow_full_integration(self):
        """Test the full simulation flow from raw text to structured output."""
        resume = """
        SKILLS
        Python
        
        CONTACT
        john@example.com
        
        EXPERIENCE
        """ + (
            "A" * 600
        )  # Create a dead zone

        result = simulate_ats_flow(resume)

        self.assertIn("sections", result)
        self.assertIn("flow_score", result)
        self.assertIn("suggestions", result)

        self.assertLess(result["flow_score"], 100)
        self.assertTrue(len(result["suggestions"]) > 0)

    def test_simulate_ats_flow_empty_input(self):
        """Test that empty input is handled gracefully."""
        result = simulate_ats_flow("")
        self.assertEqual(result["flow_score"], 100)
        self.assertEqual(result["suggestions"], ["Resume text is empty."])
        self.assertEqual(result["sections"], [])
        self.assertEqual(result["warnings"], [])
        self.assertEqual(result["errors"], [])
