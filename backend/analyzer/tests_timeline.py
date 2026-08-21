"""Tests for employment-timeline analysis (#709).

Two things are being tested, and the second matters more than the first.

The parser has to read the date formats resumes actually use. That is the easy
half and most of `ExtractRangesTests`.

The analysis has to **stay quiet when it is not sure**. Resume text arrives with
its layout stripped, so a false "you forgot your dates" on a resume that has
them sends the user hunting for a problem that does not exist — worse than
missing a real one. `FalsePositiveTests` is the class that pins that, and the
undated-role proximity rule exists entirely because of it.

`today` is injected everywhere, so "current role" and "future date" are tested
without freezing the clock globally.
"""

from datetime import date

from django.test import TestCase

from analyzer.timeline import (
    GAP_THRESHOLD_MONTHS,
    SEVERITY_HIGH,
    SEVERITY_INFO,
    SEVERITY_LOW,
    SEVERITY_MEDIUM,
    analyse,
    extract_ranges,
    merged_months,
)

TODAY = date(2026, 8, 20)


def codes(timeline):
    return [finding.code for finding in timeline.findings]


class ExtractRangesTests(TestCase):
    """The formats a resume is actually written in."""

    def test_month_name_range(self):
        (found,) = extract_ranges("Jan 2020 - Mar 2022")

        self.assertEqual((found.start_year, found.start_month), (2020, 1))
        self.assertEqual((found.end_year, found.end_month), (2022, 3))
        self.assertEqual(found.start_format, "month-name")

    def test_full_month_names_and_a_trailing_dot(self):
        self.assertEqual(len(extract_ranges("January 2020 – March 2022")), 1)
        self.assertEqual(len(extract_ranges("Sept. 2019 - Dec. 2021")), 1)

    def test_numeric_range(self):
        (found,) = extract_ranges("03/2017 - 06/2019")

        self.assertEqual((found.start_year, found.start_month), (2017, 3))
        self.assertEqual(found.start_format, "numeric")

    def test_iso_range(self):
        (found,) = extract_ranges("2020-01 to 2021-11")

        self.assertEqual((found.start_year, found.start_month), (2020, 1))
        self.assertEqual(found.start_format, "iso")

    def test_year_only_range(self):
        (found,) = extract_ranges("2015 - 2016")

        self.assertIsNone(found.start_month)
        self.assertEqual(found.start_format, "year-only")

    def test_present_in_its_several_spellings(self):
        for word in ("Present", "current", "Now", "ongoing", "today"):
            with self.subTest(word=word):
                (found,) = extract_ranges(f"Jan 2020 - {word}")
                self.assertTrue(found.is_current)

    def test_en_and_em_dashes_and_word_separators(self):
        for separator in ("-", "–", "—", "to", "until", "through"):
            with self.subTest(separator=separator):
                self.assertEqual(len(extract_ranges(f"Jan 2020 {separator} Mar 2022")), 1)

    def test_several_ranges_across_several_lines(self):
        text = "Acme\nJan 2020 - Present\nGlobex\nMar 2017 - Jun 2019\n"

        self.assertEqual(len(extract_ranges(text)), 2)

    def test_a_range_is_not_assembled_across_a_line_break(self):
        """Two-column resumes flatten to text in ways that invite exactly this."""
        self.assertEqual(extract_ranges("Jan 2020 -\nMar 2022"), [])

    def test_implausible_years_are_not_dates(self):
        self.assertEqual(extract_ranges("Reduced errors from 1200 - 340"), [])

    def test_version_numbers_are_not_dates(self):
        self.assertEqual(extract_ranges("Migrated from Python 3.9 to 3.12"), [])

    def test_the_matched_text_is_kept_for_quoting_back(self):
        (found,) = extract_ranges("Senior Engineer   Jan 2020 - Mar 2022")

        self.assertIn("Jan 2020", found.text)
        self.assertIn("Senior Engineer", found.line)


class DurationTests(TestCase):
    def test_a_range_is_inclusive_of_both_ends(self):
        (found,) = extract_ranges("Jan 2020 - Mar 2020")

        self.assertEqual(found.months(TODAY), 3)

    def test_a_year_only_end_runs_to_december(self):
        """`2019 - 2021` is work through 2021, not work ending that January."""
        (found,) = extract_ranges("2019 - 2021")

        self.assertEqual(found.months(TODAY), 36)

    def test_a_current_role_runs_to_today(self):
        (found,) = extract_ranges("Jan 2026 - Present")

        self.assertEqual(found.months(TODAY), 8)


class MergedMonthsTests(TestCase):
    """Total experience, with overlaps counted once."""

    def test_two_separate_roles_add_up(self):
        ranges = extract_ranges("Jan 2018 - Dec 2018\nJan 2020 - Dec 2020")

        self.assertEqual(merged_months(ranges, TODAY), 24)

    def test_concurrent_roles_are_not_counted_twice(self):
        """A promotion written as two entries would otherwise inflate the total."""
        ranges = extract_ranges("Jan 2020 - Dec 2021\nJun 2020 - Dec 2021")

        self.assertEqual(merged_months(ranges, TODAY), 24)

    def test_adjacent_roles_merge_into_one_span(self):
        ranges = extract_ranges("Jan 2020 - Jun 2020\nJul 2020 - Dec 2020")

        self.assertEqual(merged_months(ranges, TODAY), 12)

    def test_no_ranges_is_zero_not_an_error(self):
        self.assertEqual(merged_months([], TODAY), 0)


class GapTests(TestCase):
    def test_a_long_gap_is_reported(self):
        timeline = analyse("Jan 2018 - Dec 2018\nJan 2020 - Dec 2020", today=TODAY)

        self.assertIn("employment_gap", codes(timeline))
        self.assertEqual(timeline.largest_gap_months, 12)

    def test_a_short_gap_is_not_worth_mentioning(self):
        """A notice period plus a job search is not a finding."""
        timeline = analyse("Jan 2018 - Dec 2018\nFeb 2019 - Dec 2019", today=TODAY)

        self.assertNotIn("employment_gap", codes(timeline))

    def test_the_threshold_is_exactly_where_it_says_it_is(self):
        """A gap of exactly the threshold counts; one month less does not."""
        self.assertEqual(GAP_THRESHOLD_MONTHS, 4)

        at_threshold = analyse("Jan 2018 - Jan 2018\nJun 2018 - Dec 2018", today=TODAY)
        below_threshold = analyse("Jan 2018 - Jan 2018\nMay 2018 - Dec 2018", today=TODAY)

        self.assertIn("employment_gap", codes(at_threshold))
        self.assertNotIn("employment_gap", codes(below_threshold))

    def test_a_gap_over_a_year_is_more_serious_than_a_short_one(self):
        short = analyse("Jan 2018 - Dec 2018\nAug 2019 - Dec 2019", today=TODAY)
        long = analyse("Jan 2018 - Dec 2018\nJan 2021 - Dec 2021", today=TODAY)

        short_gap = next(f for f in short.findings if f.code == "employment_gap")
        long_gap = next(f for f in long.findings if f.code == "employment_gap")

        self.assertEqual(short_gap.severity, SEVERITY_MEDIUM)
        self.assertEqual(long_gap.severity, SEVERITY_HIGH)

    def test_a_gap_is_measured_from_the_furthest_end_not_the_previous_row(self):
        """A long role that spans a short one must not create a phantom gap."""
        timeline = analyse(
            "Jan 2015 - Dec 2022\nJan 2016 - Dec 2016\nJan 2023 - Dec 2023",
            today=TODAY,
        )

        self.assertNotIn("employment_gap", codes(timeline))

    def test_a_gap_names_both_sides(self):
        timeline = analyse("Jan 2018 - Dec 2018\nJan 2020 - Dec 2020", today=TODAY)
        gap = next(f for f in timeline.findings if f.code == "employment_gap")

        self.assertIn("Jan 2018", gap.evidence)
        self.assertIn("Jan 2020", gap.evidence)


class OverlapTests(TestCase):
    def test_concurrent_roles_are_flagged_gently(self):
        timeline = analyse("Jan 2020 - Dec 2021\nJan 2021 - Dec 2022", today=TODAY)
        overlap = next(f for f in timeline.findings if f.code == "overlapping_roles")

        self.assertEqual(overlap.severity, SEVERITY_LOW)
        self.assertIn("contract work", overlap.message)

    def test_a_handover_month_is_not_an_overlap(self):
        """Leaving one job for another, written to the month, looks like this."""
        timeline = analyse("Jan 2020 - Mar 2021\nMar 2021 - Dec 2022", today=TODAY)

        self.assertNotIn("overlapping_roles", codes(timeline))


class ImpossibleDateTests(TestCase):
    def test_a_reversed_range_is_reported(self):
        timeline = analyse("Mar 2022 - Jan 2020", today=TODAY)
        finding = next(f for f in timeline.findings if f.code == "reversed_range")

        self.assertEqual(finding.severity, SEVERITY_HIGH)

    def test_a_reversed_range_does_not_poison_the_totals(self):
        """It is dropped, or the gap arithmetic downstream is nonsense."""
        timeline = analyse("Mar 2022 - Jan 2020\nJan 2024 - Dec 2024", today=TODAY)

        self.assertEqual(timeline.total_months, 12)

    def test_a_far_future_start_is_reported(self):
        timeline = analyse("Jan 2030 - Present", today=TODAY)

        self.assertIn("future_date", codes(timeline))

    def test_a_start_a_month_or_two_out_is_left_alone(self):
        """Offers do get signed ahead of time."""
        timeline = analyse("Oct 2026 - Present", today=TODAY)

        self.assertNotIn("future_date", codes(timeline))


class FormatConsistencyTests(TestCase):
    def test_mixed_formats_are_reported(self):
        timeline = analyse("Jan 2020 - Mar 2021\n04/2018 - 06/2019", today=TODAY)

        self.assertIn("mixed_date_formats", codes(timeline))

    def test_one_format_throughout_is_not_a_finding(self):
        timeline = analyse("Jan 2020 - Mar 2021\nApr 2018 - Jun 2019", today=TODAY)

        self.assertNotIn("mixed_date_formats", codes(timeline))

    def test_present_does_not_count_as_a_competing_format(self):
        """It is the only way to write an open end, not a stylistic choice."""
        timeline = analyse("Jan 2020 - Present\nMar 2017 - Jun 2019", today=TODAY)

        self.assertNotIn("mixed_date_formats", codes(timeline))

    def test_year_only_ranges_are_flagged_as_ambiguous(self):
        timeline = analyse("2021 - 2022", today=TODAY)
        finding = next(f for f in timeline.findings if f.code == "year_only_dates")

        self.assertEqual(finding.severity, SEVERITY_LOW)
        self.assertIn("two months or twenty-three", finding.message)


class UndatedRoleTests(TestCase):
    def test_a_role_with_no_dates_anywhere_near_it_is_flagged(self):
        text = (
            "Senior Engineer, Acme\n"
            "Jan 2020 - Present\n"
            "Built the billing pipeline.\n"
            "Shipped twelve releases.\n"
            "Contract Developer, Initech\n"
            "Delivered a thing.\n"
        )
        timeline = analyse(text, today=TODAY)
        finding = next(f for f in timeline.findings if f.code == "undated_role")

        self.assertEqual(finding.severity, SEVERITY_HIGH)
        self.assertIn("Initech", finding.evidence)


class FalsePositiveTests(TestCase):
    """The failures that would make this feature worse than not having it.

    Every case here is a resume that is *fine*. Any finding is a bug.
    """

    def test_dates_on_the_line_below_the_title(self):
        text = (
            "Senior Backend Engineer, Acme Corp\n"
            "Jan 2020 - Present\n"
            "Built the billing pipeline.\n"
        )

        self.assertNotIn("undated_role", codes(analyse(text, today=TODAY)))

    def test_title_then_company_then_dates(self):
        text = "Senior Engineer\nAcme Corp\nJan 2020 - Present\nBuilt things.\n"

        self.assertNotIn("undated_role", codes(analyse(text, today=TODAY)))

    def test_dates_on_the_line_above_the_title(self):
        """A right-aligned date column flattens this way."""
        text = "Jan 2020 - Present\nSenior Engineer, Acme\nBuilt things.\n"

        self.assertNotIn("undated_role", codes(analyse(text, today=TODAY)))

    def test_dates_on_the_same_line_as_the_title(self):
        text = "Senior Engineer, Acme        Jan 2020 - Present\nBuilt things.\n"

        self.assertNotIn("undated_role", codes(analyse(text, today=TODAY)))

    def test_a_resume_we_could_not_parse_produces_silence(self):
        """Not a page of warnings. This is the whole design in one test."""
        timeline = analyse(
            "Senior Engineer at Acme\nBuilt the billing pipeline.\nManager at Globex\n",
            today=TODAY,
        )

        self.assertFalse(timeline.parsed)
        self.assertEqual(codes(timeline), ["no_dates_found"])
        self.assertEqual(timeline.findings[0].severity, SEVERITY_INFO)

    def test_metrics_in_bullets_are_not_read_as_dates(self):
        timeline = analyse(
            "Jan 2020 - Present\n"
            "Reduced p99 latency from 1200 ms to 340 ms.\n"
            "Cut costs by 40% across 3 services.\n"
            "Scaled from 100 to 5000 requests per second.\n",
            today=TODAY,
        )

        self.assertEqual(len(timeline.ranges), 1)

    def test_a_clean_recent_resume_has_nothing_to_say(self):
        text = (
            "Senior Backend Engineer, Acme Corp\n"
            "Jan 2022 - Present\n"
            "Built the billing pipeline.\n"
            "Backend Engineer, Globex\n"
            "Feb 2019 - Dec 2021\n"
            "Maintained services.\n"
        )

        self.assertEqual(codes(analyse(text, today=TODAY)), [])


class SeniorityCrossCheckTests(TestCase):
    SHORT_HISTORY = "Jan 2025 - Present\n"

    def test_senior_with_eighteen_months_is_flagged(self):
        timeline = analyse(self.SHORT_HISTORY, experience_level="Senior", today=TODAY)
        finding = next(f for f in timeline.findings if f.code == "seniority_mismatch")

        self.assertEqual(finding.severity, SEVERITY_MEDIUM)
        self.assertIn("Senior", finding.message)

    def test_senior_with_a_long_history_is_not_flagged(self):
        timeline = analyse("Jan 2010 - Present", experience_level="Senior", today=TODAY)

        self.assertNotIn("seniority_mismatch", codes(timeline))

    def test_junior_is_never_flagged(self):
        """There is no floor to fail on the way in."""
        timeline = analyse(self.SHORT_HISTORY, experience_level="Junior", today=TODAY)

        self.assertNotIn("seniority_mismatch", codes(timeline))

    def test_an_unrecognised_level_skips_the_check_rather_than_guessing(self):
        timeline = analyse(self.SHORT_HISTORY, experience_level="Wizard", today=TODAY)

        self.assertNotIn("seniority_mismatch", codes(timeline))

    def test_the_check_reads_common_senior_phrasings(self):
        for level in ("Senior Engineer", "Tech Lead", "Staff", "Principal"):
            with self.subTest(level=level):
                timeline = analyse(self.SHORT_HISTORY, experience_level=level, today=TODAY)
                self.assertIn("seniority_mismatch", codes(timeline))


class TimelineShapeTests(TestCase):
    def test_findings_are_ordered_by_severity(self):
        text = (
            "Senior Engineer, Acme\n"
            "2015 - 2016\n"
            "Built things.\n"
            "More bullets here.\n"
            "Consultant, Initech\n"
            "Did consulting.\n"
            "04/2020 - 06/2021\n"
        )
        timeline = analyse(text, today=TODAY)
        severities = [f.severity for f in timeline.findings]

        order = {SEVERITY_HIGH: 0, SEVERITY_MEDIUM: 1, SEVERITY_LOW: 2, SEVERITY_INFO: 3}
        self.assertEqual(severities, sorted(severities, key=lambda s: order[s]))

    def test_total_years_is_rounded_for_display(self):
        timeline = analyse("Jan 2020 - Jun 2021", today=TODAY)

        self.assertEqual(timeline.total_months, 18)
        self.assertEqual(timeline.total_years, 1.5)

    def test_a_current_role_is_reported(self):
        self.assertTrue(analyse("Jan 2020 - Present", today=TODAY).has_current_role)
        self.assertFalse(analyse("Jan 2020 - Dec 2021", today=TODAY).has_current_role)

    def test_ranges_come_back_in_chronological_order(self):
        timeline = analyse("Jan 2020 - Dec 2021\nJan 2015 - Dec 2016", today=TODAY)

        self.assertEqual([r.start_year for r in timeline.ranges], [2015, 2020])

    def test_empty_and_none_input(self):
        for text in ("", None, "   \n\n  "):
            with self.subTest(text=text):
                timeline = analyse(text, today=TODAY)
                self.assertFalse(timeline.parsed)
                self.assertEqual(timeline.total_months, 0)

    def test_the_dict_form_is_json_serialisable(self):
        import json

        payload = analyse("Jan 2020 - Present", experience_level="Senior", today=TODAY).as_dict()

        json.dumps(payload)
        self.assertIn("findings", payload)
        self.assertIn("total_months", payload)
        self.assertTrue(payload["parsed"])


class AnalysisIntegrationTests(TestCase):
    """The timeline reaches the response, and does not disturb the score."""

    def _analyse(self, text, level="Senior"):
        from unittest.mock import patch

        from analyzer.services import analyze_resume
        from analyzer.tests import _fake_pdf

        with patch("analyzer.services.pdfplumber.open") as mock_open:
            mock_open.return_value = _fake_pdf(text)
            return analyze_resume("dummy.pdf", "Backend Developer", experience_level=level)

    def test_the_timeline_is_in_the_result(self):
        result = self._analyse("Python, Django.\nJan 2020 - Present\n")

        self.assertIn("timeline", result)
        self.assertTrue(result["timeline"]["parsed"])

    def test_the_headline_score_is_untouched(self):
        """It is persisted and read by the leaderboard, digest and charts."""
        without = self._analyse("Python, Django, SQL, Docker.")
        with_dates = self._analyse("Python, Django, SQL, Docker.\nJan 2020 - Present\n")

        self.assertEqual(without["score"], with_dates["score"])

    def test_a_resume_with_no_dates_still_analyses(self):
        result = self._analyse("Python, Django, SQL.")

        self.assertFalse(result["timeline"]["parsed"])
        self.assertIsInstance(result["score"], int)
