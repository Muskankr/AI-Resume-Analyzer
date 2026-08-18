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
Found 222 test(s).
...
Ran 222 tests in 6.2s

OK (expected failures=2)
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

### Two tests skip themselves until another fix lands

You will see `skipped=2` on a clean run. Both exercise a code path that is
genuinely broken, with an issue open against it:

| Test | Waiting on |
|---|---|
| `ProfileAvatarTests.test_upload_and_delete_avatar` | #632 — `/api/profile/avatar/` has a view but no route |
| `UnsubscribeTokenTests.test_returns_none_when_the_user_no_longer_exists` | #631 — the `Webhook` model has no migration, so `User.delete()` cascades into a table that does not exist |

They are guarded with `require_route()` / `require_table()`, which check the
precondition at runtime, rather than with a static `@skip` or
`@expectedFailure`.

The reasoning is worth knowing, because the obvious choices are both wrong
here. `@skip` stays silent forever — once the bug is fixed nothing tells you
the test could be running again. `@expectedFailure` has the opposite problem in
the right direction: unittest reports an expected failure that starts passing
as an *unexpected success* and `wasSuccessful()` returns false, so the build
goes red and demands the marker be deleted. That is the correct signal when one
person owns both changes, but these fixes are in separate pull requests that
can merge in either order, and a red build handed to whoever merges second is
not a good way to communicate "please delete this line".

Checking the precondition avoids the dilemma entirely: the condition *is* the
fix, so the test starts running by itself the moment the route exists or the
table appears, in any merge order, with nothing left behind to remember.

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

This runs in CI, so a model edit without a migration fails the build.

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
