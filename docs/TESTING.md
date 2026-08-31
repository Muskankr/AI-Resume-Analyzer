# Running the tests

Both suites run locally with no services attached — no Redis, no SMTP, no
Celery worker. Anything that would reach out is mocked or pointed at an
in-memory backend.

## Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

python manage.py test
```

Expect roughly:

```
Found 300+ test(s).
...
Ran 300+ tests in 30s

OK
```

A few things worth knowing before you read a confusing result.

### "NO TESTS RAN" means discovery broke, not that the suite is empty

`unittest` discovery walks directories and skips any that is not a regular
Python package. If `backend/analyzer/__init__.py` goes missing, Django still
imports the app happily — implicit namespace packages (PEP 420) — but the test
runner never opens a single module under it and reports:

```
Found 0 test(s).
NO TESTS RAN
```

with exit status 0. That is what happened to this project: 220 tests sat in the
tree unexecuted. CI now asserts the discovered count is at least 200 so the
same thing cannot pass silently again.

### Keep the migration graph mergeable

Parallel feature work can produce two migrations with the same numeric prefix.
That is valid until both branches are merged, but Django then has multiple
heads and cannot create a test database or migrate a fresh deployment. Join
the heads with an empty merge migration before release. The
`AnalyzerMigrationGraphTests` regression test ensures the analyzer app keeps a
single head.

### Selecting tests

```bash
python manage.py test analyzer.tests_scoring              # one module
python manage.py test analyzer.tests.ProfileAvatarTests   # one class
python manage.py test analyzer.tests.ProfileAvatarTests.test_login_returns_avatar_url
python manage.py test --verbosity 2                       # name every test
```

### Migration check

Model changes need a matching migration, and a missing one tends to surface far
away from its cause — `Webhook` had none, and the symptom was an unrelated
unsubscribe test failing on `User.delete()`. Check with:

```bash
python manage.py makemigrations --check --dry-run
```

This runs in CI, so a model edit without a migration or an unresolved migration
conflict fails the build.

## Frontend

```bash
cd frontend
npm ci
npm run test          # vitest, single run
npm run test:coverage
```

Expect `28 passed (28)` files, `141 passed (141)` tests.

### Writing component tests that touch the network

Two patterns cause most of the confusion:

**Analysis is asynchronous.** `POST /api/upload/` returns `{ task_id }`; the app
then polls `GET /api/status/<id>/` until `state` is `SUCCESS` or `FAILURE`.
Mocking the POST to resolve with a finished analysis leaves the poll loop
spinning until vitest times the test out. Mock both:

```ts
vi.mocked(axios.post).mockResolvedValue({ data: { task_id: 'task-123' } })
vi.mocked(axios.get).mockResolvedValue({
  data: { state: 'SUCCESS', result: ANALYSIS_RESULT },
})
```

**jsdom has no origin.** `fetch('/sample-resume.pdf')` throws
`Failed to parse URL` because there is no base to resolve a root-relative path
against, and `window.alert` is not implemented. Stub both in `beforeEach` and
call `vi.unstubAllGlobals()` afterwards — see `src/AppRoastMode.test.tsx`.

## CI

`.github/workflows/tests.yml` runs on every push to `main` and every pull
request:

- `manage.py check`
- `makemigrations --check --dry-run`
- `manage.py test`, plus the discovered-count floor
- `npm run test`

`npm run lint` and `npm run build` are not gated yet. Both currently fail on
`main` — 752 prettier violations, and `src/pages/Apidocs.tsx` imports
`swagger-ui-react` without type declarations — and fixing either means a
repo-wide reformat that would conflict with every open pull request. They are
worth their own change; adding them now would only mean a permanently red
build.

## Analysis status polling needs a claim

`/api/status/<task_id>/` refuses a poll that carries no `X-Analysis-Token`
header, so a script or an HTTP client that pokes the endpoint with a task id
copied from a log now gets a 404 rather than the analysis. That is the point
(#706), but it does surprise people debugging by hand.

Take the token from the upload response:

```bash
curl -s -F file=@resume.pdf -F role='Backend Developer' \
  http://localhost:8000/api/upload/
# {"task_id": "b3f1…", "analysis_token": "eyJ0Ijoi…"}

curl -H 'X-Analysis-Token: eyJ0Ijoi…' \
  http://localhost:8000/api/status/b3f1…/
```

A `?token=` query parameter works too, for clients that cannot set a header.
Prefer the header: query strings are written to access logs by default in nginx
and most proxies, which is the exposure the change exists to avoid.

To poke the endpoint freely in local development, set
`ANALYSIS_CLAIM_REQUIRED=false`. It defaults to on, and production should leave
it there.

## "Conflicting migrations detected" — the suite is not failing, it never ran

If `python manage.py test analyzer` prints something like:

```
Found 359 test(s).
Creating test database for alias 'default'...
CommandError: Conflicting migrations detected; multiple leaf nodes in the
migration graph: (0020_merge_20260824_0025, 0020_resumebadge in analyzer).
To fix them run 'python manage.py makemigrations --merge'
```

then nothing was executed. The count on the first line is discovery, not
results — Django found the tests, then failed while building the test database
and exited. `migrate`, `showmigrations` and `makemigrations --check` all fail
the same way, because they all build the migration graph first.

It happens when two branches each add a migration on top of the same parent and
both get merged. Neither knows about the other, so the app is left with two
tips and there is no single "latest" migration to plan towards.

Fix it with a merge migration:

```bash
cd backend
python manage.py makemigrations --merge analyzer
```

That writes an empty migration depending on both leaves. Commit it. It is a
real migration and belongs in the pull request that discovered the conflict —
do not resolve it by deleting or renumbering someone else's migration, which
breaks any database that has already applied it.

`analyzer/tests_migration_graph.py` asserts the graph has a single leaf, and CI
runs that module on its own before the rest of the suite. It is a
`SimpleTestCase`, so it needs no test database — which is the point, since
creating the test database is the step that fails when the graph is broken.

### Rebasing onto a new migration

If your branch adds a migration and `main` has since gained one with the same
number, rebase and renumber **your** migration rather than merging:

```bash
git fetch origin && git rebase origin/main
git mv backend/analyzer/migrations/0021_my_change.py \
       backend/analyzer/migrations/0022_my_change.py
# then edit its `dependencies` to point at the new tip on main
```

A merge migration is for conflicts that already reached `main`. For a branch
that has not merged yet, renumbering keeps the history linear.
