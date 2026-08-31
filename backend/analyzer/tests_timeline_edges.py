"""Three gaps in the employment timeline analysis (#709 / #714).

All three are mine, from the original change. Each one is quiet: the module
returns a confident answer and nothing indicates it is wrong.

* ``to date`` and ``till date`` could never match. ``_SEPARATOR`` lists ``to``
  and ``till`` as range separators and runs before ``_PRESENT``, so by the time
  the present-word alternation is tried the preposition is gone and only
  ``date`` is left — which was not in the list. A resume whose only role ran
  "Jan 2020 to date" reported *no employment dates at all*.

* Only the *start* of a range was checked against the future cutoff. A typo in
  the end year was counted in full, and ``total_months`` is what the seniority
  cross-check reads.

* Two consecutive year-only ranges always reported a twelve-month overlap,
  because a year-only end reads as December and a year-only start reads as
  January. That is the most common way there is to write a promotion.

The existing ``tests_timeline.py`` did not catch the first one: its
present-word loop iterates ``("Present", "current", "Now", "ongoing", "today")``
— a hand-written list beside the real one, which happens to omit the single
entry of ``PRESENT_WORDS`` that did not work. The test below drives off
``PRESENT_WORDS`` itself, so a word cannot be added without being exercised.
"""

from datetime import date

from django.test import SimpleTestCase

from .timeline import (
    PRESENT_WORDS,
    _shares_only_a_boundary_year,
    analyse,
    extract_ranges,
)


TODAY = date(2024, 6, 1)


def codes(result):
    return [finding["code"] for finding in result.as_dict()["findings"]]


class PresentWordTests(SimpleTestCase):
    """Every word the module claims to understand has to actually work."""

    def test_every_present_word_parses_as_a_current_role(self):
        # The assertion tests_timeline.py should have had: driven from
        # PRESENT_WORDS itself rather than from a list written out beside it.
        #
        # A dash separator, because that is the one form every present word has
        # to work after. "to date" and "till date" additionally work with their
        # own preposition as the separator, which is the case that was broken —
        # covered separately below.
        for word in PRESENT_WORDS:
            with self.subTest(word=word):
                ranges = extract_ranges(f"Software Engineer, Jan 2020 - {word}")
                self.assertEqual(
                    len(ranges), 1, f"{word!r} did not parse as a range end"
                )
                self.assertTrue(ranges[0].is_current)
                self.assertEqual(ranges[0].end_format, "present")

    def test_to_date_and_till_date(self):
        for text in ("Engineer Jan 2020 to date", "Engineer Jan 2020 till date"):
            with self.subTest(text=text):
                ranges = extract_ranges(text)
                self.assertEqual(len(ranges), 1)
                self.assertTrue(ranges[0].is_current)

    def test_to_date_after_a_dash_separator(self):
        ranges = extract_ranges("Engineer Jan 2020 – to date")
        self.assertEqual(len(ranges), 1)
        self.assertTrue(ranges[0].is_current)

    def test_a_resume_ending_to_date_is_not_reported_as_undated(self):
        result = analyse(
            "Senior Software Engineer, Acme\nJan 2020 to date\nBuilt things",
            today=TODAY,
        )

        self.assertTrue(result.parsed)
        self.assertNotIn("no_dates_found", codes(result))
        self.assertTrue(result.has_current_role)
        self.assertEqual(result.total_months, 54)

    def test_longer_present_words_win_over_their_prefixes(self):
        """Alternation must not stop at a shorter branch.

        ``current`` is a prefix of ``currently``, and ``to date`` and ``today``
        share a prefix. The trailing lookahead in RANGE_PATTERN forces a
        backtrack today, but sorting the alternation longest-first means the
        next word added does not have to rely on that.
        """
        for word in ("currently", "today", "to date"):
            with self.subTest(word=word):
                ranges = extract_ranges(f"Engineer Jan 2020 - {word}")
                self.assertEqual(len(ranges), 1)
                self.assertTrue(
                    ranges[0].text.strip().endswith(word),
                    f"{ranges[0].text.strip()!r} did not consume all of {word!r}",
                )


class FutureEndDateTests(SimpleTestCase):
    """A typo in the end year invented years of experience."""

    def test_a_future_end_year_is_flagged(self):
        result = analyse(
            "Backend Engineer\nJan 2020 - Dec 2029\nBuilt things", today=TODAY
        )
        self.assertIn("future_end_date", codes(result))

    def test_a_future_end_year_is_not_counted_as_experience(self):
        # Before: total_years 10.0, findings [].
        result = analyse(
            "Backend Engineer\nJan 2020 - Dec 2029\nBuilt things", today=TODAY
        )
        self.assertEqual(result.total_months, 0)
        self.assertEqual(result.total_years, 0.0)

    def test_a_far_future_end_year_is_flagged(self):
        # _YEAR accepts 21xx, so this parses cleanly.
        result = analyse("Engineer\n2015 - 2099\nThings", today=TODAY)
        self.assertIn("future_end_date", codes(result))

    def test_a_current_role_is_not_a_future_end_date(self):
        result = analyse("Engineer\nJan 2020 - Present\nThings", today=TODAY)
        self.assertNotIn("future_end_date", codes(result))

    def test_an_end_inside_the_tolerance_window_is_accepted(self):
        # FUTURE_TOLERANCE_MONTHS is 3: a notice period is not a typo.
        result = analyse("Engineer\nJan 2020 - Aug 2024\nThings", today=TODAY)
        self.assertNotIn("future_end_date", codes(result))
        self.assertGreater(result.total_months, 0)

    def test_a_past_end_is_untouched(self):
        result = analyse("Engineer\nJan 2020 - Mar 2022\nThings", today=TODAY)
        self.assertNotIn("future_end_date", codes(result))
        self.assertEqual(result.total_months, 27)

    def test_a_future_start_is_still_flagged_separately(self):
        result = analyse("Engineer\nJan 2030 - Dec 2032\nThings", today=TODAY)
        self.assertIn("future_date", codes(result))


class BoundaryYearOverlapTests(SimpleTestCase):
    """A shared year between two year-only ranges is precision, not an overlap."""

    def test_consecutive_year_only_roles_do_not_report_an_overlap(self):
        result = analyse(
            "Junior Developer\n2019 - 2021\nSenior Developer\n2021 - 2023",
            today=TODAY,
        )
        self.assertNotIn("overlapping_roles", codes(result))

    def test_the_total_agrees_with_the_findings(self):
        """merged_months always said 60. The finding claimed a year on top."""
        result = analyse(
            "Junior Developer\n2019 - 2021\nSenior Developer\n2021 - 2023",
            today=TODAY,
        )
        self.assertEqual(result.total_months, 60)
        self.assertEqual(result.total_years, 5.0)

    def test_a_genuine_year_only_overlap_is_still_reported(self):
        result = analyse(
            "Contractor\n2018 - 2021\nStaff Engineer\n2020 - 2023", today=TODAY
        )
        self.assertIn("overlapping_roles", codes(result))

    def test_mixed_precision_is_deliberately_still_reported(self):
        # "Jan 2018 - Dec 2021" really does cover all of 2021, so an overlap of
        # somewhere between one and twelve months is real. Narrowing the rule to
        # both-year-only keeps this signal.
        result = analyse(
            "Engineer\nJan 2018 - Dec 2021\nLead\n2021 - 2023", today=TODAY
        )
        self.assertIn("overlapping_roles", codes(result))

    def test_a_month_precise_overlap_is_still_reported(self):
        result = analyse(
            "Engineer\nJan 2019 - Dec 2021\nLead\nMar 2021 - Dec 2023", today=TODAY
        )
        self.assertIn("overlapping_roles", codes(result))

    def test_year_only_ranges_that_do_not_touch_report_a_gap_not_an_overlap(self):
        result = analyse(
            "Engineer\n2016 - 2018\nLead\n2021 - 2023", today=TODAY
        )
        self.assertIn("employment_gap", codes(result))
        self.assertNotIn("overlapping_roles", codes(result))

    def test_three_consecutive_year_only_roles(self):
        result = analyse(
            "Junior\n2017 - 2019\nMid\n2019 - 2021\nSenior\n2021 - 2023",
            today=TODAY,
        )
        self.assertNotIn("overlapping_roles", codes(result))
        self.assertNotIn("employment_gap", codes(result))
        self.assertEqual(result.total_months, 84)


class BoundaryYearHelperTests(SimpleTestCase):
    """The predicate on its own."""

    def make(self, start_year, end_year, start_format, end_format, is_current=False):
        from .timeline import DateRange

        return DateRange(
            start_year=start_year,
            start_month=None,
            end_year=end_year,
            end_month=None,
            is_current=is_current,
            start_format=start_format,
            end_format=end_format,
            text=f"{start_year} - {end_year}",
        )

    def test_both_year_only_sharing_a_year(self):
        earlier = self.make(2019, 2021, "year-only", "year-only")
        later = self.make(2021, 2023, "year-only", "year-only")
        self.assertTrue(_shares_only_a_boundary_year(earlier, later))

    def test_different_years(self):
        earlier = self.make(2019, 2020, "year-only", "year-only")
        later = self.make(2021, 2023, "year-only", "year-only")
        self.assertFalse(_shares_only_a_boundary_year(earlier, later))

    def test_month_precise_end(self):
        earlier = self.make(2018, 2021, "month-name", "month-name")
        later = self.make(2021, 2023, "year-only", "year-only")
        self.assertFalse(_shares_only_a_boundary_year(earlier, later))

    def test_month_precise_start(self):
        earlier = self.make(2019, 2021, "year-only", "year-only")
        later = self.make(2021, 2023, "month-name", "year-only")
        self.assertFalse(_shares_only_a_boundary_year(earlier, later))

    def test_a_current_earlier_role_is_never_a_boundary_join(self):
        earlier = self.make(2019, None, "year-only", "present", is_current=True)
        later = self.make(2021, 2023, "year-only", "year-only")
        self.assertFalse(_shares_only_a_boundary_year(earlier, later))


class UnchangedBehaviourTests(SimpleTestCase):
    """Spot checks that the ordinary cases still read the same."""

    def test_a_clean_two_role_history(self):
        result = analyse(
            "Engineer\nJan 2020 - Mar 2022\nLead\nApr 2022 - Present", today=TODAY
        )
        self.assertEqual(codes(result), [])
        self.assertTrue(result.has_current_role)
        self.assertEqual(result.total_months, 54)

    def test_a_reversed_range_is_still_flagged(self):
        result = analyse("Engineer\nDec 2022 - Jan 2020\nThings", today=TODAY)
        self.assertIn("reversed_range", codes(result))

    def test_a_real_gap_is_still_flagged(self):
        result = analyse(
            "Engineer\nJan 2018 - Mar 2019\nLead\nJan 2021 - Mar 2022", today=TODAY
        )
        self.assertIn("employment_gap", codes(result))

    def test_a_resume_with_no_dates_still_says_so(self):
        result = analyse("Software Engineer\nBuilt some things", today=TODAY)
        self.assertFalse(result.parsed)
        self.assertIn("no_dates_found", codes(result))
