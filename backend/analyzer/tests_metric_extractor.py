"""
Unit tests for the Resume Achievement Quantification and Metric Suggestion Engine.

Validates detection accuracy, edge cases, and suggestion generation logic.
"""

from django.test import TestCase
from .metric_extractor import (
    has_metrics,
    generate_metric_suggestion,
    analyze_resume_bullets,
)


class MetricExtractorTests(TestCase):
    """Test suite for metric extraction and suggestion logic."""

    def test_has_metrics_detects_percentages(self):
        """Test that percentage metrics are correctly detected."""
        self.assertTrue(has_metrics("Increased sales by 25% in Q3."))
        self.assertTrue(has_metrics("Improved efficiency by 15.5%."))

    def test_has_metrics_detects_currency(self):
        """Test that currency metrics are correctly detected."""
        self.assertTrue(has_metrics("Managed a budget of $50,000."))
        self.assertTrue(has_metrics("Generated $1.5 million in revenue."))

    def test_has_metrics_detects_counts_and_timeframes(self):
        """Test that counts and timeframes are correctly detected."""
        self.assertTrue(has_metrics("Led a team of 12 engineers."))
        self.assertTrue(has_metrics("Reduced processing time by 3 hours per week."))
        self.assertTrue(has_metrics("Developed 5 new features for the platform."))

    def test_has_metrics_returns_false_for_non_quantified(self):
        """Test that non-quantified bullets return False."""
        self.assertFalse(has_metrics("Responsible for managing the team."))
        self.assertFalse(has_metrics("Worked on improving the backend system."))
        self.assertFalse(has_metrics("Helped with various projects."))

    def test_generate_metric_suggestion_for_increase(self):
        """Test suggestion generation for 'increased' action verb."""
        bullet = "Increased website traffic significantly."
        suggestion = generate_metric_suggestion(bullet)
        self.assertIn("by [X]%", suggestion)
        self.assertIn("generated $[Y]", suggestion)

    def test_generate_metric_suggestion_for_managed(self):
        """Test suggestion generation for 'managed' action verb."""
        bullet = "Managed the development team."
        suggestion = generate_metric_suggestion(bullet)
        self.assertIn("team of [X] people", suggestion)
        self.assertIn("budget of $[Y]", suggestion)

    def test_generate_metric_suggestion_fallback(self):
        """Test fallback suggestion for bullets without recognized action verbs."""
        bullet = "Did some work on the database."
        suggestion = generate_metric_suggestion(bullet)
        self.assertIn("Consider adding quantifiable impact", suggestion)

    def test_analyze_resume_bullets_empty_input(self):
        """Test that empty or invalid input returns an empty list."""
        self.assertEqual(analyze_resume_bullets(""), [])
        self.assertEqual(analyze_resume_bullets(None), [])

    def test_analyze_resume_bullets_mixed_content(self):
        """Test analysis of a resume text with mixed quantified and non-quantified bullets."""
        resume_text = """
        Professional Experience
        - Increased sales by 20% in the first year.
        - Managed a team of software engineers.
        • Developed new features for the web application.
        - Responsible for daily operations.
        """
        results = analyze_resume_bullets(resume_text)

        # Should find 3 meaningful bullets (ignoring the header)
        self.assertEqual(len(results), 3)

        # Check the quantified one
        quantified = next(
            r for r in results if "Increased sales" in r["original_bullet"]
        )
        self.assertTrue(quantified["has_metrics"])
        self.assertEqual(quantified["suggestion"], "")

        # Check a non-quantified one
        non_quantified = next(
            r for r in results if "Managed a team" in r["original_bullet"]
        )
        self.assertFalse(non_quantified["has_metrics"])
        self.assertIn("team of [X] people", non_quantified["suggestion"])
        self.assertIn("[for a team of X people]", non_quantified["enhanced_bullet"])

    def test_analyze_resume_bullets_filters_headers(self):
        """Test that section headers are filtered out of bullet analysis."""
        resume_text = (
            "EDUCATION AND CERTIFICATIONS\n- Bachelor of Science in Computer Science"
        )
        results = analyze_resume_bullets(resume_text)
        # The header should be ignored, and the degree line might be picked up but it's short
        # Let's ensure no header-only lines are processed as bullets
        for result in results:
            self.assertNotEqual(
                result["original_bullet"].strip(), "EDUCATION AND CERTIFICATIONS"
            )
            self.assertNotEqual(
                result["original_bullet"].strip(),
                "- Bachelor of Science in Computer Science",
            )
            self.assertNotEqual(
                result["enhanced_bullet"].strip(), "EDUCATION AND CERTIFICATIONS"
            )
