# Employment timeline analysis

Every other signal the analyzer produces is about **what** a resume says. This
one is about **when**.

Recruiters read the dates before the bullets, and ATS platforms parse them into
structured employment records, so a resume can score 90 on keywords and still be
filtered on its history. The analysis is returned under `timeline` alongside
`score_breakdown`.

## What it reports

| Finding | Severity | Raised when |
| --- | --- | --- |
| `undated_role` | high | A line reads like a job title with no date range near it |
| `reversed_range` | high | A range ends before it starts |
| `employment_gap` | medium / high | A gap of 4 months or more; high past a year |
| `future_date` | medium | A start more than 3 months from now |
| `seniority_mismatch` | medium | Total experience falls short of the selected level |
| `overlapping_roles` | low | Two roles run concurrently for 2 months or more |
| `mixed_date_formats` | low | More than one date format in the document |
| `year_only_dates` | low | A range gives years but no months |
| `no_dates_found` | info | Nothing parseable — see below |

Each finding carries a `message` written for the person being scored, meant to
be rendered as-is, and usually an `evidence` string quoting the resume so the
line can be found.

## Formats it reads

```
Jan 2020 – Mar 2022      January 2020 to March 2022      Sept. 2019 - Dec. 2021
03/2017 - 06/2019        2020-01 until 2021-11           2015 – 2016
Jan 2020 – Present       Mar 2021 - Current              Feb 2019 - now
```

Hyphen, double hyphen, en dash, em dash, tilde, `to`, `until`, `through` and
`till` all separate a range. `Present`, `Current`, `Currently`, `Now`,
`Ongoing`, `To date` and `Today` all mean an open end.

Ranges are matched **within a line**, never across a line break. Two-column
resumes flatten to text in ways that would otherwise let the end of one line and
the start of the next combine into a date nobody wrote.

## Total experience

Reported as the **union** of the ranges, so concurrent roles are counted once. A
promotion written as two entries, or a contract held alongside a staff job,
would otherwise inflate the total — and that total is what the seniority check
compares against, so double-counting there produces exactly the wrong advice.

A year-only end reads as **December** of that year. `2019 – 2021` describes work
through 2021; treating it as ending that January would invent an eleven-month
gap that is not in the document.

## Silence is a feature

The layout is gone by the time this sees the text. `pdfplumber` gives a stream
of lines with no idea which is a heading and which is a bullet, so this cannot
know that `Acme Corp` and `Jan 2020 – Mar 2022` belong together — only that they
are near each other.

So the rule is: **report what is confident, say nothing where it is not.**

- If no range parses at all, the result is `parsed: false` and one `info`
  finding saying *we could not read your dates* — not a page of warnings. A
  false "you forgot your dates" on a resume that has them sends someone looking
  for a problem that does not exist, which is worse than missing a real one.
- `undated_role` is only ever raised once some ranges *have* parsed, and a
  heading counts as dated when a range appears one line above it or up to two
  lines below. That covers `Title / Dates`, `Title / Company / Dates`, dates on
  the same line, and a right-aligned date column that flattened above its
  heading.
- A line containing any four-digit year is skipped entirely: a date we failed to
  pair into a *range* is still a date.

## It does not affect your score

`timeline` is deliberately not folded into the headline `score`. That number is
persisted on `ResumeAnalysis` and read by the leaderboard, version comparison
and the weekly digest, so changing what it means would change every historical
row — the same reasoning `scoring.compute_score_breakdown` gives for staying out
of it.

## Shape

```json
"timeline": {
  "parsed": true,
  "total_months": 79,
  "total_years": 6.6,
  "largest_gap_months": 14,
  "has_current_role": true,
  "formats_seen": ["Jan 2020", "Present"],
  "ranges": [
    {
      "start_year": 2020, "start_month": 1,
      "end_year": null, "end_month": null,
      "is_current": true,
      "text": "Jan 2020 - Present",
      "line": "Senior Backend Engineer, Acme Corp   Jan 2020 - Present"
    }
  ],
  "findings": [
    {
      "code": "employment_gap",
      "severity": "high",
      "message": "There is a gap of 1 year 2 months between …",
      "evidence": "Mar 2017 - Jun 2019 → Jan 2020 - Present"
    }
  ]
}
```

`findings` is sorted by severity, so a UI can render it in order without
sorting again.
