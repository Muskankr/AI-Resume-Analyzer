"""
Unit tests for the Dynamic Cover Letter Optimization and Alignment Scorer.

Validates scoring logic, keyword detection accuracy, and rewrite generation.
"""

from django.test import TestCase
from .cover_letter_optimizer import (
    extract_keywords,
    calculate_alignment_score,
    suggest_paragraph_rewrites,
)


class CoverLetterOptimizerTests(TestCase):
    """Test suite for cover letter optimization logic."""

    def test_extract_keywords_basic(self):
        """Test basic keyword extraction."""
        text = "I have experience with Python, React, and machine learning."
        keywords = extract_keywords(text)
        self.assertIn("python", keywords)
        self.assertIn("react", keywords)
        self.assertIn(
            "machine", keywords
        )  # Note: 'learning' might be extracted separately or together depending on regex, simplified here
        self.assertNotIn("and", keywords)
        self.assertNotIn("the", keywords)

    def test_calculate_alignment_score_high_match(self):
        """Test alignment scoring with high keyword overlap."""
        cl = "I am an experienced Python developer with strong React skills."
        jd = "We need a Python developer who knows React and machine learning."

        result = calculate_alignment_score(cl, jd)
        self.assertGreater(result["score"], 70)
        self.assertIn("python", result["matched_keywords"])
        self.assertIn("react", result["matched_keywords"])

    def test_calculate_alignment_score_low_match(self):
        """Test alignment scoring with low keyword overlap."""
        cl = "I am a hard worker and I want to learn new things."
        jd = "We need a Python developer who knows React and machine learning."

        result = calculate_alignment_score(cl, jd)
        self.assertLess(result["score"], 50)
        self.assertEqual(len(result["matched_keywords"]), 0)

    def test_calculate_alignment_score_strong_weak_phrases(self):
        """Test that strong/weak phrases affect the score."""
        cl_strong = "I spearheaded a project and delivered results."
        cl_weak = "I think I just want to try and help with the project."
        jd = "We need a project manager."

        result_strong = calculate_alignment_score(cl_strong, jd)
        result_weak = calculate_alignment_score(cl_weak, jd)

        # Strong phrases should boost the score relative to a baseline
        # Weak phrases should penalize
        self.assertGreater(result_strong["score"], result_weak["score"])

    def test_suggest_paragraph_rewrites_generates_suggestions(self):
        """Test that rewrite suggestions are generated for missing keywords."""
        cl = "Dear Hiring Manager,\n\nI am writing to apply for the role.\n\nI have some experience.\n\nSincerely, Me"
        missing_keywords = ["Python", "React", "AWS"]

        suggestions = suggest_paragraph_rewrites(cl, missing_keywords)

        self.assertGreater(len(suggestions), 0)
        self.assertIn("paragraph_index", suggestions[0])
        self.assertIn("suggestion", suggestions[0])
        self.assertIn("Python", suggestions[0]["suggestion"])

    def test_suggest_paragraph_rewrites_empty_missing(self):
        """Test that no suggestions are generated if no keywords are missing."""
        cl = "I know Python and React."
        missing_keywords = []

        suggestions = suggest_paragraph_rewrites(cl, missing_keywords)
        self.assertEqual(suggestions, [])
