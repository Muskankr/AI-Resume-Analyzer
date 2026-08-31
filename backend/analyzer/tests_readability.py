"""
Unit tests for the Resume Readability and Cognitive Load Analyzer.

Validates score calculations, sentence boundary detection, and edge cases.
"""

from django.test import TestCase
from .readability_analyzer import (
    count_syllables,
    analyze_sentence,
    calculate_cognitive_load,
)


class ReadabilityTests(TestCase):
    """Test suite for readability and cognitive load analysis logic."""

    def test_count_syllables_basic(self):
        """Test basic syllable counting."""
        self.assertEqual(count_syllables("cat"), 1)
        self.assertEqual(count_syllables("computer"), 3)
        self.assertEqual(count_syllables("beautiful"), 3)
        self.assertEqual(count_syllables("the"), 1)

    def test_analyze_sentence_simple(self):
        """Test analysis of a simple, clear sentence."""
        sentence = "I developed a new feature."
        metrics = analyze_sentence(sentence)

        self.assertEqual(metrics["word_count"], 5)
        self.assertFalse(metrics["is_passive"])
        self.assertFalse(metrics["has_jargon"])

    def test_analyze_sentence_complex(self):
        """Test analysis of a complex, passive sentence with jargon."""
        sentence = (
            "The paradigm shift was leveraged to synergize holistic core competencies."
        )
        metrics = analyze_sentence(sentence)

        self.assertTrue(metrics["is_passive"])
        self.assertTrue(metrics["has_jargon"])
        self.assertGreater(metrics["avg_syllables"], 1.5)

    def test_calculate_cognitive_load_clean_resume(self):
        """Test that a clean, punchy resume scores high."""
        resume = """
        - Developed a React web app.
        - Led a team of 5 engineers.
        - Increased sales by 20%.
        """
        result = calculate_cognitive_load(resume)

        self.assertGreater(result["score"], 80)
        self.assertEqual(len(result["heavy_sentences"]), 0)
        self.assertTrue(
            any("excellent readability" in s.lower() for s in result["suggestions"])
        )

    def test_calculate_cognitive_load_heavy_resume(self):
        """Test that a resume with long, passive, jargon-filled sentences scores low."""
        resume = """
        I was responsible for the utilization of holistic paradigms to synergize cross-functional teams, 
        which was a very long and complex sentence that had way too many words and was written in the passive voice.
        """
        result = calculate_cognitive_load(resume)

        self.assertLess(result["score"], 80)
        self.assertGreater(len(result["heavy_sentences"]), 0)
        self.assertTrue(
            any("passive voice" in s.lower() for s in result["suggestions"])
        )
        self.assertTrue(any("jargon" in s.lower() for s in result["suggestions"]))

    def test_calculate_cognitive_load_empty_input(self):
        """Test that empty input is handled gracefully."""
        result = calculate_cognitive_load("")
        self.assertEqual(result["score"], 100)
        self.assertEqual(result["heavy_sentences"], [])
        self.assertEqual(result["suggestions"], [])
