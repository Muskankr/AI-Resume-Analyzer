"""Which skills a career track requires, and which store answers that question.

There are two stores, and until now the one nobody can edit won.

``services.EXPERIENCE_LEVEL_SKILLS`` is a dictionary in a Python module.
``Role`` / ``Skill`` are tables, seeded by migration ``0012_populate_role_skills``
and kept fresh by cache-invalidating signals in ``models.py``. The resolver
looked at the dictionary first:

.. code-block:: python

    level_dict = EXPERIENCE_LEVEL_SKILLS.get(norm_level, {})
    if target_role in level_dict:
        return level_dict[target_role]          # <- database never consulted
    return get_role_skills().get(target_role, [])

For the only three roles the product ships — Frontend Developer, Backend
Developer, Data Analyst — the dictionary always matched, so the database branch
was dead code. Editing a ``Role``'s skills changed nothing: the m2m signal
cleared the cache correctly, ``get_role_skills()`` re-read the table correctly,
and the result was discarded one line later.

That matters now rather than in the abstract, because #545 and #546 both propose
an admin UI over exactly those tables. Built on the old resolver, that UI would
be a no-op for every role a user can pick.

The obvious fix is wrong
------------------------
"Read the database first, fall back to the packaged defaults" loses experience
levels. The ``Role`` table has **no level column** — it holds one skill list per
role — and ``0012`` seeded it with the *Mid-Level* lists. So a database-first
resolver answers the Mid-Level set at every level, and a Junior resume is
suddenly measured against Senior requirements. The existing
``ExperienceLevelTests`` catch exactly that, which is how I found it.

What actually holds
-------------------
The two stores answer different questions, and neither is redundant:

* the **database** says *which skills this role needs* — the thing an operator
  edits, and the thing that was being ignored;
* the packaged **level tiers** say *how a role's requirements move with
  seniority* — expressed nowhere in the schema, and not something an operator
  can currently state.

So a level is treated as a **delta from Mid-Level**, derived from the packaged
data rather than hand-maintained:

.. code-block:: text

    added   = EXPERIENCE_LEVEL_SKILLS[level][role] - EXPERIENCE_LEVEL_SKILLS["Mid-Level"][role]
    removed = EXPERIENCE_LEVEL_SKILLS["Mid-Level"][role] - EXPERIENCE_LEVEL_SKILLS[level][role]

and the result is ``(baseline - removed) | added``, where ``baseline`` is the
database's list when it has the role and the packaged Mid-Level list otherwise.

Two properties fall out of that, and both are tested:

1. On an untouched install the baseline *is* the Mid-Level list, so every level
   resolves to exactly the packaged list it always did. Nothing moves.
2. An operator who adds ``rust`` to Backend Developer gets it at all three
   levels, because it appears in no level's ``removed`` set — and one who
   removes ``webpack`` loses it at all three, for the same reason.

The limitation this leaves
--------------------------
An operator still cannot say "Docker, but only from Senior". That needs a level
dimension on ``Role``, which is a schema change and belongs with the admin UI
work in #545/#546 rather than in a bug fix. Naming it here so the next person
does not read the delta machinery as the intended end state.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Sequence, Tuple

#: Canonical experience levels, in order of seniority.
JUNIOR = "Junior"
MID_LEVEL = "Mid-Level"
SENIOR = "Senior"

LEVELS = (JUNIOR, MID_LEVEL, SENIOR)

#: The level the packaged deltas are measured from, and the one assumed when
#: nothing recognisable was supplied. Mid-Level on both counts because it is the
#: middle of the range: reading an unknown level as Junior or Senior is wrong by
#: two steps half the time, and by one step this way.
BASELINE_LEVEL = MID_LEVEL
DEFAULT_LEVEL = MID_LEVEL

#: Words that identify a level, checked as substrings because callers send
#: things like "Senior / Staff Engineer" and "Entry level".
#:
#: Ordered most specific first, so adding a keyword that is a substring of
#: another stays safe.
LEVEL_KEYWORDS = (
    (JUNIOR, ("junior", "entry", "intern", "graduate", "trainee", "associate")),
    (SENIOR, ("senior", "lead", "staff", "principal",
     "architect", "head of", "director")),
    (MID_LEVEL, ("mid", "intermediate", "regular")),
)

#: Where a baseline came from. Reported alongside the list because the two
#: stores can disagree and a reader needs to know which one they are looking at.
SOURCE_DATABASE = "database"
SOURCE_DEFAULTS = "packaged-defaults"
SOURCE_NONE = "none"


@dataclass(frozen=True)
class RoleSkillSet:
    """A resolved skill list, with its provenance.

    Attributes:
        role: The role as resolved, canonically cased.
        level: The canonical level actually used for scoring.
        skills: Required skills, lower-cased and de-duplicated, order preserved.
        source: Which store supplied the baseline — one of
            :data:`SOURCE_DATABASE`, :data:`SOURCE_DEFAULTS`, :data:`SOURCE_NONE`.
        level_adjusted: Whether a level delta was applied on top of the
            baseline. ``False`` for a database-only role, which has no packaged
            tiers to move it.
        level_recognised: ``False`` when the caller's level was not understood
            and :data:`DEFAULT_LEVEL` was substituted. The caller decides what to
            do about it; this only refuses to hide it.
        level_as_requested: Exactly what the caller sent, so a response can
            report both what was asked for and what was used.
    """

    role: str
    level: str
    skills: List[str] = field(default_factory=list)
    source: str = SOURCE_NONE
    level_adjusted: bool = False
    level_recognised: bool = True
    level_as_requested: str = ""

    def as_dict(self):
        return {
            "role": self.role,
            "level": self.level,
            "level_as_requested": self.level_as_requested,
            "level_recognised": self.level_recognised,
            "level_adjusted": self.level_adjusted,
            "skills": list(self.skills),
            "source": self.source,
        }


def normalise_level(raw) -> Tuple[str, bool]:
    """Return ``(level, recognised)`` for a caller-supplied experience level.

    ``recognised`` is the point of this function. The previous version returned
    only the level, so "we understood you" and "we gave up and picked the
    middle" were the same answer — and ``"Principal"`` was scored as Mid-Level
    while the response echoed ``"Principal"`` straight back.

    >>> normalise_level("Senior Engineer")
    ('Senior', True)
    >>> normalise_level("Principal")
    ('Senior', True)
    >>> normalise_level("Wizard")
    ('Mid-Level', False)
    >>> normalise_level(None)
    ('Mid-Level', False)
    """
    if not isinstance(raw, str):
        return DEFAULT_LEVEL, False

    text = raw.strip().lower()
    if not text:
        return DEFAULT_LEVEL, False

    # An exact canonical name should not depend on keyword matching.
    for level in LEVELS:
        if text == level.lower():
            return level, True

    for level, keywords in LEVEL_KEYWORDS:
        if any(keyword in text for keyword in keywords):
            return level, True

    return DEFAULT_LEVEL, False


def normalise_skills(skills: Sequence) -> List[str]:
    """Lower-case, trim and de-duplicate a skill list, preserving order.

    The two stores are populated by different routes — a migration now, an admin
    form later — so their casing and spacing will not agree. Matching is
    case-insensitive downstream, but the list is also counted, echoed into
    suggestions and compared between roles, so normalising once here keeps
    ``Docker`` and ``docker`` from behaving like two requirements.
    """
    seen = set()
    result = []

    for skill in skills or ():
        if not isinstance(skill, str):
            continue
        name = skill.strip().lower()
        if not name or name in seen:
            continue
        seen.add(name)
        result.append(name)

    return result


def canonical_role(raw, known: Sequence[str]) -> str:
    """Return ``raw`` matched case-insensitively against ``known``.

    Returns the caller's string unchanged when nothing matches, so an unknown
    role reaches the "no skills for this role" path rather than being silently
    rewritten to one that does exist.
    """
    if not isinstance(raw, str):
        return ""

    text = raw.strip()
    if not text:
        return ""

    for name in known:
        if isinstance(name, str) and name.strip().lower() == text.lower():
            return name

    return text


def _lookup(mapping: Dict[str, Sequence[str]], role: str):
    """Case-insensitive lookup, so the two stores need not agree on casing."""
    if role in mapping:
        return mapping[role]

    folded = role.strip().lower()
    for name, value in mapping.items():
        if isinstance(name, str) and name.strip().lower() == folded:
            return value

    return None


def level_delta(role, level, default_roles_by_level) -> Tuple[List[str], set]:
    """Return ``(added, removed)`` for ``role`` at ``level``, against Mid-Level.

    Derived from the packaged data rather than written out by hand, so the tiers
    cannot drift away from the lists they are supposed to describe.

    ``added`` is a list to keep its order stable in the resolved output;
    ``removed`` is a set because nothing iterates it.

    Both are empty when the role has no packaged tiers — a role that exists only
    in the database has nothing to move it, and inventing a movement from
    another role's tiers would be worse than not varying by level.
    """
    baseline = _lookup(default_roles_by_level.get(BASELINE_LEVEL, {}), role)
    at_level = _lookup(default_roles_by_level.get(level, {}), role)

    if baseline is None or at_level is None:
        return [], set()

    baseline_skills = normalise_skills(baseline)
    level_skills = normalise_skills(at_level)
    baseline_set = set(baseline_skills)
    level_set = set(level_skills)

    added = [skill for skill in level_skills if skill not in baseline_set]
    removed = baseline_set - level_set

    return added, removed


def apply_level(baseline: Sequence[str], added: Sequence[str], removed) -> List[str]:
    """Return ``baseline`` with ``removed`` dropped and ``added`` appended.

    Order follows the baseline, with additions appended. Which order that is
    depends on which store answered — the packaged lists are in their written
    order, the database's are sorted — but it is *stable* either way, which is
    what matters: the list is shown to the user and each entry is worth one over
    its length, so two runs of the same resume must read the same way.
    """
    result = [skill for skill in normalise_skills(
        baseline) if skill not in removed]
    known = set(result)

    for skill in normalise_skills(added):
        if skill not in known:
            known.add(skill)
            result.append(skill)

    return result


def resolve(
    role,
    level,
    database_roles: Dict[str, Sequence[str]],
    default_roles_by_level: Dict[str, Dict[str, Sequence[str]]],
) -> RoleSkillSet:
    """Resolve the required skills for one role at one level.

    Args:
        role: Role name as supplied by the caller.
        level: Experience level as supplied by the caller.
        database_roles: ``{role_name: [skill, ...]}`` from the ``Role`` table.
            Passed in rather than queried, so this module is testable without a
            database and the dependency runs one way.
        default_roles_by_level: ``{level: {role_name: [skill, ...]}}`` — the
            packaged tiers.

    Returns:
        A :class:`RoleSkillSet`, always. An unknown role gives an empty list
        with :data:`SOURCE_NONE` rather than raising: an unrecognised role is
        something a user can type, not an exceptional condition.
    """
    known = list(database_roles.keys()) + [
        name for level_map in default_roles_by_level.values() for name in level_map
    ]
    canonical = canonical_role(role, known)
    resolved_level, recognised = normalise_level(level)
    requested = level if isinstance(level, str) else ""

    baseline = _lookup(database_roles, canonical)
    source = SOURCE_DATABASE

    if not baseline:
        baseline = _lookup(default_roles_by_level.get(
            BASELINE_LEVEL, {}), canonical)
        source = SOURCE_DEFAULTS

    if not baseline:
        return RoleSkillSet(
            role=canonical,
            level=resolved_level,
            skills=[],
            source=SOURCE_NONE,
            level_recognised=recognised,
            level_as_requested=requested,
        )

    added, removed = level_delta(
        canonical, resolved_level, default_roles_by_level)

    return RoleSkillSet(
        role=canonical,
        level=resolved_level,
        skills=apply_level(baseline, added, removed),
        source=source,
        level_adjusted=bool(added or removed),
        level_recognised=recognised,
        level_as_requested=requested,
    )


def known_roles(
    database_roles: Dict[str, Sequence[str]],
    default_roles_by_level: Dict[str, Dict[str, Sequence[str]]],
) -> List[str]:
    """Every role either store knows about, database names winning on casing.

    ``analyze_resume`` builds its track comparison by iterating the roles it
    knows. It used to iterate only the database's, so a deployment whose
    ``Role`` table had never been seeded produced an empty comparison table
    while still scoring the requested role perfectly well from the packaged
    defaults — two different answers to "which roles exist" in one response.
    """
    names = [name for name in database_roles if isinstance(name, str)]
    lowered = {name.strip().lower() for name in names}

    for level_map in default_roles_by_level.values():
        for name in level_map:
            if not isinstance(name, str):
                continue
            if name.strip().lower() not in lowered:
                lowered.add(name.strip().lower())
                names.append(name)

    return names
