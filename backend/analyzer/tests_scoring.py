"""Tests for the multi-factor ATS scoring engine (``analyzer.scoring``)."""

from unittest.mock import patch

from django.test import TestCase

from analyzer.scoring import (
    TOTAL_POINTS,
    WEIGHTS,
    compute_score_breakdown,
    score_contact_details,
    score_impact_language,
    score_keyword_match,
    score_length_and_format,
    score_quantification,
    score_readability,
    score_sections,
)
from analyzer.services import analyze_resume
from resume_analyzer.quantify_checker import flag_unquantified_bullets

STRONG_RESUME = """Jane Doe
jane.doe@example.com | +1 415 555 0134 | linkedin.com/in/janedoe

Summary
Backend engineer with six years building payment systems.

Experience
- Led a team of 5 engineers to rebuild the billing service, cutting invoice errors by 42%
- Reduced API p95 latency from 900ms to 180ms by adding query-level caching
- Migrated 120 endpoints from Flask to Django REST Framework over two quarters
- Automated the release pipeline, saving roughly 20 engineer hours per week
- Scaled the ingestion worker pool to handle 1.2M events per day
- Mentored 3 junior engineers through their first production launches

Education
B.S. Computer Science, State University

Skills
Python, Django, PostgreSQL, Docker, SQL, Redis, Celery

Projects
- Built an open-source rate limiter used by 400+ repositories
- Designed a schema migration tool adopted by 4 internal teams
"""

KEYWORD_STUFFED_RESUME = """Python Django React JavaScript SQL PostgreSQL Docker
Git GitHub HTML CSS TypeScript Node.js MongoDB Excel Pandas NumPy
"""


class FactorTests(TestCase):
    def test_keyword_match_scales_with_coverage(self):
        full = score_keyword_match(["python", "sql"], ["python", "sql"], ["python", "sql"])
        half = score_keyword_match(["python"], ["python", "sql"], ["python"])
        none = score_keyword_match([], ["python", "sql"], [])

        self.assertEqual(full.earned, WEIGHTS["keyword_match"])
        self.assertEqual(half.earned, WEIGHTS["keyword_match"] // 2)
        self.assertEqual(none.earned, 0)

    def test_keyword_match_without_a_target_falls_back_to_breadth(self):
        factor = score_keyword_match([], [], ["python", "sql", "docker"])
        self.assertGreater(factor.earned, 0)
        self.assertLess(factor.earned, WEIGHTS["keyword_match"])
        self.assertIn("No target role", factor.detail)

    def test_keyword_dump_cannot_max_the_fallback_beyond_its_cap(self):
        many = [f"skill{index}" for index in range(50)]
        factor = score_keyword_match([], [], many)
        self.assertEqual(factor.earned, WEIGHTS["keyword_match"])

    def test_sections_counts_the_four_expected_headings(self):
        self.assertEqual(score_sections(STRONG_RESUME).earned, WEIGHTS["sections"])

        partial = score_sections("Experience\nSkills\nPython developer")
        self.assertEqual(partial.earned, round(WEIGHTS["sections"] * 0.5))
        self.assertIn("education", partial.detail)

    def test_sections_recognises_common_heading_variants(self):
        variants = "Employment History\nAcademic Background\nTechnologies\nPortfolio"
        self.assertEqual(score_sections(variants).earned, WEIGHTS["sections"])

    def test_contact_details_weights_email_highest(self):
        email_only = score_contact_details("Reach me at jane@example.com")
        nothing = score_contact_details("Jane Doe\nBackend engineer")

        self.assertEqual(nothing.earned, 0)
        self.assertGreaterEqual(email_only.earned, WEIGHTS["contact_details"] * 0.5)
        self.assertIn("discards the resume", nothing.detail)

    def test_contact_details_full_marks_with_email_phone_and_link(self):
        factor = score_contact_details(STRONG_RESUME)
        self.assertEqual(factor.earned, WEIGHTS["contact_details"])
        self.assertEqual(factor.status, "strong")

    def test_impact_language_rewards_action_verbs(self):
        strong = score_impact_language(STRONG_RESUME.splitlines())
        self.assertGreaterEqual(strong.earned, WEIGHTS["impact_language"] * 0.5)

    def test_impact_language_calls_out_duty_phrasing(self):
        duties = [
            "- Responsible for maintaining the internal reporting dashboard system",
            "- Worked on the payments team supporting existing integration flows",
            "- Helped with quarterly release planning and documentation upkeep",
        ]
        factor = score_impact_language(duties)
        self.assertEqual(factor.earned, 0)
        self.assertIn("responsible for", factor.detail)

    def test_impact_language_handles_a_resume_with_no_bullets(self):
        factor = score_impact_language(["Jane Doe", "Engineer"])
        self.assertEqual(factor.earned, 0)
        self.assertIn("No accomplishment bullets", factor.detail)

    def test_quantification_uses_the_existing_nudge_checker(self):
        lines = STRONG_RESUME.splitlines()
        nudges = flag_unquantified_bullets(lines)
        factor = score_quantification(nudges, lines)

        self.assertGreater(factor.earned, 0)
        self.assertLessEqual(factor.earned, WEIGHTS["quantification"])

    def test_quantification_penalises_bullets_without_metrics(self):
        lines = [
            "- Improved the checkout experience for customers across the platform",
            "- Optimized the search service to handle more concurrent traffic daily",
        ]
        nudges = flag_unquantified_bullets(lines)
        factor = score_quantification(nudges, lines)

        self.assertEqual(factor.earned, 0)
        self.assertIn("no metric", factor.detail)

    def test_readability_bands(self):
        easy = score_readability(65.0, "easy")
        moderate = score_readability(40.0, "moderate")
        dense = score_readability(15.0, "dense")
        very_dense = score_readability(2.0, "dense")

        self.assertEqual(easy.earned, WEIGHTS["readability"])
        self.assertGreater(moderate.earned, dense.earned)
        self.assertGreater(dense.earned, very_dense.earned)

    def test_readability_without_a_score_is_neutral_not_zero(self):
        factor = score_readability(None)
        self.assertEqual(factor.earned, round(WEIGHTS["readability"] * 0.5))

    def test_length_and_format_prefers_the_ideal_range(self):
        ideal_text = " ".join(["word"] * 500) + "\n" + "\n".join(
            [f"- Delivered improvement number {index} for the platform team" for index in range(6)]
        )
        short_text = "Jane Doe, engineer."

        ideal = score_length_and_format(ideal_text, ideal_text.splitlines())
        short = score_length_and_format(short_text, short_text.splitlines())

        self.assertGreater(ideal.earned, short.earned)
        self.assertIn("bullet", ideal.detail)

    def test_length_and_format_handles_empty_text(self):
        factor = score_length_and_format("", [])
        self.assertEqual(factor.earned, 0)


class BreakdownTests(TestCase):
    def _breakdown(self, text, matched=(), required=(), detected=()):
        lines = text.splitlines()
        return compute_score_breakdown(
            text=text,
            matched_skills=list(matched),
            required_skills=list(required),
            detected_skills=list(detected),
            readability_score=45.0,
            readability_label="moderate",
            quantify_nudges=flag_unquantified_bullets(lines),
        )

    def test_weights_sum_to_one_hundred(self):
        self.assertEqual(TOTAL_POINTS, 100)

    def test_overall_is_the_sum_of_the_factors(self):
        breakdown = self._breakdown(STRONG_RESUME, ["python"], ["python"], ["python"])
        self.assertEqual(breakdown.overall, sum(f.earned for f in breakdown.factors))

    def test_every_weighted_factor_is_reported(self):
        breakdown = self._breakdown(STRONG_RESUME)
        self.assertEqual({f.key for f in breakdown.factors}, set(WEIGHTS))

    def test_a_well_rounded_resume_outscores_a_keyword_dump(self):
        """The point of the issue: full keyword coverage alone should not win."""
        skills = ["python", "django", "sql", "docker"]

        stuffed = self._breakdown(KEYWORD_STUFFED_RESUME, skills, skills, skills)
        rounded = self._breakdown(STRONG_RESUME, skills, skills, skills)

        self.assertEqual(
            stuffed.factors[0].earned,
            rounded.factors[0].earned,
            "both cover every keyword, so the keyword factor should tie",
        )
        self.assertGreater(rounded.overall, stuffed.overall)

    def test_scores_stay_inside_zero_to_one_hundred(self):
        for text in ("", STRONG_RESUME, KEYWORD_STUFFED_RESUME):
            with self.subTest(text=text[:20]):
                breakdown = self._breakdown(text)
                self.assertGreaterEqual(breakdown.overall, 0)
                self.assertLessEqual(breakdown.overall, 100)

    def test_each_factor_stays_inside_its_own_weight(self):
        breakdown = self._breakdown(STRONG_RESUME, ["python"], ["python"], ["python"])
        for factor in breakdown.factors:
            with self.subTest(factor=factor.key):
                self.assertGreaterEqual(factor.earned, 0)
                self.assertLessEqual(factor.earned, factor.possible)
                self.assertEqual(factor.possible, WEIGHTS[factor.key])

    def test_summary_names_the_weakest_factor(self):
        breakdown = self._breakdown(KEYWORD_STUFFED_RESUME)
        self.assertTrue(breakdown.summary)
        self.assertIn("opportunity", breakdown.summary.lower())

    def test_serialises_to_plain_json_types(self):
        payload = self._breakdown(STRONG_RESUME).as_dict()

        self.assertEqual(set(payload), {"overall", "summary", "factors"})
        self.assertIsInstance(payload["overall"], int)
        for factor in payload["factors"]:
            self.assertEqual(
                set(factor), {"key", "label", "earned", "possible", "status", "detail"}
            )
            self.assertIn(factor["status"], {"strong", "partial", "weak"})


class _FakePage:
    def __init__(self, text):
        self._text = text

    def extract_text(self):
        return self._text


class _FakePDF:
    def __init__(self, text):
        self.pages = [_FakePage(text)]

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class AnalyzeResumeIntegrationTests(TestCase):
    @patch("analyzer.services.pdfplumber.open")
    def test_analysis_includes_a_breakdown(self, mock_open):
        mock_open.return_value = _FakePDF(STRONG_RESUME)
        result = analyze_resume("dummy.pdf", "Backend Developer")

        breakdown = result["score_breakdown"]
        self.assertEqual(breakdown["overall"], sum(f["earned"] for f in breakdown["factors"]))
        self.assertEqual(len(breakdown["factors"]), len(WEIGHTS))

    @patch("analyzer.services.pdfplumber.open")
    def test_legacy_score_field_is_unchanged(self, mock_open):
        """`score` is persisted and read by the leaderboard, digest and charts."""
        mock_open.return_value = _FakePDF("HTML CSS JavaScript")
        result = analyze_resume("dummy.pdf", "Frontend Developer")

        expected = int(len(result["matched_skills"]) / len(
            result["matched_skills"] + result["missing_skills"]
        ) * 100)
        self.assertEqual(result["score"], expected)

    @patch("analyzer.services.pdfplumber.open")
    def test_breakdown_reuses_the_pipeline_readability_value(self, mock_open):
        mock_open.return_value = _FakePDF(STRONG_RESUME)
        result = analyze_resume("dummy.pdf", "Backend Developer")

        readability = next(
            f for f in result["score_breakdown"]["factors"] if f["key"] == "readability"
        )
        self.assertIn(str(result["readability_score"]), readability["detail"])

    @patch("analyzer.services.pdfplumber.open")
    def test_empty_resume_scores_zero_without_raising(self, mock_open):
        mock_open.return_value = _FakePDF("")
        result = analyze_resume("dummy.pdf", "Backend Developer")

        self.assertEqual(result["score_breakdown"]["overall"], 0)
