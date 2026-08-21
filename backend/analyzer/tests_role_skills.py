"""Tests for career-track skill resolution (#708).

Two claims are being made, and they pull against each other, which is why the
first attempt at this fix was wrong:

* **database edits must take effect** — they were being discarded;
* **experience levels must keep working** — a naive "database first" resolver
  answers the Mid-Level list at every level, because ``Role`` has no level
  column and ``0012`` seeded it with the Mid-Level lists.

`UntouchedInstallTests` pins the second and `DatabaseEditsTakeEffectTests` pins
the first. Most of the file needs no database: ``resolve`` takes both stores as
arguments precisely so it can be exercised as a function.
"""

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase

from analyzer import role_skills
from analyzer.role_skills import (
    DEFAULT_LEVEL,
    JUNIOR,
    MID_LEVEL,
    SENIOR,
    SOURCE_DATABASE,
    SOURCE_DEFAULTS,
    SOURCE_NONE,
    apply_level,
    canonical_role,
    known_roles,
    level_delta,
    normalise_level,
    normalise_skills,
    resolve,
)
from analyzer.services import EXPERIENCE_LEVEL_SKILLS, get_role_skills, resolve_role_skills

class RoleSkillTestCase(TestCase):
    """Base class that clears the role-skill cache around each test.

    ``get_role_skills()`` memoises the ``Role`` table in the process cache for a
    day. ``TestCase`` rolls the *database* back between tests but not the cache,
    so a test that edits a role and then reads it leaves the edited list cached
    for whatever runs next — and the failure lands in the innocent test.

    Clearing on both sides of the test rather than only before it, so this class
    also cannot leave a mess for a test that does not inherit from it.
    """

    ROLE_SKILL_CACHE_KEY = "role_skills_dict"

    def setUp(self):
        super().setUp()
        cache.delete(self.ROLE_SKILL_CACHE_KEY)

    def tearDown(self):
        cache.delete(self.ROLE_SKILL_CACHE_KEY)
        super().tearDown()


#: A miniature pair of stores, so the tests are not reading the real dictionary
#: and cannot be broken by an unrelated edit to it.
DEFAULTS = {
    JUNIOR: {"Widget Engineer": ["python", "git"]},
    MID_LEVEL: {"Widget Engineer": ["python", "git", "docker", "sql"]},
    SENIOR: {"Widget Engineer": ["python", "git", "docker", "sql", "leadership"]},
}


class NormaliseLevelTests(TestCase):
    def test_canonical_names_resolve_exactly(self):
        for level in (JUNIOR, MID_LEVEL, SENIOR):
            with self.subTest(level=level):
                self.assertEqual(normalise_level(level), (level, True))

    def test_common_phrasings_resolve(self):
        cases = {
            "Senior Engineer": SENIOR,
            "Staff Software Engineer": SENIOR,
            "Tech Lead": SENIOR,
            "Principal": SENIOR,
            "Entry level": JUNIOR,
            "Intern": JUNIOR,
            "Graduate": JUNIOR,
            "Intermediate": MID_LEVEL,
        }
        for raw, expected in cases.items():
            with self.subTest(raw=raw):
                self.assertEqual(normalise_level(raw), (expected, True))

    def test_an_unrecognised_level_says_so(self):
        """The whole point: "understood" and "gave up" used to be one answer."""
        level, recognised = normalise_level("Wizard")

        self.assertEqual(level, DEFAULT_LEVEL)
        self.assertFalse(recognised)

    def test_missing_and_non_string_levels_are_not_recognised(self):
        for raw in (None, "", "   ", 42, ["Senior"]):
            with self.subTest(raw=raw):
                self.assertEqual(normalise_level(raw), (DEFAULT_LEVEL, False))

    def test_principal_is_no_longer_scored_as_mid_level(self):
        """It was, and the response echoed "Principal" back while doing it."""
        self.assertEqual(normalise_level("Principal")[0], SENIOR)


class NormaliseSkillsTests(TestCase):
    def test_case_and_whitespace_are_folded(self):
        self.assertEqual(normalise_skills([" Docker ", "docker", "DOCKER"]), ["docker"])

    def test_order_is_preserved(self):
        self.assertEqual(normalise_skills(["sql", "python", "git"]), ["sql", "python", "git"])

    def test_blanks_and_non_strings_are_dropped(self):
        self.assertEqual(normalise_skills(["python", "", "  ", None, 7]), ["python"])

    def test_none_is_an_empty_list(self):
        self.assertEqual(normalise_skills(None), [])


class CanonicalRoleTests(TestCase):
    def test_casing_is_corrected_against_the_known_set(self):
        self.assertEqual(canonical_role("backend developer", ["Backend Developer"]), "Backend Developer")

    def test_an_unknown_role_is_returned_unchanged(self):
        """Rewriting it to a role that does exist would be worse than not matching."""
        self.assertEqual(canonical_role("Astronaut", ["Backend Developer"]), "Astronaut")

    def test_blank_and_non_string_roles(self):
        self.assertEqual(canonical_role("", ["Backend Developer"]), "")
        self.assertEqual(canonical_role(None, ["Backend Developer"]), "")


class LevelDeltaTests(TestCase):
    def test_a_senior_delta_adds(self):
        added, removed = level_delta("Widget Engineer", SENIOR, DEFAULTS)

        self.assertEqual(added, ["leadership"])
        self.assertEqual(removed, set())

    def test_a_junior_delta_removes(self):
        added, removed = level_delta("Widget Engineer", JUNIOR, DEFAULTS)

        self.assertEqual(added, [])
        self.assertEqual(removed, {"docker", "sql"})

    def test_the_baseline_level_has_no_delta(self):
        self.assertEqual(level_delta("Widget Engineer", MID_LEVEL, DEFAULTS), ([], set()))

    def test_a_role_with_no_packaged_tiers_has_no_delta(self):
        """Borrowing another role's tiers would invent requirements."""
        self.assertEqual(level_delta("Astronaut", SENIOR, DEFAULTS), ([], set()))

    def test_a_delta_can_both_add_and_remove(self):
        """Backend Junior really does add `javascript` while dropping several."""
        added, removed = level_delta("Backend Developer", JUNIOR, EXPERIENCE_LEVEL_SKILLS)

        self.assertIn("javascript", added)
        self.assertIn("django", removed)


class ApplyLevelTests(TestCase):
    def test_removals_then_additions(self):
        self.assertEqual(
            apply_level(["python", "git", "docker"], ["leadership"], {"docker"}),
            ["python", "git", "leadership"],
        )

    def test_an_addition_already_present_is_not_duplicated(self):
        self.assertEqual(apply_level(["python"], ["python", "git"], set()), ["python", "git"])

    def test_the_baseline_order_survives(self):
        self.assertEqual(apply_level(["c", "b", "a"], [], set()), ["c", "b", "a"])


class ResolvePrecedenceTests(TestCase):
    """Which store answers, and what happens to the level."""

    def test_the_database_supplies_the_baseline_when_it_has_the_role(self):
        result = resolve("Widget Engineer", MID_LEVEL, {"Widget Engineer": ["rust"]}, DEFAULTS)

        self.assertEqual(result.source, SOURCE_DATABASE)
        self.assertEqual(result.skills, ["rust"])

    def test_the_defaults_answer_when_the_database_does_not_have_the_role(self):
        result = resolve("Widget Engineer", MID_LEVEL, {}, DEFAULTS)

        self.assertEqual(result.source, SOURCE_DEFAULTS)
        self.assertEqual(result.skills, ["python", "git", "docker", "sql"])

    def test_an_empty_database_list_does_not_blank_the_role(self):
        """A Role row with no skills attached is a half-finished edit, not an intent."""
        result = resolve("Widget Engineer", MID_LEVEL, {"Widget Engineer": []}, DEFAULTS)

        self.assertEqual(result.source, SOURCE_DEFAULTS)

    def test_a_role_neither_store_knows_resolves_to_nothing(self):
        result = resolve("Astronaut", MID_LEVEL, {}, DEFAULTS)

        self.assertEqual(result.source, SOURCE_NONE)
        self.assertEqual(result.skills, [])

    def test_the_level_delta_applies_on_top_of_a_database_baseline(self):
        """The property the whole design exists for."""
        database = {"Widget Engineer": ["python", "git", "docker", "sql", "rust"]}

        junior = resolve("Widget Engineer", JUNIOR, database, DEFAULTS)
        senior = resolve("Widget Engineer", SENIOR, database, DEFAULTS)

        self.assertEqual(junior.skills, ["python", "git", "rust"])
        self.assertEqual(senior.skills, ["python", "git", "docker", "sql", "rust", "leadership"])

    def test_a_database_only_role_is_not_level_adjusted(self):
        result = resolve("Astronaut", SENIOR, {"Astronaut": ["orbit"]}, DEFAULTS)

        self.assertEqual(result.skills, ["orbit"])
        self.assertFalse(result.level_adjusted)

    def test_the_requested_level_is_reported_alongside_the_one_used(self):
        result = resolve("Widget Engineer", "Wizard", {}, DEFAULTS)

        self.assertEqual(result.level, DEFAULT_LEVEL)
        self.assertEqual(result.level_as_requested, "Wizard")
        self.assertFalse(result.level_recognised)

    def test_role_casing_is_matched_across_the_two_stores(self):
        result = resolve("widget engineer", MID_LEVEL, {"Widget Engineer": ["rust"]}, DEFAULTS)

        self.assertEqual(result.role, "Widget Engineer")
        self.assertEqual(result.source, SOURCE_DATABASE)

    def test_the_dict_form_carries_everything_a_response_needs(self):
        payload = resolve("Widget Engineer", "Principal", {}, DEFAULTS).as_dict()

        self.assertEqual(payload["level"], SENIOR)
        self.assertEqual(payload["level_as_requested"], "Principal")
        self.assertEqual(payload["source"], SOURCE_DEFAULTS)


class KnownRolesTests(TestCase):
    def test_both_stores_contribute(self):
        names = known_roles({"Astronaut": ["orbit"]}, DEFAULTS)

        self.assertIn("Astronaut", names)
        self.assertIn("Widget Engineer", names)

    def test_a_role_in_both_appears_once_with_the_database_casing(self):
        names = known_roles({"widget engineer": ["rust"]}, DEFAULTS)

        self.assertEqual(names, ["widget engineer"])

    def test_an_unseeded_database_still_lists_the_packaged_roles(self):
        """An empty Role table used to produce an empty track-comparison table."""
        self.assertEqual(known_roles({}, DEFAULTS), ["Widget Engineer"])


class UntouchedInstallTests(RoleSkillTestCase):
    """Nothing may move for a deployment nobody has edited.

    `0012` seeded `Role` with the Mid-Level lists, so this is the case a naive
    database-first resolver silently breaks — and it is the case every existing
    deployment is in.
    """

    def test_every_packaged_level_resolves_to_its_packaged_list(self):
        database = get_role_skills()

        for level, roles in EXPERIENCE_LEVEL_SKILLS.items():
            for role, expected in roles.items():
                with self.subTest(level=level, role=role):
                    # Compared as sets: the database read is sorted while the
                    # packaged lists are in their written order, and the score
                    # is a ratio over the set. `test_resolution_is_stable`
                    # covers the property that order does need to hold.
                    self.assertEqual(
                        set(resolve(role, level, database, EXPERIENCE_LEVEL_SKILLS).skills),
                        set(normalise_skills(expected)),
                    )

    def test_resolution_is_stable_across_calls(self):
        """An unstable order would make two runs of one resume read differently."""
        first = resolve_role_skills("Backend Developer", SENIOR).skills
        second = resolve_role_skills("Backend Developer", SENIOR).skills

        self.assertEqual(first, second)

    def test_no_skill_is_required_twice(self):
        skills = resolve_role_skills("Backend Developer", SENIOR).skills

        self.assertEqual(len(skills), len(set(skills)))

    def test_the_seeded_database_supplies_the_baseline(self):
        result = resolve_role_skills("Backend Developer", MID_LEVEL)

        self.assertEqual(result.source, SOURCE_DATABASE)

    def test_junior_still_expects_less_than_senior(self):
        junior = resolve_role_skills("Backend Developer", JUNIOR).skills
        senior = resolve_role_skills("Backend Developer", SENIOR).skills

        self.assertLess(len(junior), len(senior))


class DatabaseEditsTakeEffectTests(RoleSkillTestCase):
    """The reported bug.

    Before this change, every assertion in this class failed: the m2m signal
    cleared the cache, `get_role_skills()` re-read the table, and the result was
    discarded one line later.
    """

    def setUp(self):
        from analyzer.models import Role, Skill

        self.role = Role.objects.get(name="Backend Developer")
        self.rust, _ = Skill.objects.get_or_create(name="rust")

    def test_an_added_skill_becomes_a_requirement(self):
        self.role.skills.add(self.rust)

        self.assertIn("rust", resolve_role_skills("Backend Developer", MID_LEVEL).skills)

    def test_an_added_skill_applies_at_every_level(self):
        self.role.skills.add(self.rust)

        for level in (JUNIOR, MID_LEVEL, SENIOR):
            with self.subTest(level=level):
                self.assertIn("rust", resolve_role_skills("Backend Developer", level).skills)

    def test_a_removed_skill_stops_being_a_requirement(self):
        from analyzer.models import Skill

        self.role.skills.remove(Skill.objects.get(name="django"))

        self.assertNotIn("django", resolve_role_skills("Backend Developer", MID_LEVEL).skills)

    def test_a_new_role_is_scored_from_the_database_alone(self):
        from analyzer.models import Role

        role = Role.objects.create(name="Platform Engineer")
        role.skills.add(self.rust)

        result = resolve_role_skills("Platform Engineer", SENIOR)

        self.assertEqual(result.source, SOURCE_DATABASE)
        self.assertEqual(result.skills, ["rust"])

    def test_a_new_role_joins_the_known_set(self):
        from analyzer.models import Role
        from analyzer.services import get_known_roles

        Role.objects.create(name="Platform Engineer")

        self.assertIn("Platform Engineer", get_known_roles())


class AnalysisReportsItsSourceTests(RoleSkillTestCase):
    """The resolved requirements reach the response, not just the score."""

    def setUp(self):
        self.user = User.objects.create_user(username="jane", password="password123")

    def _analyse(self, level="Senior", job_description=None):
        from unittest.mock import patch

        from analyzer.services import analyze_resume
        from analyzer.tests import _fake_pdf

        with patch("analyzer.services.pdfplumber.open") as mock_open:
            mock_open.return_value = _fake_pdf("Python, Django, SQL, Docker, Git.")
            return analyze_resume(
                "dummy.pdf",
                "Backend Developer",
                experience_level=level,
                job_description=job_description,
            )

    def test_the_response_says_which_store_answered(self):
        result = self._analyse()

        self.assertEqual(result["role_skills"]["source"], SOURCE_DATABASE)

    def test_the_response_says_which_level_was_actually_used(self):
        result = self._analyse(level="Principal")

        self.assertEqual(result["role_skills"]["level"], SENIOR)
        self.assertEqual(result["role_skills"]["level_as_requested"], "Principal")
        self.assertTrue(result["role_skills"]["level_recognised"])

    def test_an_unrecognised_level_is_flagged_rather_than_hidden(self):
        result = self._analyse(level="Wizard")

        self.assertEqual(result["role_skills"]["level"], MID_LEVEL)
        self.assertFalse(result["role_skills"]["level_recognised"])

    def test_a_job_description_is_named_as_the_source(self):
        result = self._analyse(job_description="We need Python, Django and Kubernetes.")

        self.assertEqual(result["role_skills"]["source"], "job-description")

    def test_every_track_comparison_row_names_its_source(self):
        result = self._analyse()

        self.assertTrue(result["track_comparisons"])
        for role, row in result["track_comparisons"].items():
            with self.subTest(role=role):
                self.assertIn(row["skills_source"], (SOURCE_DATABASE, SOURCE_DEFAULTS))

    def test_track_comparisons_cover_every_known_role(self):
        result = self._analyse()

        self.assertEqual(
            set(result["track_comparisons"]),
            set(role_skills.known_roles(get_role_skills(), EXPERIENCE_LEVEL_SKILLS)),
        )
