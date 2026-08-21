# Career tracks and their skills

A resume is scored against a list of required skills. Where that list comes from
depends on the request, and there are three possible answers.

## 1. A pasted job description

If the analysis carries a job description, the required skills are extracted
from it and neither store below is consulted. The response reports
`role_skills.source` as `"job-description"`.

This is the highest-precedence source and always has been. It is stated here
because it used to be inferred from an absent field.

## 2. The `Role` table

Otherwise the requirements come from the `Role` / `Skill` tables, editable in
the Django admin under **Analyzer → Roles**. Adding a skill to a role makes it a
requirement; removing one stops it being a requirement.

**Until #708 this had no effect.** A dictionary in `services.py` was checked
first and matched every role the product ships, so the database was read,
cached, invalidated correctly — and then discarded. If you edited a role before
that fix and saw nothing change, that is why.

## 3. The packaged defaults

`services.EXPERIENCE_LEVEL_SKILLS` covers Frontend Developer, Backend Developer
and Data Analyst. It answers for any role the `Role` table does not have, so a
fresh install with no rows still works.

## Experience levels

The `Role` table holds **one skill list per role**, with no level column. The
packaged defaults hold three lists per role, one per level. Levels are therefore
applied as a *delta* on top of whichever store supplied the baseline:

```
added   = defaults[level][role] − defaults["Mid-Level"][role]
removed = defaults["Mid-Level"][role] − defaults[level][role]

required = (baseline − removed) + added
```

Two things follow.

**On an untouched install nothing moves.** Migration `0012` seeded `Role` with
the Mid-Level lists, so the baseline *is* the Mid-Level list and every level
resolves to exactly the packaged list it always did.

**An edit applies at every level.** Add `rust` to Backend Developer and it is
required at Junior, Mid and Senior, because it appears in no level's `removed`
set. Remove `webpack` from Frontend Developer and it is gone at all three.

### What you cannot express yet

"Docker, but only from Senior upwards" needs a level dimension on `Role`, which
is a schema change. It belongs with the admin UI work in #545/#546. The delta
machinery above is a way of not losing the existing tiers while fixing the bug —
not the intended end state.

A role that exists **only** in the database has no packaged tiers, so it is used
as-is at every level. The response reports `role_skills.level_adjusted: false`
for those, rather than implying a tier was applied.

## Levels the analyzer recognises

| You send | Scored as |
| --- | --- |
| `Junior`, `Entry level`, `Intern`, `Graduate`, `Trainee`, `Associate` | Junior |
| `Mid-Level`, `Intermediate`, `Regular` | Mid-Level |
| `Senior`, `Lead`, `Staff`, `Principal`, `Architect`, `Head of …`, `Director` | Senior |
| anything else | Mid-Level, with `level_recognised: false` |

`Principal` used to score as Mid-Level while the response echoed `"Principal"`
straight back. The response now reports both `level_as_requested` and the
`level` actually used, so a client can tell "we read Principal as Senior" from
"Principal is a level we know".

## Reading it back

```json
"role_skills": {
  "role": "Backend Developer",
  "level": "Senior",
  "level_as_requested": "Principal",
  "level_recognised": true,
  "level_adjusted": true,
  "source": "database",
  "skills": ["python", "django", "..."]
}
```

Every row of `track_comparisons` carries a `skills_source` for the same reason:
two rows in one table can come from different stores, and a score whose
provenance is invisible is one nobody can debug.
