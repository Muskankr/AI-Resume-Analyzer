"""
Unit tests for the Cliché Detector module.

Validates detection accuracy and suggestion generation across various edge cases.
"""

from django.test import TestCase
from .cliche_detector import (
    PASSIVE_INDICATORS,
    analyze_and_suggest,
    detect_cliches,
    detect_passive_voice,
)


class ClicheDetectorTests(TestCase):
    """Test suite for cliché detection logic."""

    def test_detect_cliches_finds_exact_match(self):
        """Test that exact cliché phrases are detected."""
        text = "I was responsible for managing the team."
        detections = detect_cliches(text)
        self.assertEqual(len(detections), 1)
        self.assertEqual(detections[0]["phrase"], "responsible for")
        self.assertEqual(detections[0]["suggestion"], "spearheaded")

    def test_detect_cliches_case_insensitive(self):
        """Test that detection is case-insensitive.

        The expected phrase was "Was Responsible For". The pattern is
        `\bresponsible for\b` and does not include "was" — and the test one
        above asserts "responsible for" for the same construction, so the two
        contradicted each other. `detect_cliches` returns the matched span
        with the casing it was written in, which is what this now checks.
        """
        text = "I Was Responsible For the project."
        detections = detect_cliches(text)
        self.assertEqual(len(detections), 1)
        self.assertEqual(detections[0]["phrase"], "Responsible For")

    def test_detect_cliches_no_false_positives(self):
        """Test that legitimate technical terms are not flagged."""
        text = "Utilized Python to build a robust backend system."
        # Note: 'utilized' is in the dictionary, so it WILL be flagged.
        # Let's test a truly safe phrase.
        safe_text = (
            "Developed a microservices architecture using Docker and Kubernetes."
        )
        detections = detect_cliches(safe_text)
        self.assertEqual(len(detections), 0)

    def test_detect_passive_voice_finds_indicators(self):
        """Test that passive voice indicators are detected."""
        text = "The project was completed by the team."
        detections = detect_passive_voice(text)
        self.assertGreater(len(detections), 0)
        self.assertIn("was completed", detections[0]["phrase"].lower())

    def test_analyze_and_suggest_empty_input(self):
        """Test that empty input returns safe defaults."""
        result = analyze_and_suggest("")
        self.assertEqual(result["detections"], [])
        self.assertEqual(result["modernized_text"], "")
        self.assertEqual(result["score"], 100)

    def test_analyze_and_suggest_modernization(self):
        """Test that the modernized text correctly replaces clichés.

        This asserted that both "executed" (for "tasked with") and
        "orchestrated" (for "handling") appear in the result. There is no
        sentence in which both do: "Executed orchestrated the database
        migration" is two verbs and no clause. "Tasked with" is a lead-in —
        it introduces the real verb rather than being it — so it is dropped
        and the verb it introduced is what gets modernised.
        """
        text = "Tasked with handling the database migration."
        result = analyze_and_suggest(text)

        self.assertNotIn("tasked with", result["modernized_text"].lower())
        self.assertNotIn("handling", result["modernized_text"].lower())
        self.assertIn("orchestrated", result["modernized_text"].lower())
        self.assertEqual(
            result["modernized_text"], "Orchestrated the database migration."
        )

    def test_analyze_and_suggest_score_calculation(self):
        """Test that the impact score decreases with more issues."""
        clean_text = "Led the development of a new feature."
        dirty_text = "I was responsible for helping with the thing and was tasked with duties included."

        clean_result = analyze_and_suggest(clean_text)
        dirty_result = analyze_and_suggest(dirty_text)

        self.assertGreater(clean_result["score"], dirty_result["score"])
        self.assertEqual(dirty_result["total_issues"], len(dirty_result["detections"]))


class PassiveVoiceOffsetTests(TestCase):
    """`start` came from `text.lower().find(...)`.

    `find` returns the *first* occurrence in the string, not the one the loop
    is currently looking at, so every repeat of a phrase reported the same
    span. `ClicheDetector.tsx` highlights from these offsets.
    """

    def test_each_occurrence_reports_its_own_span(self):
        text = "Was promoted twice. The report was promoted again later."
        detections = detect_passive_voice(text)

        self.assertEqual(len(detections), 2)
        self.assertEqual((detections[0]["start"], detections[0]["end"]), (0, 12))
        self.assertEqual((detections[1]["start"], detections[1]["end"]), (31, 43))

    def test_every_span_slices_back_to_the_phrase_it_reports(self):
        """The general form of the above: an offset that does not point at
        its own phrase is a highlight over the wrong words."""
        text = (
            "The launch was delayed. Documentation was written by the team, "
            "and the rollout was delayed again."
        )
        for detection in detect_passive_voice(text):
            with self.subTest(phrase=detection["phrase"]):
                self.assertEqual(
                    text[detection["start"] : detection["end"]], detection["phrase"]
                )


class PassiveVoiceAccuracyTests(TestCase):
    """`endswith(("ed", "en", "t"))` — "t" matches most of English."""

    def test_ordinary_sentences_are_not_flagged(self):
        detections = detect_passive_voice(
            "This was not part of the team and is best in class"
        )
        self.assertEqual([d["phrase"] for d in detections], [])

    def test_more_of_the_same_shape(self):
        for text in [
            "The result was about right.",
            "It is it, and nothing more.",
            "The budget was at its limit.",
            "Attendance is often the point.",
        ]:
            with self.subTest(text=text):
                self.assertEqual(detect_passive_voice(text), [])

    def test_real_passive_voice_is_still_caught(self):
        self.assertEqual(
            [d["phrase"] for d in detect_passive_voice("The project was completed.")],
            ["was completed"],
        )

    def test_irregular_participles_are_caught(self):
        for text, expected in [
            ("The service was built by the platform team.", "was built"),
            ("The report was written last week.", "was written"),
            ("The migration was run overnight.", "was run"),
        ]:
            with self.subTest(text=text):
                self.assertEqual(
                    [d["phrase"] for d in detect_passive_voice(text)], [expected]
                )

    def test_an_interrupting_adverb_does_not_hide_the_participle(self):
        self.assertEqual(
            [
                d["phrase"]
                for d in detect_passive_voice("The rollout was not completed on time.")
            ],
            ["was not completed"],
        )

    def test_the_indicator_list_is_the_one_the_detector_uses(self):
        """PASSIVE_INDICATORS was defined at module scope and never
        referenced — the function held its own hardcoded copy of six of the
        same words, so the module had two lists and one of them did nothing."""
        self.assertIn("was", PASSIVE_INDICATORS)
        for word in PASSIVE_INDICATORS:
            with self.subTest(word=word):
                self.assertTrue(
                    detect_passive_voice(f"The work {word} completed."),
                    f"{word!r} is listed as an indicator but does not detect.",
                )


class InflectedClicheTests(TestCase):
    """The dictionary held `\\bhandled\\b` only."""

    def test_inflections_of_a_cliche_verb_are_caught(self):
        for text in ["handled the escalation", "handles escalations", "handling escalations"]:
            with self.subTest(text=text):
                self.assertEqual(len(detect_cliches(text)), 1, text)

    def test_utilize_and_leverage_inflect_too(self):
        self.assertEqual(len(detect_cliches("utilizing and leveraging tooling")), 2)

    def test_unrelated_words_are_not_caught_by_the_inflections(self):
        self.assertEqual(detect_cliches("Handlebars and handshakes"), [])

    def test_overlapping_patterns_report_one_detection(self):
        """"in charge of" sits inside "was in charge of"; emitting both puts
        two highlights over one phrase and two rewrites over one span."""
        detections = detect_cliches("Was in charge of the migration.")
        self.assertEqual(len(detections), 1)
        self.assertEqual(detections[0]["phrase"], "Was in charge of")


class ModernizationTests(TestCase):
    """The rewrite has to produce a sentence, not just a substitution."""

    def test_a_lead_in_does_not_leave_the_clause_passive(self):
        result = analyze_and_suggest("I was responsible for the rollout.")
        self.assertEqual(result["modernized_text"], "I spearheaded the rollout.")

    def test_a_lead_in_hands_the_verb_to_the_gerund_behind_it(self):
        self.assertEqual(
            analyze_and_suggest("Responsible for managing the team.")["modernized_text"],
            "Managed the team.",
        )

    def test_irregular_gerunds_convert_correctly(self):
        self.assertEqual(
            analyze_and_suggest(
                "Helped with building the API and worked on running the pipeline."
            )["modernized_text"],
            "Built the API and ran the pipeline.",
        )

    def test_a_cliche_gerund_takes_its_own_suggestion(self):
        """The past tense of "handling" is "handled", which is itself in the
        dictionary — a cliché replaced by a cliché."""
        self.assertEqual(
            analyze_and_suggest("Tasked with handling escalations.")["modernized_text"],
            "Orchestrated escalations.",
        )

    def test_all_caps_keeps_its_casing(self):
        self.assertEqual(
            analyze_and_suggest("RESPONSIBLE FOR the migration.")["modernized_text"],
            "SPEARHEADED the migration.",
        )

    def test_sentence_case_is_preserved(self):
        self.assertEqual(
            analyze_and_suggest("Utilized a framework.")["modernized_text"],
            "Used a framework.",
        )

    def test_clean_text_is_returned_untouched(self):
        text = "Developed a microservices architecture using Docker and Kubernetes."
        result = analyze_and_suggest(text)
        self.assertEqual(result["modernized_text"], text)
        self.assertEqual(result["score"], 100)
        self.assertEqual(result["total_issues"], 0)


class ScoreTests(TestCase):
    """`100 - (issues / words) * 500` scored one issue in an eight-word
    bullet at 38/100. A bullet is short by design."""

    def test_a_short_bullet_with_one_issue_is_not_gutted(self):
        result = analyze_and_suggest("Responsible for the CI pipeline.")
        self.assertEqual(result["total_issues"], 1)
        self.assertGreaterEqual(result["score"], 80)

    def test_the_same_issue_scores_the_same_in_a_long_bullet(self):
        short = analyze_and_suggest("Responsible for the pipeline.")
        long = analyze_and_suggest(
            "Responsible for the pipeline that moves several million events a "
            "day between the ingest tier and the warehouse without loss."
        )
        self.assertEqual(short["score"], long["score"])

    def test_the_score_still_falls_with_more_issues(self):
        one = analyze_and_suggest("Responsible for the pipeline.")
        many = analyze_and_suggest(
            "Responsible for synergy, utilized world-class team player thinking."
        )
        self.assertLess(many["score"], one["score"])

    def test_the_score_has_a_floor(self):
        self.assertGreaterEqual(analyze_and_suggest("synergy " * 40)["score"], 0)

    def test_empty_input_reports_total_issues(self):
        """`total_issues` was missing from the empty-input branch, so a caller
        reading it got a KeyError on exactly the input that cannot fail."""
        self.assertEqual(analyze_and_suggest("")["total_issues"], 0)
        self.assertEqual(analyze_and_suggest(None)["total_issues"], 0)
