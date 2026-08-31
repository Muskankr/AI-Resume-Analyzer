"""
Unit tests for Project Portfolio Extractor.
"""

from django.test import TestCase
from .project_extractor import extract_projects, score_project_impact, analyze_portfolio


class ProjectExtractorTests(TestCase):
    """Test suite for project extraction and scoring logic."""

    def test_extract_projects_finds_section(self):
        """Test extraction of projects section."""
        resume = """
        Experience
        Some job
        
        Projects
        - Built a web app using React.
        - Developed a Python script.
        
        Education
        Some degree
        """
        projects = extract_projects(resume)
        self.assertEqual(len(projects), 2)
        self.assertIn("React", projects[0]["description"])

    def test_extract_projects_no_section(self):
        """Test handling of resume without projects section."""
        resume = "Experience\nSome job\nEducation\nSome degree"
        projects = extract_projects(resume)
        self.assertEqual(projects, [])

    def test_score_project_impact_high_score(self):
        """Test scoring of a high-impact project."""
        project = {
            "name": "E-commerce App",
            "description": "Architected and developed a React web app serving 10k users, increasing sales by 20%.",
        }
        result = score_project_impact(project)
        self.assertGreater(result["impact_score"], 80)
        self.assertEqual(len(result["suggestions"]), 0)

    def test_score_project_impact_low_score(self):
        """Test scoring of a low-impact project with suggestions."""
        project = {
            "name": "My Project",
            "description": "I worked on a thing and it was good.",
        }
        result = score_project_impact(project)
        self.assertLess(result["impact_score"], 60)
        self.assertGreater(len(result["suggestions"]), 0)
        self.assertTrue(any("quantifiable metrics" in s for s in result["suggestions"]))

    def test_analyze_portfolio_empty(self):
        """Test analyze_portfolio with no projects."""
        results = analyze_portfolio("No projects here.")
        self.assertEqual(results, [])


class MetricRecognitionTests(TestCase):
    """Number formats that appear on real resumes.

    The old METRIC_PATTERNS required whitespace between a figure and its noun
    ("10 users") and matched improvement verbs only in simple past ("increased
    by"), so genuinely quantified bullets scored as unquantified and were told
    to add metrics.
    """

    def score(self, description):
        return score_project_impact({"name": "P", "description": description})

    def test_abbreviated_scale_counts_as_a_metric(self):
        """10k / 2.5M / 1B are how people write these."""
        for text in ("serving 10k users", "handling 2.5M requests", "1B rows indexed"):
            with self.subTest(text=text):
                self.assertIn("scale", self.score(text)["metrics_found"])

    def test_spelled_out_scale_still_counts(self):
        self.assertIn("scale", self.score("serving 10 million users")["metrics_found"])

    def test_improvement_verbs_count_in_any_tense(self):
        for text in (
            "increasing sales by 20%",
            "increased revenue by 30",
            "reducing latency by 40",
            "improving throughput by 15",
            "cut build times by 50",
            "grew signups by 12",
        ):
            with self.subTest(text=text):
                self.assertIn("improvement", self.score(text)["metrics_found"])

    def test_monetary_and_percentage_and_multiplier(self):
        self.assertIn("monetary", self.score("saved $40k annually")["metrics_found"])
        self.assertIn("percentage", self.score("up 12.5%")["metrics_found"])
        self.assertIn("multiplier", self.score("a 3x speedup")["metrics_found"])

    def test_prose_with_no_numbers_finds_nothing(self):
        result = self.score("I worked on a thing and it was good.")
        self.assertEqual(result["metrics_found"], [])
        self.assertTrue(
            any("quantifiable metrics" in s for s in result["suggestions"])
        )

    def test_quantified_bullet_is_not_told_to_add_metrics(self):
        result = self.score(
            "Architected and developed a React web app serving 10k users, "
            "increasing sales by 20%."
        )
        self.assertGreater(result["impact_score"], 80)
        self.assertEqual(result["suggestions"], [])

    def test_metric_labels_are_readable_and_deduplicated(self):
        """metrics_found goes back in the API response.

        It used to be built by string-mangling the regex source, producing
        entries like "X%" and "X users".
        """
        result = self.score("Grew to 10k users and 20k downloads, up 30%.")
        self.assertEqual(len(result["metrics_found"]), len(set(result["metrics_found"])))
        for label in result["metrics_found"]:
            self.assertNotIn("\\", label)
            self.assertNotIn("+", label)

    def test_metric_contribution_is_capped(self):
        """One achievement quoted several ways is still one achievement."""
        many = self.score("Grew to 10k users, 3x throughput, $40k saved, up 30%.")
        self.assertLessEqual(many["impact_score"], 100)
        self.assertGreaterEqual(len(many["metrics_found"]), 3)

    def test_score_stays_within_bounds(self):
        for text in ("", "x", "Architected 10k users 3x $40k 30% by 20 in 5 ms"):
            with self.subTest(text=text):
                score = self.score(text)["impact_score"]
                self.assertGreaterEqual(score, 0)
                self.assertLessEqual(score, 100)
