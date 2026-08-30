"""
Unit tests for Skill Proficiency Estimator.
"""

from django.test import TestCase
from .proficiency_estimator import (
    analyze_skill_context,
    build_skill_context,
    estimate_all_proficiencies,
)


class ProficiencyEstimatorTests(TestCase):
    """Test suite for proficiency estimation logic."""

    def test_analyze_skill_context_beginner(self):
        """Test detection of beginner-level context."""
        resume = "I have basic knowledge of Python and helped with some scripts."
        result = analyze_skill_context(resume, "Python")
        self.assertEqual(result["estimated_level"], "Beginner")
        self.assertLess(result["confidence_score"], 50)

    def test_analyze_skill_context_expert_with_metrics(self):
        """Test detection of expert-level context with metrics."""
        resume = "I have 8+ years of experience in Python. I architected a system serving 10 million users, optimizing performance by 40%."
        result = analyze_skill_context(resume, "Python")
        self.assertEqual(result["estimated_level"], "Expert")
        self.assertGreater(result["confidence_score"], 80)
        self.assertEqual(len(result["warnings"]), 0)

    def test_analyze_skill_context_unsupported_expert_claim(self):
        """Test flagging of unsupported expert claims."""
        resume = "I am a subject matter expert in Python."
        result = analyze_skill_context(resume, "Python")
        self.assertEqual(result["estimated_level"], "Expert")
        self.assertGreater(len(result["warnings"]), 0)
        self.assertIn("lacks quantifiable metrics", result["warnings"][0])

    def test_estimate_all_proficiencies_empty(self):
        """Test handling of empty skills list."""
        results = estimate_all_proficiencies("Some text", [])
        self.assertEqual(results, [])

    def test_estimate_all_proficiencies_sorting(self):
        """Test that results are sorted by confidence score descending."""
        resume = "Basic knowledge of Java. 10+ years of experience in Python, architected systems."
        skills = ["Java", "Python"]
        results = estimate_all_proficiencies(resume, skills)
        self.assertEqual(results[0]["skill"], "Python")
        self.assertEqual(results[1]["skill"], "Java")
        self.assertGreater(
            results[0]["confidence_score"], results[1]["confidence_score"]
        )


class SkillContextWindowTests(TestCase):
    """What counts as evidence for a skill.

    Previously only sentences literally containing the skill token were read,
    so the sentence next door -- which is where people put the impact and the
    numbers -- was discarded.
    """

    EXPERT_RESUME = (
        "I have 8+ years of experience in Python. "
        "I architected a system serving 10 million users, "
        "optimizing performance by 40%."
    )

    def test_metrics_in_the_adjacent_sentence_are_counted(self):
        result = analyze_skill_context(self.EXPERT_RESUME, "Python")
        self.assertEqual(result["estimated_level"], "Expert")
        self.assertGreater(result["confidence_score"], 80)

    def test_quantified_expertise_is_not_flagged_unsupported(self):
        """The evidence is one sentence away; we should not accuse the user."""
        result = analyze_skill_context(self.EXPERT_RESUME, "Python")
        self.assertEqual(result["warnings"], [])

    def test_context_snippets_include_the_neighbour(self):
        result = analyze_skill_context(self.EXPERT_RESUME, "Python")
        joined = " ".join(result["context_snippets"])
        self.assertIn("architected", joined)
        self.assertIn("10 million", joined)

    def test_neighbour_cannot_donate_a_proficiency_level(self):
        """A window must not let one skill inherit another's level.

        "Basic knowledge of Java" is a beginner claim regardless of the Python
        sentence beside it. Level comes from the sentence naming the skill;
        only metrics are read from the wider window.
        """
        resume = (
            "Basic knowledge of Java. "
            "10+ years of experience in Python, architected systems."
        )
        java = analyze_skill_context(resume, "Java")
        python = analyze_skill_context(resume, "Python")

        self.assertEqual(java["estimated_level"], "Beginner")
        self.assertEqual(python["estimated_level"], "Expert")
        self.assertGreater(python["confidence_score"], java["confidence_score"])

    def test_unsupported_claim_still_flagged_when_nothing_corroborates_it(self):
        result = analyze_skill_context("I am a subject matter expert in Go.", "Go")
        self.assertEqual(result["estimated_level"], "Expert")
        self.assertIn("lacks quantifiable metrics", result["warnings"][0])

    def test_skill_never_mentioned_yields_no_context(self):
        result = analyze_skill_context("I write a lot of Python.", "Haskell")
        self.assertEqual(result["context_snippets"], [])
        self.assertEqual(result["estimated_level"], "Intermediate")


class BuildSkillContextTests(TestCase):
    """The primary/supporting split, tested directly."""

    SENTENCES = ["alpha one.", "beta two.", "gamma three.", "delta four."]

    def test_primary_is_only_the_mentioning_sentence(self):
        primary, _ = build_skill_context(self.SENTENCES, "gamma")
        self.assertEqual(primary, ["gamma three."])

    def test_supporting_adds_one_sentence_either_side(self):
        _, supporting = build_skill_context(self.SENTENCES, "gamma")
        self.assertEqual(supporting, ["beta two.", "gamma three.", "delta four."])

    def test_window_clamps_at_document_start_and_end(self):
        _, first = build_skill_context(self.SENTENCES, "alpha")
        _, last = build_skill_context(self.SENTENCES, "delta")
        self.assertEqual(first, ["alpha one.", "beta two."])
        self.assertEqual(last, ["gamma three.", "delta four."])

    def test_overlapping_windows_do_not_repeat_a_sentence(self):
        _, supporting = build_skill_context(
            ["x one.", "x two.", "x three."], "x"
        )
        self.assertEqual(len(supporting), len(set(supporting)))

    def test_document_order_is_preserved(self):
        _, supporting = build_skill_context(self.SENTENCES, "beta")
        self.assertEqual(supporting, ["alpha one.", "beta two.", "gamma three."])

    def test_absent_skill_returns_two_empty_lists(self):
        self.assertEqual(build_skill_context(self.SENTENCES, "omega"), ([], []))
