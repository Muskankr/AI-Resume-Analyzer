"""Binding an analysis task to whoever started it.

``/api/status/<task_id>/`` is ``AllowAny`` and returns the Celery task's whole
return value. For ``analyze_resume_task`` that value contains ``resume_text`` —
the full extracted document — so the task id was a bearer credential for
someone else's resume, and nothing in the code treated it as one. It is handed
to the browser, then put in a **URL path**, which means it also ends up in
access logs, proxy logs, ``Referer`` headers and browser history, and it stays
redeemable until Celery's result backend drops the row.

This module issues a separate, deliberate credential instead.

Why not just require authentication
-----------------------------------
That would close the anonymous hole and leave the cross-user one: ``upload_resume``
is ``AllowAny`` by design, so anonymous analyses are a supported flow, and a
signed-in user B could still redeem user A's id. Ownership has to be recorded,
not inferred from "is anybody logged in".

Why a signed token rather than a server-side record
---------------------------------------------------
A record needs somewhere to live. ``django.core.cache`` is the obvious place and
the wrong one here: the project has no ``CACHES`` configured, so it is
``LocMemCache`` — per process. Behind two gunicorn workers, roughly half of a
user's own polls would be refused. Sessions are no better for this: anonymous
uploads are cross-origin and the frontend does not send credentials, so there is
no cookie to key on.

``django.core.signing`` needs no shared state at all. The claim carries its own
payload and is verified against ``SECRET_KEY``, so every worker reaches the same
answer and there is nothing to expire, evict or replicate.

What the claim actually proves
------------------------------
Two things, and it is worth being precise about which:

* **For a signed-in user** — that the holder is *that user*. The claim names the
  user id and :func:`verify_claim` re-derives the caller's identity from the
  request, so a leaked claim is useless to anyone else.
* **For an anonymous upload** — only that the holder started *this* task. There
  is no identity to bind to. That is not a weakening: it is what the task id was
  already doing, except the claim is issued for the purpose, travels in a header
  rather than a URL path, and expires on a clock we choose.
"""

import logging

from django.conf import settings
from django.core import signing

logger = logging.getLogger(__name__)

#: Header the claim travels in.
#:
#: A header rather than a query parameter on purpose. Query strings are written
#: to access logs by default in nginx, Apache and most proxies, and are sent on
#: in ``Referer``; headers are not. Putting the replacement credential in the
#: same place as the leak would be pointless.
CLAIM_HEADER = "X-Analysis-Token"

#: The ``request.META`` key Django maps :data:`CLAIM_HEADER` to.
CLAIM_META_KEY = "HTTP_X_ANALYSIS_TOKEN"

#: Namespace for the signature, so a claim can never be confused with a token
#: this project signs for something else (password reset, unsubscribe).
CLAIM_SALT = "analyzer.task_claim"

#: How long a claim stays redeemable, in seconds.
#:
#: Matched to Celery's ``result_expires`` default of 24 hours: a claim that
#: outlives the result it unlocks is pointless, and one that expires first would
#: strand a user whose task is still there.
CLAIM_MAX_AGE = 24 * 60 * 60

#: Identity used for a task nobody was signed in for.
ANONYMOUS_OWNER = "anon"


def owner_of(request):
    """Return the identity string for whoever is making this request.

    ``"user:<id>"`` when signed in, :data:`ANONYMOUS_OWNER` otherwise. The
    prefix matters: without it a user whose id is the literal string ``anon``
    could not exist, and more usefully it makes the two cases impossible to
    confuse when reading a claim.
    """
    user = getattr(request, "user", None)
    if user is not None and user.is_authenticated:
        return f"user:{user.id}"
    return ANONYMOUS_OWNER


def issue_claim(task_id, request):
    """Return a signed claim binding ``task_id`` to this request's owner.

    Returned alongside the task id from ``upload_resume``. The task id is still
    what identifies the task — this only says who may ask about it.
    """
    return signing.dumps(
        {"t": str(task_id), "o": owner_of(request)},
        salt=CLAIM_SALT,
    )


def read_claim(request):
    """Pull the raw claim off the request, or ``None``.

    Falls back to a ``token`` query parameter, because a browser cannot set a
    header on a plain navigation and some HTTP clients make it awkward. That
    fallback re-opens the logging exposure the header avoids, so it is a
    convenience for callers that have no alternative, not the intended path —
    which is why it is second and why it is called out here.
    """
    header = request.META.get(CLAIM_META_KEY)
    if header:
        return header.strip()

    param = request.query_params.get("token") if hasattr(
        request, "query_params") else None
    return param.strip() if param else None


def verify_claim(task_id, request):
    """Return ``True`` when this request may read ``task_id``'s result.

    Every failure — missing, malformed, tampered with, expired, for a different
    task, or for a different user — is a single ``False``. The caller turns that
    into one 404, so nothing distinguishes "you got the id wrong" from "you got
    the id right and the claim wrong", which is the pair an attacker would use
    to confirm a task exists.
    """
    raw = read_claim(request)
    if not raw:
        return False

    try:
        payload = signing.loads(raw, salt=CLAIM_SALT, max_age=CLAIM_MAX_AGE)
    except signing.SignatureExpired:
        logger.info("Analysis claim expired for task %s", task_id)
        return False
    except signing.BadSignature:
        # Covers tampering and plain junk. Logged at info rather than warning:
        # a stale tab retrying after a SECRET_KEY rotation lands here too, and
        # it is not an attack.
        logger.info("Rejected an unverifiable analysis claim")
        return False

    if not isinstance(payload, dict):
        return False

    # The claim names one task. Without this check a claim for a task the caller
    # genuinely owns would unlock every other task id they cared to try.
    if payload.get("t") != str(task_id):
        return False

    return payload.get("o") == owner_of(request)


def claims_are_enforced():
    """Whether an unclaimed poll should be refused.

    ``ANALYSIS_CLAIM_REQUIRED`` exists so a deployment can roll the backend out
    ahead of the frontend that sends the header, and so anyone running an older
    client is not locked out mid-analysis. It defaults to **on** — a flag that
    defaults to the insecure setting is a flag nobody turns on.
    """
    return getattr(settings, "ANALYSIS_CLAIM_REQUIRED", True)
