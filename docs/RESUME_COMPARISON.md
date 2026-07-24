# Resume Version Comparison

Implements [#201](https://github.com/Muskankr/AI-Resume-Analyzer/issues/201): compare two saved
resume analyses and get an AI-generated explanation of what changed and why the ATS score moved.

## Architecture

```
Upload v1 ──► analyze_resume() ──► ResumeAnalysis row #1 (score, skills, resume_text, ...)
Upload v2 ──► analyze_resume() ──► ResumeAnalysis row #2
                                          │
                     GET /api/compare/?older=1&newer=2
                                          │
                                          ▼
                            analyzer/comparison.py:compare_versions()
                     (skill set diff · matched/missing diff · line diff
                      of resume_text · rule-based insight generator)
                                          │
                                          ▼
                              VersionComparisonSerializer
                                          │
                                          ▼
                    frontend: useCompareVersions() ──► CompareVersions modal
                                          │
                                          ▼
                              exportComparisonPdf() (jsPDF, client-side)
```

### Why every version is preserved

`analyzer/services.py` previously used `update_or_create` keyed on
`(user, file_name, target_role, job_description)`, so re-analyzing an edited
resume with the same filename silently overwrote the prior row — no history
survived. This is now a straight `create`, so each upload becomes its own
immutable `ResumeAnalysis` row and the full revision history is retained.
`resume_text` is now persisted on the row (it was previously discarded after
the API response) so content-level diffing is possible.

### Why the "AI insight" is rule-based, not an LLM call

The project has no LLM provider wired up (no API key/SDK in
`requirements.txt`), and the existing suggestion engine in `services.py` is
itself template-based. `comparison.py` follows the same pattern: it turns the
score delta and skill/content diffs into natural-language sentences
deterministically. This keeps the feature dependency-free, free to run, and
easy to unit test. If/when an LLM provider is added to the project, the single
integration point to swap in a model-generated explanation is
`_generate_insights()` in `analyzer/comparison.py`.

## API

`GET /api/compare/?older=<id>&newer=<id>` (auth required, JWT bearer token)

Both ids must be `ResumeAnalysis` rows owned by the requesting user, and must
differ. Returns:

```json
{
  "older_id": 1, "newer_id": 2,
  "older_label": "resume.pdf — Jul 10, 2026 09:00",
  "newer_label": "resume.pdf — Jul 18, 2026 14:22",
  "older_score": 40, "newer_score": 70, "score_delta": 30,
  "added_skills": ["react"],
  "removed_skills": [],
  "newly_matched_skills": ["react"],
  "newly_missing_skills": [],
  "still_missing_skills": ["git"],
  "text_diff": [{"type": "added", "text": "Built UIs with React"}],
  "insights": [
    "Your ATS score improved by 30 points (40% → 70%).",
    "You now cover 1 more required skill for this role than before: React. ..."
  ]
}
```

Errors: `400` missing/identical ids, `401` unauthenticated, `404` id not
found or not owned by the caller.

## Frontend

- `hooks/useCompareVersions.ts` — fetches a comparison for two analysis ids.
- `components/CompareVersions/CompareVersions.tsx` — modal: version pickers,
  score delta banner, insight list, added/removed/still-missing skill badges,
  line-level content diff, PDF export button.
- `utils/exportComparisonPdf.ts` — builds the exportable PDF report client-side
  with `jsPDF` (no backend PDF dependency needed).
- Entry point: a "Compare" button in `HistorySidebar`'s header, shown once a
  signed-in user has 2+ saved analyses. Only entries with a numeric (database)
  id are comparable — locally-cached guest entries aren't persisted server-side
  and have no `resume_text` to diff against.

## Tests

`backend/analyzer/tests.py`:
- `CompareVersionsEngineTests` — score delta, skill diffs, insight text, for
  improvements, regressions, and identical versions.
- `CompareVersionsAPITests` — auth required, missing/duplicate id validation,
  and that a user cannot compare another user's analyses.

Run with `python manage.py test analyzer`.

## Known follow-ups (not covered by this change)

- `frontend/src/App.tsx` has pre-existing, unrelated merge corruption
  (duplicated JSX blocks for the role-selector/upload sections, a stray
  duplicate `<h1>`/`<label>`, and mismatched tags) that predates this feature
  and currently breaks `tsc`/the Vite build. It needs a dedicated cleanup pass
  before this or any other new UI can be verified end-to-end in the browser.
  The `CompareVersions` modal and `HistorySidebar` changes here are complete
  and type-check cleanly in isolation; wiring them into `App.tsx`'s render
  tree only requires the snippets already added there (imports, `compareOpen`
  state, `<CompareVersions />`) once the file itself compiles again.
- Section-wise change detection (work experience / projects / education /
  certifications) currently falls back to a line-level text diff, since the
  backend doesn't parse resumes into structured sections yet. A dedicated
  section parser would let `comparison.py` bucket diff lines by section.
