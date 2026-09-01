"""How ``BulletOptimizer`` reads a bullet a person actually wrote.

A flat ``tests_*.py`` module because that is the layout Django's discovery
reaches in this app; ``analyzer/tests/test_bullet_optimizer.py`` covers part of
this and has never been collected (#913).

Every case here is a line that a resume produces and the previous
implementation misread — a leading bullet glyph, a comma stuck to the verb, a
year mistaken for a metric, a passive construction past the third word.
"""

from django.test import TestCase

from analyzer.bullet_optimizer import BulletOptimizer
from analyzer.scoring import ACTION_VERBS


class BulletMarkerTests(TestCase):
    """`words[0]` was the marker, not the verb.

    pdfplumber preserves the glyph, and the serializer accepts whatever the
    user pasted, so a bullet arriving with its marker is the common case.
    """

    STRONG = "Spearheaded a caching layer, cutting API latency by 40%."

    MARKERS = ["- ", "* ", "• ", "– ", "— ", "▪ ", "1. ", "2) ", "  - ", ""]

    def test_the_verb_is_found_behind_every_marker(self):
        for marker in self.MARKERS:
            with self.subTest(marker=repr(marker)):
                analysis = BulletOptimizer.analyze(marker + self.STRONG)
                self.assertTrue(
                    analysis.has_action_verb,
                    f"the marker {marker!r} hid the verb behind it",
                )

    def test_the_marker_does_not_change_the_score(self):
        scores = {
            BulletOptimizer.analyze(marker + self.STRONG).score
            for marker in self.MARKERS
        }
        self.assertEqual(
            len(scores),
            1,
            f"the same bullet scored differently depending on its marker: {scores}",
        )

    def test_the_original_is_returned_with_its_marker_intact(self):
        """The user's line comes back as they wrote it; only matching is normalised."""
        bullet = "• " + self.STRONG
        self.assertEqual(BulletOptimizer.analyze(bullet).original, bullet)

    def test_an_empty_bullet_does_not_raise(self):
        for text in ("", "   ", "•", "- "):
            with self.subTest(text=repr(text)):
                analysis = BulletOptimizer.analyze(text)
                self.assertFalse(analysis.has_action_verb)
                self.assertEqual(analysis.score, 15)  # active voice only


class ActionVerbTests(TestCase):
    def test_punctuation_attached_to_the_verb_is_ignored(self):
        analysis = BulletOptimizer.analyze("Developed, tested and shipped the service.")
        self.assertTrue(analysis.has_action_verb)

    def test_the_vocabulary_is_the_one_scoring_uses(self):
        """Two lists meant `built`, `led` and `designed` scored zero here."""
        self.assertEqual(set(BulletOptimizer.ACTION_VERBS), set(ACTION_VERBS))

    def test_common_resume_verbs_are_recognised(self):
        for verb in ("Built", "Led", "Designed", "Migrated", "Reduced", "Shipped"):
            with self.subTest(verb=verb):
                analysis = BulletOptimizer.analyze(f"{verb} the internal billing tool.")
                self.assertTrue(
                    analysis.has_action_verb,
                    f'"{verb}" is a verb this tool tells people to use',
                )

    def test_a_noun_opening_is_not_an_action_verb(self):
        analysis = BulletOptimizer.analyze("Responsibilities included the billing tool.")
        self.assertFalse(analysis.has_action_verb)


class MetricDetectionTests(TestCase):
    """`\\b\\d+\\b` matched every digit in the language."""

    QUANTIFIED = [
        "Reduced latency by 40%.",
        "Cut spend by 20 percent.",
        "Increased revenue by $1.5M.",
        "Saved £250k across the portfolio.",
        "Handled 12,000 requests per second.",
        "Mentored 6 engineers.",
        "Cut build time from 45 minutes to 4 minutes.",
        "Improved throughput 3x.",
        "Owned a team of 12.",
        "Resolved over 300 tickets.",
        "Closed 40+ incidents.",
    ]

    NOT_QUANTIFIED = [
        "Wrote services in Python 3 during 2021.",
        "Migrated the platform to Django 4.",
        "Worked on the team from 2019 to 2023.",
        "Shipped version 2 of the mobile app.",
        "Studied at university between 2015 and 2019.",
    ]

    def test_a_real_metric_is_recognised(self):
        for bullet in self.QUANTIFIED:
            with self.subTest(bullet=bullet):
                self.assertTrue(
                    BulletOptimizer.analyze(bullet).has_metric,
                    "this states a measurable outcome",
                )

    def test_a_year_or_version_number_is_not_a_metric(self):
        for bullet in self.NOT_QUANTIFIED:
            with self.subTest(bullet=bullet):
                self.assertFalse(
                    BulletOptimizer.analyze(bullet).has_metric,
                    "a version or a date is not a quantified achievement, and "
                    "treating it as one tells the user they need no metric",
                )

    def test_an_unquantified_bullet_is_told_to_add_a_number(self):
        analysis = BulletOptimizer.analyze("Wrote services in Python 3 during 2021.")
        self.assertTrue(
            any("quantifiable" in s for s in analysis.suggestions),
            analysis.suggestions,
        )


class PassiveVoiceTests(TestCase):
    """The old check read `words[:3]`, where the resume passive is not."""

    def test_a_passive_construction_past_the_third_word_is_caught(self):
        analysis = BulletOptimizer.analyze(
            "The billing migration was completed by the platform team."
        )
        self.assertTrue(analysis.is_passive)

    def test_a_bullet_opening_with_a_copula_is_flagged(self):
        self.assertTrue(BulletOptimizer.analyze("Was responsible for the team.").is_passive)

    def test_an_active_bullet_is_not_flagged(self):
        for bullet in (
            "Spearheaded a caching layer, cutting API latency by 40%.",
            "Built the billing service and shipped it on time.",
            "Led a team of five engineers.",
        ):
            with self.subTest(bullet=bullet):
                self.assertFalse(BulletOptimizer.analyze(bullet).is_passive)

    def test_an_irregular_participle_is_recognised(self):
        analysis = BulletOptimizer.analyze("The reporting suite was built by contractors.")
        self.assertTrue(analysis.is_passive)


class StarExtractionTests(TestCase):
    def test_a_preposition_inside_a_word_is_not_a_match(self):
        """`(?:to|for)` with no boundary matched the "to" inside "into"."""
        star = BulletOptimizer._extract_star_components(
            "Migrated the data into legacy storage"
        )
        self.assertIsNone(star["task"])

    def test_in_inside_within_is_not_a_context(self):
        star = BulletOptimizer._extract_star_components(
            "Delivered the rollout within budget"
        )
        self.assertIsNone(star["situation"])

    def test_a_trailing_participial_clause_is_a_result(self):
        star = BulletOptimizer._extract_star_components(
            "Spearheaded a caching layer, cutting API latency by 40%."
        )
        self.assertIsNotNone(star["result"])

    def test_a_quantified_change_is_a_result(self):
        for bullet in (
            "Increased sales by $1.5M and improved retention by 15%.",
            "Reduced p99 latency to under 200ms.",
            "Cut build times from 12 minutes to 3 minutes.",
        ):
            with self.subTest(bullet=bullet):
                star = BulletOptimizer._extract_star_components(bullet)
                self.assertIsNotNone(star["result"], "this bullet states its outcome")

    def test_a_bullet_with_no_outcome_has_no_result(self):
        star = BulletOptimizer._extract_star_components("Managed the internal wiki.")
        self.assertIsNone(star["result"])

    def test_the_action_phrase_survives_a_comma_after_the_verb(self):
        star = BulletOptimizer._extract_star_components(
            "Designed, built and shipped the billing service."
        )
        self.assertIsNotNone(star["action"])


class ScoreTests(TestCase):
    def test_a_bullet_with_nothing_going_for_it_scores_nothing(self):
        """It used to start at 50 — a pass, for the bullet most in need of a rewrite."""
        analysis = BulletOptimizer.analyze("Was responsible for managing the team.")
        self.assertEqual(analysis.score, 0)
        self.assertGreater(len(analysis.suggestions), 2)

    def test_a_bullet_with_everything_scores_at_the_top(self):
        analysis = BulletOptimizer.analyze(
            "Spearheaded a caching layer, cutting API latency by 40%."
        )
        self.assertGreaterEqual(analysis.score, 90)
        self.assertEqual(analysis.suggestions, [])

    def test_the_score_never_leaves_the_scale(self):
        for bullet in (
            "",
            "Managed.",
            "Spearheaded the migration in the Payments platform to cut costs, "
            "reducing spend by $2M and latency by 40% across 12 services.",
        ):
            with self.subTest(bullet=bullet[:32]):
                score = BulletOptimizer.analyze(bullet).score
                self.assertGreaterEqual(score, 0)
                self.assertLessEqual(score, 100)

    def test_improving_a_bullet_raises_its_score(self):
        weak = BulletOptimizer.analyze("Was responsible for the caching layer.")
        better = BulletOptimizer.analyze("Built the caching layer.")
        best = BulletOptimizer.analyze(
            "Built the caching layer, cutting API latency by 40%."
        )

        self.assertLess(weak.score, better.score)
        self.assertLess(better.score, best.score)


class RewriteDeterminismTests(TestCase):
    """`list(set(...))` reordered between processes and between clicks."""

    BULLET = "Was responsible for the billing service."

    def test_the_same_bullet_gives_the_same_rewrites_in_the_same_order(self):
        first = BulletOptimizer.analyze(self.BULLET).rewrites
        for _ in range(25):
            self.assertEqual(BulletOptimizer.analyze(self.BULLET).rewrites, first)

    def test_the_most_important_fix_comes_first(self):
        """Order carries meaning now, so it is worth pinning."""
        rewrites = BulletOptimizer.analyze(self.BULLET).rewrites
        self.assertTrue(rewrites[0].startswith("Spearheaded initiative:"))

    def test_no_more_than_three_rewrites_are_offered(self):
        self.assertLessEqual(len(BulletOptimizer.analyze(self.BULLET).rewrites), 3)

    def test_a_bullet_needing_nothing_still_gets_one_suggestion(self):
        rewrites = BulletOptimizer.analyze(
            "Spearheaded a caching layer, cutting API latency by 40%."
        ).rewrites
        self.assertEqual(len(rewrites), 1)
        self.assertTrue(rewrites[0].startswith("Optimized:"))

    def test_rewrites_are_unique(self):
        rewrites = BulletOptimizer.analyze(self.BULLET).rewrites
        self.assertEqual(len(rewrites), len(set(rewrites)))
