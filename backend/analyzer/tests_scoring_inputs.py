"""Three ATS factors that were scored against the wrong input.

Each of these produced a confident, specific, wrong number, with advice
attached that contradicted the resume in front of it:

* ``impact_language`` — the same four bullets scored 12/12 written with "-"
  and 0/12 written with "–", the glyph Word and Google Docs autoformat a
  leading hyphen into. The advice on the 0/12 was "Opening with verbs like
  built, led or reduced reads as achievement rather than duty", on four
  bullets opening with Built, Reduced, Led and Designed.

* ``quantification`` — the numerator and denominator were counted over
  different sets of lines, so the subtraction between them was not a count of
  anything. A resume whose every bullet contained a metric scored 0/10.

* ``contact_details`` — the phone regex matched a bare year range, and it is
  searched against the first fifteen lines, which is where a graduation year
  range lives. A resume with no phone number was awarded the points for having
  one and told "Found: email address, phone number", so the person never added
  the number an ATS actually keys on.
"""

from django.test import SimpleTestCase

from resume_analyzer.quantify_checker import flag_unquantified_bullets

from .scoring import (
    _bullet_line_indices,
    _find_phone,
    compute_score_breakdown,
    score_contact_details,
    score_impact_language,
    score_quantification,
)


STRONG_BULLETS = [
    "Built a payments API serving 2M requests per day",
    "Reduced p99 latency by 40% across three services",
    "Led a team of five engineers through a migration",
    "Designed the schema behind the reporting pipeline",
]


class BulletGlyphTests(SimpleTestCase):
    """The score must not depend on which dash the word processor produced."""

    GLYPHS = ["-", "–", "—", "*", "•", "▪", "▸", "●", "◦", "‣"]

    def score_for(self, glyph):
        lines = [f"{glyph} {bullet}" for bullet in STRONG_BULLETS]
        return score_impact_language(lines)

    def test_every_bullet_glyph_scores_the_same(self):
        scores = {glyph: self.score_for(glyph).earned for glyph in self.GLYPHS}
        self.assertEqual(
            len(set(scores.values())),
            1,
            f"the bullet character changed the score: {scores}",
        )

    def test_en_and_em_dash_bullets_score_full_marks(self):
        for glyph in ("–", "—"):
            with self.subTest(glyph=glyph):
                factor = self.score_for(glyph)
                self.assertEqual(factor.earned, factor.possible)
                self.assertEqual(factor.status, "strong")
                self.assertIn("4 of 4", factor.detail)

    def test_numbered_bullets_still_work(self):
        for marker in ("1.", "2)"):
            with self.subTest(marker=marker):
                lines = [f"{marker} {STRONG_BULLETS[0]}"]
                self.assertEqual(score_impact_language(lines).earned, 12)

    def test_dash_bullets_are_recognised_as_bullets(self):
        for glyph in ("-", "–", "—"):
            with self.subTest(glyph=glyph):
                lines = [f"{glyph} {STRONG_BULLETS[0]}"]
                self.assertEqual(_bullet_line_indices(lines), [0])

    def test_a_weak_opener_is_still_called_out(self):
        lines = [f"– Responsible for maintaining the reporting pipeline"]
        factor = score_impact_language(lines)
        self.assertEqual(factor.earned, 0)
        self.assertIn("responsible for", factor.detail)

    def test_a_hyphen_inside_a_bullet_is_not_a_marker(self):
        # Only a leading marker is stripped.
        lines = ["Built a well-tested payments API serving 2M requests per day"]
        self.assertEqual(score_impact_language(lines).earned, 12)


class PhoneDetectionTests(SimpleTestCase):
    """A year range is not a phone number."""

    REAL_NUMBERS = [
        "+44 20 7946 0958",
        "+1 202 555 0143",
        "(555) 123-4567",
        "555-123-4567",
        "555.123.4567",
        "+91-98765-43210",
        "9876543210",
        "Phone: 020 7946 0958",
    ]

    NOT_NUMBERS = [
        "BSc Computer Science 2019-2023",
        "2019 – 2023",
        "1998-2002",
        "2020 - present",
        "Class of 2019",
        "GPA 3.85",
        "London, UK",
        "Jan 2020 — Mar 2022",
        "5 years of experience",
        "Top 10% of cohort",
    ]

    def test_finds_real_phone_numbers(self):
        for text in self.REAL_NUMBERS:
            with self.subTest(text=text):
                self.assertIsNotNone(_find_phone(text))

    def test_rejects_things_that_are_not_phone_numbers(self):
        for text in self.NOT_NUMBERS:
            with self.subTest(text=text):
                self.assertIsNone(_find_phone(text), f"{text!r} matched as a phone")

    def test_header_with_a_graduation_year_range_is_not_credited_a_phone(self):
        head = (
            "John Smith\n"
            "BSc Computer Science 2019-2023\n"
            "London, UK\n"
            "john@example.com"
        )
        factor = score_contact_details(head)

        self.assertNotIn("phone number.", factor.detail.split("Consider adding:")[0])
        self.assertIn("Consider adding:", factor.detail)
        self.assertIn("phone number", factor.detail.split("Consider adding:")[1])
        # Email only: half of the ten points.
        self.assertEqual(factor.earned, 5)

    def test_header_with_a_real_number_is_credited(self):
        head = "Jane Doe\n+44 20 7946 0958\njane@example.com"
        factor = score_contact_details(head)

        self.assertIn("phone number", factor.detail.split("Consider adding:")[0])
        self.assertEqual(factor.earned, 8)

    def test_a_number_too_short_to_dial_is_rejected(self):
        self.assertIsNone(_find_phone("Room 12 34"))

    def test_a_number_too_long_for_e164_is_rejected(self):
        self.assertIsNone(_find_phone("1234 5678 9012 3456 7890"))


class QuantificationDenominatorTests(SimpleTestCase):
    """The numerator and the denominator have to count the same lines."""

    def factor_for(self, raw):
        lines = raw.splitlines()
        return score_quantification(flag_unquantified_bullets(lines), lines), lines

    def test_a_fully_quantified_resume_scores_full_marks(self):
        # Every bullet here carries a metric. This scored 0/10, and reported
        # "3 accomplishment bullet(s) have no metric".
        raw = "\n".join(
            [
                "EXPERIENCE",
                "- Built a payments API serving 2M requests per day",
                "- Reduced p99 latency by 40% across three services",
                "- Led a migration that cut build times by 12 minutes",
            ]
        )
        factor, _ = self.factor_for(raw)

        self.assertEqual(factor.earned, factor.possible)
        self.assertEqual(factor.status, "strong")
        self.assertIn("Every accomplishment bullet", factor.detail)

    def test_short_unquantified_lines_no_longer_zero_out_long_quantified_ones(self):
        """The disjoint case — the one that produced 0/10.

        The three long bullets are what ``_bullet_lines`` scores; the three
        short lines are what ``quantify_checker`` flags. Neither set contains
        the other, so ``len(bullets) - len(nudges)`` was 0.
        """
        raw = "\n".join(
            [
                "EXPERIENCE",
                "- Built a payments API serving 2M requests per day",
                "- Reduced p99 latency by 40% across three services",
                "- Led a migration that cut build times by 12 minutes",
                "Managed the team",
                "Led the redesign",
                "Designed the schema",
            ]
        )
        factor, lines = self.factor_for(raw)

        self.assertEqual(len(_bullet_line_indices(lines)), 3)
        self.assertEqual(len(flag_unquantified_bullets(lines)), 3)

        # Three of six carry a metric.
        self.assertEqual(factor.earned, 5)
        self.assertIn("3 of 6", factor.detail)

    def test_a_resume_with_no_metrics_at_all_scores_zero(self):
        raw = "\n".join(
            [
                "- Managed the release process for the platform team",
                "- Led the redesign of the checkout flow end to end",
                "- Built the internal tooling used by the support team",
            ]
        )
        factor, _ = self.factor_for(raw)
        self.assertEqual(factor.earned, 0)

    def test_a_mixed_resume_scores_in_between(self):
        raw = "\n".join(
            [
                "- Built a payments API serving 2M requests per day",
                "- Led a redesign of the checkout flow",
                "- Managed the release process for the platform team",
            ]
        )
        factor, _ = self.factor_for(raw)

        self.assertGreater(factor.earned, 0)
        self.assertLess(factor.earned, factor.possible)
        self.assertIn("2 of 3", factor.detail)

    def test_the_detail_never_names_more_bullets_than_it_counted(self):
        """``max(0, ...)`` used to hide the mismatch instead of surfacing it."""
        raw = "\n".join(
            [
                "Managed the team",
                "Led the redesign",
                "Designed the schema",
                "Owned the roadmap",
            ]
        )
        factor, lines = self.factor_for(raw)
        nudges = flag_unquantified_bullets(lines)

        self.assertLessEqual(len(nudges), len(lines))
        self.assertIn(f"of {len(nudges)}", factor.detail)

    def test_no_bullets_at_all(self):
        factor = score_quantification([], ["EXPERIENCE", "Skills: Python"])
        self.assertEqual(factor.earned, 0)
        self.assertIn("No accomplishment bullets", factor.detail)

    def test_nudges_without_a_line_index_fall_back_rather_than_going_negative(self):
        """An older caller, or a nudge dict from somewhere else."""
        lines = ["- Built a payments API serving 2M requests per day"]
        factor = score_quantification(
            [{"original_text": "x"}, {"original_text": "y"}, {"original_text": "z"}],
            lines,
        )
        # Three nudges against one bullet: clamped to zero, not negative.
        self.assertEqual(factor.earned, 0)

    def test_an_out_of_range_line_index_is_ignored(self):
        lines = ["- Built a payments API serving 2M requests per day"]
        factor = score_quantification([{"line_index": 99}], lines)
        self.assertEqual(factor.earned, factor.possible)


class BreakdownIntegrationTests(SimpleTestCase):
    """The three factors together, through the function the pipeline calls."""

    RESUME = "\n".join(
        [
            "Jane Doe",
            "+44 20 7946 0958",
            "jane@example.com",
            "linkedin.com/in/janedoe",
            "",
            "EXPERIENCE",
            "– Built a payments API serving 2M requests per day",
            "– Reduced p99 latency by 40% across three services",
            "– Led a migration that cut build times by 12 minutes",
            "",
            "EDUCATION",
            "BSc Computer Science 2019-2023",
            "",
            "SKILLS",
            "Python, Django, PostgreSQL, Docker",
        ]
    )

    def breakdown(self, text):
        lines = text.splitlines()
        return compute_score_breakdown(
            text=text,
            matched_skills=["python", "django"],
            required_skills=["python", "django"],
            detected_skills=["python", "django", "postgresql", "docker"],
            quantify_nudges=flag_unquantified_bullets(lines),
        )

    def factor(self, breakdown, key):
        return next(f for f in breakdown.factors if f.key == key)

    def test_en_dash_bullets_score_the_same_as_hyphen_bullets(self):
        en_dash = self.breakdown(self.RESUME).overall
        hyphen = self.breakdown(self.RESUME.replace("– ", "- ")).overall
        self.assertEqual(en_dash, hyphen)

    def test_a_good_resume_scores_well_on_all_three_factors(self):
        breakdown = self.breakdown(self.RESUME)

        self.assertEqual(self.factor(breakdown, "impact_language").status, "strong")
        self.assertEqual(self.factor(breakdown, "quantification").status, "strong")
        self.assertEqual(self.factor(breakdown, "contact_details").status, "strong")

    def test_the_graduation_year_range_does_not_stand_in_for_the_phone_number(self):
        without_phone = self.RESUME.replace("+44 20 7946 0958\n", "")
        breakdown = self.breakdown(without_phone)
        contact = self.factor(breakdown, "contact_details")

        self.assertLess(contact.earned, self.factor(self.breakdown(self.RESUME), "contact_details").earned)
        self.assertIn("phone number", contact.detail.split("Consider adding:")[1])

    def test_the_overall_score_still_sums_the_factors(self):
        breakdown = self.breakdown(self.RESUME)
        self.assertEqual(
            breakdown.overall,
            min(100, max(0, sum(f.earned for f in breakdown.factors))),
        )
