"""
Unit tests for Tone Analyzer.
"""

from django.test import TestCase
from .tone_analyzer import (
    analyze_pronoun_usage,
    analyze_sentiment_and_confidence,
    analyze_tone,
)


class ToneAnalyzerTests(TestCase):
    """Test suite for tone and sentiment analysis logic."""

    def test_analyze_pronoun_usage_individual(self):
        """Test detection of individual-focused pronoun usage."""
        text = "I built the system. My code was efficient. I led the project."
        result = analyze_pronoun_usage(text)
        self.assertEqual(result["dominant"], "individual")
        self.assertGreater(result["ratio"], 0.6)

    def test_analyze_pronoun_usage_team(self):
        """Test detection of team-focused pronoun usage."""
        text = "We collaborated on the design. Our team delivered the product. We partnered with stakeholders."
        result = analyze_pronoun_usage(text)
        self.assertEqual(result["dominant"], "team")
        self.assertLess(result["ratio"], 0.4)

    def test_analyze_sentiment_and_confidence_strong(self):
        """Test scoring of strong, confident language."""
        text = "I spearheaded the initiative and delivered a 20% improvement. I architected the solution."
        result = analyze_sentiment_and_confidence(text)
        self.assertGreater(result["confidence_score"], 70)
        self.assertEqual(len(result["suggestions"]), 0)

    def test_analyze_sentiment_and_confidence_weak(self):
        """Test scoring and suggestions for weak language."""
        text = "I think I helped with the project. I tried to improve things. I was responsible for some tasks."
        result = analyze_sentiment_and_confidence(text)
        self.assertLess(result["confidence_score"], 50)
        self.assertLess(result["clarity_score"], 80)
        self.assertTrue(any("weak phrases" in s for s in result["suggestions"]))

    def test_analyze_tone_full_integration(self):
        """Test full tone analysis integration."""
        text = "I led a cross-functional team. We collaborated to architect a solution that increased efficiency by 30%."
        result = analyze_tone(text)

        self.assertIn("confidence_score", result)
        self.assertIn("collaboration_score", result)
        self.assertIn("overall_tone", result)
        self.assertEqual(result["pronoun_dominance"], "balanced")


class BulletStyleVerbTests(TestCase):
    """Action verbs written the way resume bullets are actually written.

    Every entry in STRONG_CONFIDENT_PHRASES used to be anchored to a literal
    leading "i", so a resume following the bare-past-tense convention scored a
    flat 50 and was labelled Passive.
    """

    BULLET_RESUME = (
        "Led a cross-functional team of 12 engineers. "
        "Architected a payments platform handling 2 million transactions. "
        "Delivered a 30 percent reduction in checkout latency. "
        "Mentored four junior developers and partnered with product on "
        "roadmap planning across two quarters."
    )

    def test_bare_verbs_count_as_confident(self):
        result = analyze_sentiment_and_confidence(self.BULLET_RESUME)
        self.assertGreaterEqual(result["confidence_score"], 80)

    def test_bullet_resume_is_not_labelled_passive(self):
        result = analyze_tone(self.BULLET_RESUME)
        self.assertNotEqual(result["overall_tone"], "Passive / Needs Refinement")

    def test_bullet_resume_is_not_told_to_add_confident_language(self):
        result = analyze_sentiment_and_confidence(self.BULLET_RESUME)
        self.assertFalse(
            any("results-oriented" in s for s in result["suggestions"]),
            "a resume full of strong verbs should not be asked for strong verbs",
        )

    def test_i_prefixed_and_bare_forms_score_the_same(self):
        """Writing style should not change the score of the same claims."""
        bare = "Led the migration. Architected the service. Delivered the rewrite."
        prefixed = "I led the migration. I architected the service. I delivered the rewrite."
        self.assertEqual(
            analyze_sentiment_and_confidence(bare)["confidence_score"],
            analyze_sentiment_and_confidence(prefixed)["confidence_score"],
        )

    def test_second_verb_of_a_compound_clause_is_counted(self):
        """"I spearheaded X and delivered Y" reads "and delivered", not "I delivered"."""
        one = analyze_sentiment_and_confidence("I spearheaded the initiative.")
        two = analyze_sentiment_and_confidence(
            "I spearheaded the initiative and delivered a 20% improvement."
        )
        self.assertGreater(two["confidence_score"], one["confidence_score"])

    def test_bullet_style_filler_is_still_caught(self):
        """The weak list had the same "I"-anchoring problem in reverse."""
        text = (
            "Responsible for maintaining the build. "
            "Helped with the release process. "
            "Worked on various tickets. "
            "Assisted with documentation. "
            "Participated in planning meetings and was involved in code review."
        )
        result = analyze_sentiment_and_confidence(text)
        self.assertLess(result["confidence_score"], 50)
        self.assertTrue(any("weak phrases" in s for s in result["suggestions"]))


class CorpusAdviceThresholdTests(TestCase):
    """Whole-resume judgements should not be made from a fragment."""

    def test_short_strong_snippet_gets_no_collaboration_nag(self):
        result = analyze_sentiment_and_confidence(
            "I spearheaded the initiative and delivered a 20% improvement. "
            "I architected the solution."
        )
        self.assertEqual(result["suggestions"], [])

    def test_long_solo_resume_does_get_the_collaboration_nudge(self):
        text = " ".join(
            [
                "Architected the billing service and delivered the migration.",
                "Owned the deployment pipeline end to end.",
                "Launched three internal tools over eighteen months.",
                "Secured budget for the observability rewrite.",
                "Established the on-call rotation and the incident review process.",
                "Overhauled the release checklist and shipped it to production.",
            ]
        )
        self.assertGreaterEqual(len(text.split()), 40)
        result = analyze_sentiment_and_confidence(text)
        self.assertTrue(any("collaboration" in s for s in result["suggestions"]))

    def test_weak_phrase_advice_is_not_length_gated(self):
        """Concrete, locatable advice stays regardless of length."""
        result = analyze_sentiment_and_confidence(
            "Helped with it. Worked on it. Responsible for it."
        )
        self.assertTrue(any("weak phrases" in s for s in result["suggestions"]))

    def test_scores_stay_within_bounds(self):
        for text in ("", "x", "Led. " * 40, "Helped with it. " * 40):
            with self.subTest(text=text[:20]):
                result = analyze_sentiment_and_confidence(text)
                for key in ("confidence_score", "collaboration_score", "clarity_score"):
                    self.assertGreaterEqual(result[key], 0)
                    self.assertLessEqual(result[key], 100)

    def test_analyze_tone_rejects_non_string_input(self):
        self.assertEqual(analyze_tone(None), {})
        self.assertEqual(analyze_tone(""), {})
        self.assertEqual(analyze_tone(123), {})
