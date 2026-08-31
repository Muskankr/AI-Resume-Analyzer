"""
Unit tests for the Job Description Keyword Weighting and Priority Matrix.

Validates weight calculation accuracy, modifier detection, and matrix generation.
"""

from django.test import TestCase
from .keyword_weighting import (
    extract_weighted_keywords,
    extract_resume_skills,
    generate_priority_matrix,
)


class KeywordWeightingTests(TestCase):
    """Test suite for keyword weighting and priority matrix logic."""

    def test_extract_weighted_keywords_critical(self):
        """Test that critical modifiers assign weight 3."""
        jd = "Must have Python expertise. Required to know AWS."
        weights = extract_weighted_keywords(jd)

        self.assertEqual(weights.get("python"), 3)
        self.assertEqual(weights.get("aws"), 3)

    def test_extract_weighted_keywords_preferred(self):
        """Test that preferred modifiers assign weight 2."""
        jd = "Familiarity with React is preferred. Nice to have Docker knowledge."
        weights = extract_weighted_keywords(jd)

        self.assertEqual(weights.get("react"), 2)
        self.assertEqual(weights.get("docker"), 2)

    def test_extract_weighted_keywords_default(self):
        """Test that unmodified mentions default to weight 1."""
        jd = "We use JavaScript and SQL in our stack."
        weights = extract_weighted_keywords(jd)

        self.assertEqual(weights.get("javascript"), 1)
        self.assertEqual(weights.get("sql"), 1)

    def test_extract_resume_skills_finds_matches(self):
        """Test that skills are correctly extracted from the resume."""
        resume = (
            "I have 5 years of experience in Python, React, and Agile methodologies."
        )
        skills = extract_resume_skills(resume)

        self.assertIn("python", skills)
        self.assertIn("react", skills)
        self.assertIn("agile", skills)

    def test_generate_priority_matrix_categorization(self):
        """Test that keywords are correctly placed in the 2x2 matrix."""
        jd = "Must have Python. Preferred React. We also use Java."
        resume = "I know Python and Java. I am learning Docker."

        matrix = generate_priority_matrix(jd, resume)

        # Python is critical and in resume -> core_strengths
        self.assertIn("python", matrix["core_strengths"])

        # React is preferred but missing -> irrelevant_or_missing (weight 2, missing)
        self.assertIn("react", matrix["irrelevant_or_missing"])

        # Java is default weight and in resume -> bonus_skills
        self.assertIn("java", matrix["bonus_skills"])

        # Docker is in resume but not JD -> irrelevant_or_missing
        self.assertIn("docker", matrix["irrelevant_or_missing"])

    def test_generate_priority_matrix_empty_inputs(self):
        """Test that empty inputs return empty matrix categories."""
        matrix = generate_priority_matrix("", "")

        self.assertEqual(matrix["critical_missing"], [])
        self.assertEqual(matrix["core_strengths"], [])
        self.assertEqual(matrix["bonus_skills"], [])
        self.assertEqual(matrix["irrelevant_or_missing"], [])

    def test_generate_priority_matrix_sorting(self):
        """Test that matrix categories are sorted alphabetically."""
        jd = "Must have Python, AWS, and React."
        resume = ""

        matrix = generate_priority_matrix(jd, resume)

        self.assertEqual(matrix["critical_missing"], ["aws", "python", "react"])
