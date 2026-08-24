# Share links

A share link publishes a **read-only summary** of one analysis at a public URL.
Anyone holding the link can open it; nobody needs an account.

Sharing is off until you turn it on, every link has an end date, and you can
revoke or rotate one at any time.

## What is behind the link

| Published | Not published |
| --- | --- |
| Score | The resume text |
| Target role and experience level | The cover letter, and its feedback |
| Skills found, matched, partial, missing | The original filename |
| Suggestions | The job description |
| When the analysis ran, and when the link expires | The analysis's private id |

The filename is on the right-hand column deliberately. Resumes are routinely
saved as `Firstname_Lastname_Resume.pdf`, so publishing it would name the owner
on a page whose whole point is that it does not.

Everything in the left-hand column is *derived from* the resume — skills are
extracted from it, and a suggestion can quote a phrase back — so the strings that
are published are also stripped of email addresses, phone numbers, profile URLs
and social handles before they go out. A removed span is replaced with `[removed]`
rather than deleted, so you can see that something was taken out.

## Turning it on

```http
POST /api/history/12/share/
Authorization: Bearer <access token>
Content-Type: application/json

{ "lifetime_days": 7 }
```

## Embeddable ATS score badge

Signed-in users can create or retrieve one stable badge URL:

```http
GET /api/badge/
Authorization: Bearer <access token>
```

The response contains an SVG URL and a ready-to-paste Markdown snippet:

```json
{
  "badge_id": "3e7c4b8f-5c41-4f20-9d2a-000000000000",
  "enabled": true,
  "badge_url": "https://resume.example.com/api/badge/3e7c4b8f-5c41-4f20-9d2a-000000000000/svg/",
  "markdown": "![ATS Score](https://resume.example.com/api/badge/3e7c4b8f-5c41-4f20-9d2a-000000000000/svg/)"
}
```

Embed the returned Markdown in a GitHub README, portfolio, or personal site.
The public SVG endpoint requires no authentication:

```http
GET /api/badge/<badge_id>/svg/
```

The badge does **not** store a copy of the score. Every SVG request resolves the
user's newest `ResumeAnalysis`, so the same badge URL automatically changes from,
for example, `72%` to `91%` after a newer resume analysis is completed. The SVG
response is explicitly marked non-cacheable so a refresh asks the server for the
current score.

Only the score is exposed by the badge. No resume text, filename, job description,
skills, email address, or other analysis data is included.

If the user has not completed an analysis yet, the badge displays `N/A`.
Unknown or disabled badge ids return `404`.

## Turning it on

```http
POST /api/history/12/share/
Authorization: Bearer <access token>
Content-Type: application/json

{ "lifetime_days": 7 }
```

```json
{
  "share_id": "2b0c9a1e-5f3d-4a7b-9c2e-8d1f0a6b4c33",
  "share_enabled": true,
  "share_created_at": "2026-08-20T09:00:00Z",
  "share_expires_at": "2026-08-27T09:00:00Z",
  "share_view_count": 0,
  "is_live": true,
  "share_url": "https://resume.example.com/shared/2b0c9a1e-5f3d-4a7b-9c2e-8d1f0a6b4c33"
}
```

`lifetime_days` is optional and defaults to **30**. It is held between 1 and
365 — there is no "never expires". If you ask for more than the maximum you get
the maximum, and the response says so in `lifetime_clamped_to_days` rather than
quietly disagreeing with the request it just accepted.

Posting again while a link is already live **extends** it from now. The id does
not change, so copies of the link that are already out keep working.

## Rotating

```http
POST /api/history/12/share/
{ "rotate": true }
```

Issues a fresh `share_id`. Every copy of the previous link stops working
immediately — this is the "I sent it to the wrong person" button. The view
counter resets, so the number keeps answering *"views of the link I sent"*
rather than an all-time total.

## Revoking

```http
DELETE /api/history/12/share/
```

The link stops working. The id is kept, so re-enabling later does not force you
to re-send a link you have already distributed; use `rotate` when you do want a
clean break.

## Reading the state

```http
GET /api/history/12/share/
```

Same body as above. `share_url` is `null` whenever the link is not live, so there
is never a dead URL to copy.

## The public endpoint

```http
GET /api/shared/<share_id>/
```

No authentication. Rate limited (`SHARED_RESULT_RATE`, default `60/hour`).

**Unknown, revoked and expired all answer `404`.** They are not distinguished:
a `403` for a revoked link would confirm the id was real, which is exactly what
someone walking the id space is trying to learn.

Expiry is evaluated when the link is read, not by a cleanup job, so a revocation
never depends on a cron having run.

## Existing links

Before this existed, every analysis was readable by id from the moment it was
created — there was no switch to turn off. Analyses that predate the change were
migrated to *enabled*, with the standard 30-day expiry measured from the
deployment, so links already in circulation keep working today and then fall
under the same rules as everything else.
