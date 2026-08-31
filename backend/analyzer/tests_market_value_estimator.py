"""
Unit tests for Market Value Estimator.
"""

from django.test import TestCase
from .market_value_estimator import (
    display_skill_name,
    find_high_value_skills,
    normalize_role,
    normalize_level,
    calculate_salary_range,
    generate_negotiation_points,
)


class MarketValueEstimatorTests(TestCase):
    """Test suite for market value estimation logic."""

    def test_normalize_role(self):
        """Test role normalization."""
        self.assertEqual(
            normalize_role("Senior Software Engineer"), "software engineer"
        )
        self.assertEqual(normalize_role("Data Scientist"), "data scientist")
        self.assertEqual(normalize_role("Unknown Role"), "default")

    def test_normalize_level(self):
        """Test experience level normalization."""
        self.assertEqual(normalize_level("Junior"), "entry")
        self.assertEqual(normalize_level("Mid-level"), "mid")
        self.assertEqual(normalize_level("Senior"), "senior")
        self.assertEqual(normalize_level("Principal"), "lead")

    def test_calculate_salary_range_base(self):
        """Test basic salary range calculation."""
        result = calculate_salary_range("Software Engineer", "Mid", [])
        self.assertEqual(result["currency"], "USD")
        self.assertLess(result["min"], result["median"])
        self.assertLess(result["median"], result["max"])

    def test_calculate_salary_range_with_high_value_skills(self):
        """Test salary boost from high-value skills."""
        base_result = calculate_salary_range("Software Engineer", "Mid", [])
        boosted_result = calculate_salary_range(
            "Software Engineer", "Mid", ["AWS", "Kubernetes", "Machine Learning"]
        )

        self.assertGreater(boosted_result["median"], base_result["median"])

    def test_generate_negotiation_points(self):
        """Test generation of negotiation talking points."""
        points = generate_negotiation_points("Senior", ["Python", "Leadership", "AWS"])
        self.assertGreater(len(points), 0)
        self.assertTrue(any("Leadership" in p for p in points))
        self.assertTrue(any("AWS" in p for p in points))


class SkillCasingTests(TestCase):
    """Casing of skills in generated advice.

    matched_skills was rendered with ``", ".join(...).title()``, which rewrote
    the caller's casing: AWS -> "Aws", SQL -> "Sql", GCP -> "Gcp". These are
    talking points a candidate reads out loud in a salary conversation.
    """

    def test_acronyms_survive_in_negotiation_points(self):
        points = generate_negotiation_points("Senior", ["Python", "Leadership", "AWS"])
        self.assertTrue(any("AWS" in p for p in points))
        self.assertFalse(any("Aws" in p for p in points))

    def test_canonical_spelling_is_used_for_known_skills(self):
        self.assertEqual(display_skill_name("aws"), "AWS")
        self.assertEqual(display_skill_name("AWS"), "AWS")
        self.assertEqual(display_skill_name("  Aws  "), "AWS")
        self.assertEqual(display_skill_name("tensorflow"), "TensorFlow")
        self.assertEqual(display_skill_name("machine learning"), "Machine Learning")

    def test_caller_casing_is_preserved_for_unknown_skills(self):
        self.assertEqual(display_skill_name("CI/CD"), "CI/CD")
        self.assertEqual(display_skill_name("PostgreSQL"), "PostgreSQL")

    def test_all_lowercase_unknown_skill_is_title_cased(self):
        self.assertEqual(display_skill_name("project planning"), "Project Planning")


class HighValueSkillSourceTests(TestCase):
    """One list decides both the price and the explanation.

    MarketValueView carried its own five-entry copy while
    calculate_salary_range priced against all sixteen, so a candidate could be
    given an uplift and an empty value_driving_skills in the same response.
    """

    SKILLS = ["Docker", "Rust", "Azure"]

    def test_skills_that_raise_the_salary_are_the_skills_reported(self):
        base = calculate_salary_range("Software Engineer", "Mid", [])
        boosted = calculate_salary_range("Software Engineer", "Mid", self.SKILLS)

        self.assertGreater(boosted["median"], base["median"])
        self.assertEqual(
            find_high_value_skills(self.SKILLS), ["Docker", "Rust", "Azure"]
        )

    def test_unrecognised_skills_are_excluded(self):
        self.assertEqual(find_high_value_skills(["Python", "Excel"]), [])

    def test_matching_is_case_and_whitespace_insensitive(self):
        self.assertEqual(find_high_value_skills(["  kUbErNeTeS "]), ["Kubernetes"])

    def test_duplicates_are_collapsed(self):
        self.assertEqual(find_high_value_skills(["AWS", "aws", "Aws"]), ["AWS"])

    def test_golang_and_go_report_the_same_name(self):
        self.assertEqual(find_high_value_skills(["golang"]), ["Go"])

    def test_empty_input(self):
        self.assertEqual(find_high_value_skills([]), [])
