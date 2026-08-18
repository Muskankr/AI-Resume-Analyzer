# Webhooks

A webhook is an HTTP endpoint you register with your account. When one of your
resume analyses finishes, we POST a signed JSON notification to it.

## Registering one

```http
POST /api/webhooks/
Authorization: Bearer <access token>
Content-Type: application/json

{ "url": "https://your-app.example.com/hooks/resume", "description": "staging collector" }
```

```json
{
  "id": 3,
  "url": "https://your-app.example.com/hooks/resume",
  "description": "staging collector",
  "is_active": true,
  "created_at": "2026-08-16T12:00:00Z",
  "status": { "last_delivery_at": null, "last_status_code": null, "last_error": "", "consecutive_failures": 0 },
  "secret": "9f2c…"
}
```

**`secret` appears in this response and nowhere else.** It is not on
`GET /api/webhooks/` or `GET /api/webhooks/<id>/`. Store it when you create the
webhook; if you lose it, delete the webhook and register it again.

| Method | Path | Does |
|---|---|---|
| `GET` | `/api/webhooks/` | List your webhooks |
| `POST` | `/api/webhooks/` | Register one (returns the secret) |
| `GET` | `/api/webhooks/<id>/` | Read one, including delivery status |
| `PATCH` | `/api/webhooks/<id>/` | Change `url`, `description` or `is_active` |
| `DELETE` | `/api/webhooks/<id>/` | Remove one |
| `POST` | `/api/webhooks/<id>/test/` | Send a `ping` now and report the result |

Ten webhooks per account.

## Which URLs are accepted

A webhook URL is an address you get to point our HTTP client at, so it is
checked with the same rules as resume-import links:

- `http` or `https` only,
- port 80 or 443 only,
- the host must resolve to a public address — loopback, private, link-local,
  multicast and reserved ranges are all refused, including via IPv6 forms such
  as `::ffff:127.0.0.1`.

`http://169.254.169.254/`, `http://127.0.0.1:6379/` and `file:///etc/passwd`
are all rejected at registration with a 400.

The same check runs again immediately before every delivery, because DNS can
change under a hostname that was fine when you registered it. A delivery
refused this way is recorded as a failure on the webhook rather than sent.

Redirects are not followed. If we followed a `302`, a receiver could send us to
an address the check just refused, which would make the check decorative. Point
the webhook at the final URL.

## The delivery

```http
POST /hooks/resume HTTP/1.1
Content-Type: application/json
User-Agent: AI-Resume-Analyzer-Webhook/1.0
X-Resume-Event: resume_analysis.completed
X-Resume-Timestamp: 1786953600
X-Resume-Delivery: 3
X-Resume-Signature: sha256=8b1a…
```

```json
{
  "event": "resume_analysis.completed",
  "sent_at": "2026-08-16T12:00:00+00:00",
  "data": {
    "analysis_id": 128,
    "score": 81,
    "target_role": "Backend Developer",
    "skills_found": ["python", "django"],
    "matched_skills": ["python"],
    "missing_skills": ["docker"],
    "suggestion_count": 1,
    "readability_label": "moderate"
  }
}
```

### What is deliberately not in it

No `resume_text`, `cover_letter_text` or `job_description`. A webhook is a
notification, not a copy of the document — use `analysis_id` against
`GET /api/history/<id>/` with the user's own credentials when you need the full
record. An endpoint that was set up once and forgotten should not accumulate
people's resumes.

## Verifying the signature

Compute HMAC-SHA256 over `<X-Resume-Timestamp>` + `.` + **the raw request
body**, keyed with the webhook's secret.

Three things matter here:

1. **Use the raw bytes.** Parsing the JSON and re-serializing it will change
   the whitespace and the signature will not match.
2. **Compare in constant time.** `==` on a signature leaks information through
   how long it takes to fail.
3. **Reject old timestamps.** The timestamp is inside the signed material, so
   it cannot be altered — which is exactly what lets you refuse a replay. Five
   minutes is a reasonable window.

### Python

```python
import hashlib, hmac, time
from flask import Flask, request, abort

app = Flask(__name__)
SECRET = "9f2c…"          # from the POST /api/webhooks/ response
TOLERANCE_SECONDS = 300

@app.post("/hooks/resume")
def receive():
    timestamp = request.headers.get("X-Resume-Timestamp", "")
    signature = request.headers.get("X-Resume-Signature", "")

    if abs(time.time() - int(timestamp)) > TOLERANCE_SECONDS:
        abort(400, "stale delivery")

    expected = "sha256=" + hmac.new(
        SECRET.encode(),
        timestamp.encode() + b"." + request.get_data(),   # raw body
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        abort(401, "bad signature")

    payload = request.get_json()
    ...
    return "", 200
```

### Node

```js
const crypto = require('crypto')

function verify(req, secret) {
  const timestamp = req.get('X-Resume-Timestamp')
  const signature = req.get('X-Resume-Signature')

  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false

  const expected =
    'sha256=' +
    crypto
      .createHmac('sha256', secret)
      .update(timestamp + '.')
      .update(req.rawBody) // express.raw() or verify:(req,_,buf)=>{req.rawBody=buf}
      .digest('hex')

  const a = Buffer.from(expected)
  const b = Buffer.from(signature || '')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
```

## Retries and failure handling

Answer with any `2xx` and we consider it delivered. Anything else — an error
status, a timeout, a connection failure — counts as a failure and is retried up
to 3 times with backoff (roughly 30s, 60s, 120s). Each attempt has a 10-second
timeout.

Ten consecutive failures switches the webhook off. `is_active` goes to `false`
and no further events are queued for it. `status.last_error` says why. Turn it
back on once you have fixed the receiver:

```http
PATCH /api/webhooks/3/
{ "is_active": true }
```

which also resets the failure count — otherwise the next single failure would
disable it again.

Deliveries are **at-least-once**: a receiver that accepts a delivery but whose
response is lost will see it again on retry. Use `data.analysis_id` together
with `X-Resume-Event` to make your handler idempotent.
