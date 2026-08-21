"""Tests for the skills leaderboard aggregation (#707).

The headline claim — that the endpoint no longer materialises the queryset —
cannot be checked by looking at the response, since the numbers are the same
either way. `AggregationIsStreamedTests` asserts it structurally instead: the
queryset is wrapped so that touching `__iter__`, `__len__` or `_fetch_all`
fails the test, and only `.iterator()` is allowed through.
"""

from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from analyzer.leaderboard import (
    DEFAULT_LIMIT,
    MAX_LIMIT,
    UNKNOWN_TRACK,
    aggregate_skill_counts,
    cache_key_for,
    clamp_limit,
    normalise_track,
    top_skills,
)
from analyzer.models import ResumeAnalysis

KNOWN_TRACKS = {"Frontend Developer", "Backend Developer", "Data Analyst"}


def make_analysis(user, role="Backend Developer", matched=None, missing=None):
    return ResumeAnalysis.objects.create(
        user=user,
        file_name="resume.pdf",
        target_role=role,
        score=70,
        skills_found=list(matched or []),
        matched_skills=list(matched or []),
        missing_skills=list(missing or []),
    )


class NormaliseTrackTests(TestCase):
    """Where the unbounded cache-key space was coming from."""

    def test_a_known_track_resolves_to_its_canonical_name(self):
        self.assertEqual(
            normalise_track("Backend Developer", KNOWN_TRACKS), "Backend Developer"
        )

    def test_casing_and_whitespace_do_not_create_a_second_track(self):
        for spelling in ("backend developer", "  BACKEND DEVELOPER  ", "Backend developer"):
            with self.subTest(spelling=spelling):
                self.assertEqual(normalise_track(spelling, KNOWN_TRACKS), "Backend Developer")

    def test_an_empty_track_means_everything(self):
        self.assertEqual(normalise_track("", KNOWN_TRACKS), "")
        self.assertEqual(normalise_track("   ", KNOWN_TRACKS), "")
        self.assertEqual(normalise_track(None, KNOWN_TRACKS), "")

    def test_an_unknown_track_collapses_onto_one_name(self):
        """This is what stops a caller minting a cache entry per request."""
        self.assertEqual(normalise_track("Astronaut", KNOWN_TRACKS), UNKNOWN_TRACK)
        self.assertEqual(normalise_track("x" * 5000, KNOWN_TRACKS), UNKNOWN_TRACK)


class CacheKeyTests(TestCase):
    def test_a_track_with_a_space_produces_a_key_without_one(self):
        """Memcached rejects keys containing spaces; the old key interpolated raw input."""
        key = cache_key_for("Backend Developer", DEFAULT_LIMIT, False)

        self.assertNotIn(" ", key)

    def test_keys_stay_within_the_safe_character_set(self):
        key = cache_key_for("Backend Developer", DEFAULT_LIMIT, False)

        self.assertTrue(all(c.isalnum() or c in ":_-" for c in key), key)

    def test_different_tracks_do_not_collide(self):
        self.assertNotEqual(
            cache_key_for("Backend Developer", 10, False),
            cache_key_for("Frontend Developer", 10, False),
        )

    def test_non_ascii_tracks_stay_distinct_rather_than_collapsing(self):
        """Sanitising alone would map every non-ASCII name onto underscores."""
        self.assertNotEqual(
            cache_key_for("Développeur", 10, False),
            cache_key_for("Entwickler", 10, False),
        )

    def test_the_limit_and_denominator_are_part_of_the_key(self):
        base = cache_key_for("Backend Developer", 10, False)

        self.assertNotEqual(base, cache_key_for("Backend Developer", 25, False))
        self.assertNotEqual(base, cache_key_for("Backend Developer", 10, True))


class ClampLimitTests(TestCase):
    def test_default_for_absent_and_junk(self):
        self.assertEqual(clamp_limit(None), DEFAULT_LIMIT)
        self.assertEqual(clamp_limit("lots"), DEFAULT_LIMIT)

    def test_a_valid_value_passes_through(self):
        self.assertEqual(clamp_limit(25), 25)
        self.assertEqual(clamp_limit("25"), 25)

    def test_bounds_are_enforced(self):
        self.assertEqual(clamp_limit(0), 1)
        self.assertEqual(clamp_limit(-3), 1)
        self.assertEqual(clamp_limit(10_000), MAX_LIMIT)


class AggregateSkillCountsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="a", password="password123")
        self.other = User.objects.create_user(username="b", password="password123")

    def test_counts_across_rows(self):
        make_analysis(self.user, matched=["python", "sql"], missing=["docker"])
        make_analysis(self.other, matched=["python"], missing=["docker", "redis"])

        matched, missing, total = aggregate_skill_counts(ResumeAnalysis.objects.all())

        self.assertEqual(total, 2)
        self.assertEqual(matched["python"], 2)
        self.assertEqual(matched["sql"], 1)
        self.assertEqual(missing["docker"], 2)

    def test_skill_names_are_case_folded(self):
        """`Python` and `python` were two rows on the board."""
        make_analysis(self.user, matched=["Python"])
        make_analysis(self.other, matched=["python"])

        matched, _, _ = aggregate_skill_counts(ResumeAnalysis.objects.all())

        self.assertEqual(matched["python"], 2)

    def test_a_non_list_json_value_is_skipped_not_counted(self):
        """`Counter.update` on a dict counts its keys, which is silently wrong."""
        analysis = make_analysis(self.user, matched=["python"])
        ResumeAnalysis.objects.filter(pk=analysis.pk).update(missing_skills={"docker": 1})

        matched, missing, total = aggregate_skill_counts(ResumeAnalysis.objects.all())

        self.assertEqual(total, 1)
        self.assertEqual(missing, {})

    def test_non_string_and_blank_entries_are_ignored(self):
        analysis = make_analysis(self.user)
        ResumeAnalysis.objects.filter(pk=analysis.pk).update(
            matched_skills=["python", None, 42, "  ", ""]
        )

        matched, _, _ = aggregate_skill_counts(ResumeAnalysis.objects.all())

        self.assertEqual(dict(matched), {"python": 1})

    def test_per_user_counts_a_repeated_upload_once(self):
        """One person re-running the same resume used to move the percentages."""
        for _ in range(8):
            make_analysis(self.user, matched=["python"])
        make_analysis(self.other, matched=["python"])

        by_row, _, row_total = aggregate_skill_counts(ResumeAnalysis.objects.all())
        by_user, _, user_total = aggregate_skill_counts(
            ResumeAnalysis.objects.all(), per_user=True
        )

        self.assertEqual((by_row["python"], row_total), (9, 9))
        self.assertEqual((by_user["python"], user_total), (2, 2))

    def test_per_user_keeps_matched_and_missing_separate(self):
        """A skill can be matched in one upload and missing in another."""
        make_analysis(self.user, matched=["python"], missing=["python"])

        matched, missing, _ = aggregate_skill_counts(
            ResumeAnalysis.objects.all(), per_user=True
        )

        self.assertEqual(matched["python"], 1)
        self.assertEqual(missing["python"], 1)

    def test_an_empty_queryset_gives_a_zero_denominator(self):
        matched, missing, total = aggregate_skill_counts(ResumeAnalysis.objects.none())

        self.assertEqual((dict(matched), dict(missing), total), ({}, {}, 0))


class TopSkillsTests(TestCase):
    def test_zero_total_does_not_divide_by_zero(self):
        from collections import Counter

        self.assertEqual(top_skills(Counter(), 0), [])
        self.assertEqual(top_skills(Counter({"python": 1}), 0)[0]["percentage"], 0)

    def test_the_limit_is_honoured(self):
        from collections import Counter

        counter = Counter({f"skill{i}": i for i in range(30)})

        self.assertEqual(len(top_skills(counter, 30, limit=5)), 5)


class AggregationIsStreamedTests(TestCase):
    """The memory claim, asserted structurally."""

    class NoMaterialising:
        """Proxy that allows `.iterator()` and fails on anything that loads rows."""

        def __init__(self, queryset, testcase):
            self._queryset = queryset
            self._testcase = testcase

        def values_list(self, *args, **kwargs):
            return type(self)(self._queryset.values_list(*args, **kwargs), self._testcase)

        def iterator(self, *args, **kwargs):
            return self._queryset.iterator(*args, **kwargs)

        def __iter__(self):
            self._testcase.fail("aggregation iterated the queryset instead of streaming it")

        def __len__(self):
            self._testcase.fail("aggregation called len() on the queryset, loading every row")

    def test_rows_are_streamed_not_loaded(self):
        user = User.objects.create_user(username="s", password="password123")
        for _ in range(5):
            make_analysis(user, matched=["python"])

        guarded = self.NoMaterialising(ResumeAnalysis.objects.all(), self)

        matched, _, total = aggregate_skill_counts(guarded)

        self.assertEqual((matched["python"], total), (5, 5))

    def test_the_queryset_cache_is_never_populated(self):
        """`.iterator()`'s real value: holding the queryset must not hold the rows."""
        user = User.objects.create_user(username="t", password="password123")
        make_analysis(user, matched=["python"])

        queryset = ResumeAnalysis.objects.all()
        aggregate_skill_counts(queryset)

        self.assertIsNone(queryset._result_cache)


class LeaderboardEndpointTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(username="lb", password="password123")
        make_analysis(self.user, role="Backend Developer", matched=["python"], missing=["docker"])
        make_analysis(self.user, role="Frontend Developer", matched=["react"], missing=["css"])

    def tearDown(self):
        cache.clear()

    def test_the_response_still_has_the_shape_the_page_reads(self):
        response = self.client.get("/api/skills-leaderboard/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in ("total_analyses", "matched_skills", "missing_skills", "last_updated"):
            self.assertIn(key, response.data)

    def test_skills_are_titled_for_display(self):
        response = self.client.get("/api/skills-leaderboard/")

        self.assertIn("Python", [row["skill"] for row in response.data["matched_skills"]])

    def test_filtering_by_track(self):
        response = self.client.get("/api/skills-leaderboard/?track=Backend Developer")

        self.assertEqual(response.data["total_analyses"], 1)
        self.assertEqual([r["skill"] for r in response.data["matched_skills"]], ["Python"])

    def test_a_differently_cased_track_hits_the_same_entry(self):
        first = self.client.get("/api/skills-leaderboard/?track=Backend Developer")
        second = self.client.get("/api/skills-leaderboard/?track=backend developer")

        self.assertEqual(first.data["matched_skills"], second.data["matched_skills"])

    def test_an_unknown_track_returns_an_empty_board_without_scanning(self):
        response = self.client.get("/api/skills-leaderboard/?track=Astronaut")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_analyses"], 0)
        self.assertEqual(response.data["matched_skills"], [])

    def test_junk_tracks_all_share_one_cache_entry(self):
        """The cache-poisoning half of the issue."""
        with patch("django.core.cache.cache.set", wraps=cache.set) as cache_set:
            self.client.get("/api/skills-leaderboard/?track=aaaa")
            self.client.get("/api/skills-leaderboard/?track=bbbb")
            self.client.get("/api/skills-leaderboard/?track=" + "z" * 3000)

        # The throttle and the role dictionary use the same cache, so only the
        # leaderboard's own keys are of interest here.
        keys = {
            call.args[0]
            for call in cache_set.call_args_list
            if str(call.args[0]).startswith("skills_leaderboard")
        }
        self.assertEqual(len(keys), 1, keys)

    def test_a_track_with_a_space_does_not_crash_the_cache_backend(self):
        with self.assertNoLogs("django.core.cache", level="WARNING"):
            response = self.client.get("/api/skills-leaderboard/?track=Backend Developer")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_the_limit_is_honoured_and_bounded(self):
        self.assertEqual(self.client.get("/api/skills-leaderboard/?limit=1").data["limit"], 1)
        self.assertEqual(
            self.client.get("/api/skills-leaderboard/?limit=99999").data["limit"], MAX_LIMIT
        )

    def test_per_user_changes_the_denominator(self):
        for _ in range(4):
            make_analysis(self.user, role="Backend Developer", matched=["python"])

        by_row = self.client.get("/api/skills-leaderboard/")
        by_user = self.client.get("/api/skills-leaderboard/?per_user=true")

        self.assertEqual(by_row.data["counted_by"], "analysis")
        self.assertEqual(by_user.data["counted_by"], "user")
        self.assertEqual(by_user.data["total_analyses"], 1)
        self.assertGreater(by_row.data["total_analyses"], by_user.data["total_analyses"])

    def test_results_are_cached(self):
        self.client.get("/api/skills-leaderboard/")

        with patch("analyzer.views.aggregate_skill_counts") as aggregate:
            self.client.get("/api/skills-leaderboard/")

        aggregate.assert_not_called()

    def test_a_different_limit_is_not_served_from_another_limits_cache(self):
        first = self.client.get("/api/skills-leaderboard/?limit=1")
        second = self.client.get("/api/skills-leaderboard/?limit=5")

        self.assertEqual(first.data["limit"], 1)
        self.assertEqual(second.data["limit"], 5)
