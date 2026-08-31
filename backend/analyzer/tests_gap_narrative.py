"""
Unit tests for Gap Narrative Builder.
"""

from datetime import datetime
from unittest.mock import patch

from django.test import TestCase

from .gap_narrative import (
    NARRATIVE_TEMPLATES,
    detect_gaps,
    generate_narratives,
    months_between,
    parse_date,
)


class GapNarrativeTests(TestCase):
    """Test suite for gap detection and narrative generation logic."""

    def test_parse_date_various_formats(self):
        """Test parsing of different date string formats."""
        self.assertIsNotNone(parse_date("Jan 2020"))
        self.assertIsNotNone(parse_date("March 2021"))
        self.assertIsNotNone(parse_date("2022"))
        self.assertIsNotNone(parse_date("Present"))
        self.assertIsNone(parse_date("Invalid Date"))

    def test_detect_gaps_finds_gap(self):
        """Test detection of a gap greater than 3 months."""
        timeline = [
            {"role": "Role A", "start_date": "Jan 2022", "end_date": "Present"},
            {"role": "Role B", "start_date": "Jan 2020", "end_date": "Dec 2020"},
        ]
        gaps = detect_gaps(timeline)
        self.assertEqual(len(gaps), 1)
        self.assertEqual(gaps[0]["duration_months"], 13)  # Jan 2021 to Jan 2022

    def test_detect_gaps_no_gap(self):
        """Test that contiguous roles do not trigger a gap."""
        timeline = [
            {"role": "Role A", "start_date": "Jan 2022", "end_date": "Present"},
            {"role": "Role B", "start_date": "Jan 2020", "end_date": "Dec 2021"},
        ]
        gaps = detect_gaps(timeline)
        self.assertEqual(len(gaps), 0)

    def test_generate_narratives_creates_options(self):
        """Test that narratives are generated for detected gaps."""
        gaps = [
            {
                "role_before": "Dev",
                "role_after": "Senior Dev",
                "start_date": "Jan 2021",
                "end_date": "Jan 2022",
                "duration_months": 12,
            }
        ]
        context = {
            "skills": "Python",
            "target_role": "Software Engineer",
            "activities": "open source contributions",
        }

        results = generate_narratives(gaps, context)
        self.assertEqual(len(results), 1)
        self.assertGreater(len(results[0]["narratives"]), 0)
        self.assertIn("Python", results[0]["narratives"][0]["text"])
        self.assertIn("Senior Dev", results[0]["narratives"][0]["text"])
        self.assertIn("open source contributions", results[0]["narratives"][0]["text"])


class DetectGapsIntervalTests(TestCase):
    """The interval detect_gaps measures, and the boundaries it reports.

    These cover the arithmetic directly: the old implementation measured the
    later role's end back to the earlier role's start, so it returned the span
    covering both jobs instead of the space between them.
    """

    def test_gap_is_measured_from_previous_end_to_next_start(self):
        timeline = [
            {"role": "Senior Dev", "start_date": "Jan 2022", "end_date": "Dec 2023"},
            {"role": "Dev", "start_date": "Jan 2019", "end_date": "Dec 2020"},
        ]
        gaps = detect_gaps(timeline)
        self.assertEqual(len(gaps), 1)
        # Dec 2020 -> Jan 2022, not Dec 2023 -> Jan 2019.
        self.assertEqual(gaps[0]["duration_months"], 13)

    def test_gap_length_is_independent_of_todays_date(self):
        """A gap between two closed roles must not drift over time.

        The old arithmetic anchored on the later role's end date, so whenever
        that was "Present" the reported gap grew by a month every month.
        """
        closed = [
            {"role": "B", "start_date": "Jan 2022", "end_date": "Dec 2022"},
            {"role": "A", "start_date": "Jan 2019", "end_date": "Jan 2021"},
        ]
        open_ended = [
            {"role": "B", "start_date": "Jan 2022", "end_date": "Present"},
            {"role": "A", "start_date": "Jan 2019", "end_date": "Jan 2021"},
        ]
        self.assertEqual(
            detect_gaps(closed)[0]["duration_months"],
            detect_gaps(open_ended)[0]["duration_months"],
        )

    def test_reported_boundaries_bound_the_gap_in_order(self):
        timeline = [
            {"role": "B", "start_date": "Jun 2022", "end_date": "Present"},
            {"role": "A", "start_date": "Jan 2019", "end_date": "Feb 2021"},
        ]
        gap = detect_gaps(timeline)[0]
        self.assertEqual(gap["start_date"], "Feb 2021")
        self.assertEqual(gap["end_date"], "Jun 2022")
        self.assertEqual(gap["role_before"], "A")
        self.assertEqual(gap["role_after"], "B")

    def test_contiguous_roles_produce_no_gap(self):
        timeline = [
            {"role": "B", "start_date": "Jan 2022", "end_date": "Present"},
            {"role": "A", "start_date": "Jan 2020", "end_date": "Dec 2021"},
        ]
        self.assertEqual(detect_gaps(timeline), [])

    def test_overlapping_roles_produce_no_gap(self):
        """Concurrent roles gave a negative interval; it must not be reported."""
        timeline = [
            {"role": "Consultant", "start_date": "Jan 2021", "end_date": "Present"},
            {"role": "Engineer", "start_date": "Jan 2019", "end_date": "Dec 2022"},
        ]
        self.assertEqual(detect_gaps(timeline), [])

    def test_gap_exactly_at_threshold_is_not_reported(self):
        timeline = [
            {"role": "B", "start_date": "Apr 2022", "end_date": "Present"},
            {"role": "A", "start_date": "Jan 2020", "end_date": "Jan 2022"},
        ]
        self.assertEqual(detect_gaps(timeline), [])

    def test_gap_one_month_past_threshold_is_reported(self):
        timeline = [
            {"role": "B", "start_date": "May 2022", "end_date": "Present"},
            {"role": "A", "start_date": "Jan 2020", "end_date": "Jan 2022"},
        ]
        gaps = detect_gaps(timeline)
        self.assertEqual(len(gaps), 1)
        self.assertEqual(gaps[0]["duration_months"], 4)

    def test_multiple_gaps_across_three_roles(self):
        timeline = [
            {"role": "C", "start_date": "Jan 2023", "end_date": "Present"},
            {"role": "B", "start_date": "Jan 2021", "end_date": "Jan 2022"},
            {"role": "A", "start_date": "Jan 2018", "end_date": "Jan 2020"},
        ]
        gaps = detect_gaps(timeline)
        self.assertEqual(len(gaps), 2)
        self.assertEqual(
            sorted(g["duration_months"] for g in gaps), [12, 12]
        )

    def test_unsorted_input_is_ordered_before_comparison(self):
        """Order of the incoming list must not change the answer."""
        entries = [
            {"role": "A", "start_date": "Jan 2019", "end_date": "Jan 2020"},
            {"role": "C", "start_date": "Jan 2023", "end_date": "Present"},
            {"role": "B", "start_date": "Jan 2021", "end_date": "Jan 2022"},
        ]
        self.assertEqual(len(detect_gaps(entries)), 2)

    def test_unparseable_boundary_is_skipped_not_guessed(self):
        timeline = [
            {"role": "B", "start_date": "Jan 2022", "end_date": "Present"},
            {"role": "A", "start_date": "Jan 2019", "end_date": "sometime in 2020"},
        ]
        self.assertEqual(detect_gaps(timeline), [])

    def test_single_role_and_empty_timeline(self):
        self.assertEqual(detect_gaps([]), [])
        self.assertEqual(
            detect_gaps([{"role": "A", "start_date": "Jan 2020", "end_date": "Present"}]),
            [],
        )


class MonthsBetweenTests(TestCase):
    """The extracted interval helper."""

    def test_same_month_is_zero(self):
        self.assertEqual(
            months_between(datetime(2021, 5, 1), datetime(2021, 5, 1)), 0
        )

    def test_forward_interval_counts_whole_months(self):
        self.assertEqual(
            months_between(datetime(2020, 12, 1), datetime(2022, 1, 1)), 13
        )

    def test_reversed_interval_is_negative(self):
        self.assertEqual(
            months_between(datetime(2022, 1, 1), datetime(2020, 12, 1)), -13
        )


class ParseDateTests(TestCase):
    """Date formats that turn up in real timeline entries."""

    def test_abbreviated_and_full_month_names(self):
        self.assertEqual(parse_date("Mar 2021"), datetime(2021, 3, 1))
        self.assertEqual(parse_date("March 2021"), datetime(2021, 3, 1))
        self.assertEqual(parse_date("SEPTEMBER 2019"), datetime(2019, 9, 1))

    def test_year_only(self):
        self.assertEqual(parse_date("2022"), datetime(2022, 1, 1))

    def test_numeric_year_month_either_order(self):
        self.assertEqual(parse_date("2021-03"), datetime(2021, 3, 1))
        self.assertEqual(parse_date("03/2021"), datetime(2021, 3, 1))

    def test_present_synonyms_resolve_to_now(self):
        for token in ("Present", "now", "CURRENT"):
            self.assertIsNotNone(parse_date(token))

    def test_unparseable_and_empty_return_none(self):
        self.assertIsNone(parse_date("Invalid Date"))
        self.assertIsNone(parse_date(""))
        self.assertIsNone(parse_date("   "))


class GenerateNarrativesTests(TestCase):
    """Rendering, including the placeholder that used to raise."""

    GAP = {
        "role_before": "Dev",
        "role_after": "Senior Dev",
        "start_date": "Jan 2021",
        "end_date": "Jan 2022",
        "duration_months": 12,
    }

    def test_every_template_renders_without_raising(self):
        """job_market referenced {certifications}, which was never passed.

        NARRATIVE_TEMPLATES iterates in insertion order and job_market is last,
        so this raised KeyError for every gap that reached it -- not
        conditionally, always.
        """
        results = generate_narratives([self.GAP], {"skills": "Python"})
        texts = [n["text"] for n in results[0]["narratives"]]
        self.assertEqual(len(texts), 2 * len(NARRATIVE_TEMPLATES))
        for text in texts:
            self.assertNotIn("{", text)
            self.assertNotIn("}", text)

    def test_certifications_placeholder_is_filled(self):
        results = generate_narratives(
            [self.GAP], {"certifications": "the AWS Solutions Architect exam"}
        )
        texts = [n["text"] for n in results[0]["narratives"]]
        self.assertTrue(
            any("AWS Solutions Architect" in t for t in texts),
            "caller-supplied certifications should reach the job_market template",
        )

    def test_unknown_placeholder_in_a_template_does_not_raise(self):
        """Adding a placeholder to a template must not break the endpoint."""
        with patch.dict(
            NARRATIVE_TEMPLATES,
            {"custom": ["A sentence with an {undeclared_field} in it."]},
        ):
            results = generate_narratives([self.GAP], {})
        self.assertTrue(results)

    def test_narratives_name_the_role_being_returned_to(self):
        results = generate_narratives([self.GAP], {"skills": "Python"})
        texts = [n["text"] for n in results[0]["narratives"]]
        self.assertTrue(any("Senior Dev" in t for t in texts))

    def test_caller_context_overrides_defaults(self):
        results = generate_narratives(
            [self.GAP],
            {
                "skills": "Rust",
                "activities": "maintaining an open source crate",
                "deliverables": "three production data pipelines",
                "achievements": "shipped a billing rewrite",
            },
        )
        joined = " ".join(n["text"] for n in results[0]["narratives"])
        self.assertIn("Rust", joined)
        self.assertIn("maintaining an open source crate", joined)
        self.assertIn("three production data pipelines", joined)
        self.assertIn("shipped a billing rewrite", joined)

    def test_blank_context_values_fall_back_to_defaults(self):
        results = generate_narratives([self.GAP], {"skills": ""})
        joined = " ".join(n["text"] for n in results[0]["narratives"])
        self.assertIn("new technologies", joined)

    def test_missing_context_uses_defaults_without_raising(self):
        results = generate_narratives([self.GAP], {})
        self.assertEqual(len(results), 1)
        self.assertTrue(results[0]["narratives"])

    def test_gap_fields_are_preserved_alongside_narratives(self):
        results = generate_narratives([self.GAP], {})
        for key, value in self.GAP.items():
            self.assertEqual(results[0][key], value)

    def test_no_gaps_yields_no_results(self):
        self.assertEqual(generate_narratives([], {"skills": "Python"}), [])

    def test_category_labels_are_human_readable(self):
        results = generate_narratives([self.GAP], {})
        categories = {n["category"] for n in results[0]["narratives"]}
        self.assertIn("Job Market", categories)
        self.assertIn("Upskilling", categories)


class GapNarrativeEndToEndTests(TestCase):
    """detect_gaps feeding generate_narratives, the way the view calls it."""

    def test_clean_history_produces_no_gaps_and_no_narratives(self):
        timeline = [
            {"role": "Senior Dev", "start_date": "Jan 2022", "end_date": "Present"},
            {"role": "Dev", "start_date": "Jan 2020", "end_date": "Dec 2021"},
        ]
        gaps = detect_gaps(timeline)
        self.assertEqual(generate_narratives(gaps, {"skills": "Python"}), [])

    def test_real_gap_produces_narratives_naming_the_next_role(self):
        timeline = [
            {"role": "Staff Engineer", "start_date": "Jan 2022", "end_date": "Present"},
            {"role": "Engineer", "start_date": "Jan 2018", "end_date": "Dec 2020"},
        ]
        results = generate_narratives(
            detect_gaps(timeline), {"skills": "Go", "activities": "conference talks"}
        )
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["duration_months"], 13)
        joined = " ".join(n["text"] for n in results[0]["narratives"])
        self.assertIn("Staff Engineer", joined)
        self.assertIn("Go", joined)
