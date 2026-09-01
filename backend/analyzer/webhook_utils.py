"""Delivery of outbound webhooks.

Three things about this module are deliberate and worth reading before changing
it.

**The destination is re-checked at send time, not just at registration.**
A webhook URL is attacker-chosen input aimed at our HTTP client, which is the
same shape of problem as the resume-import SSRF closed in #583. Validating only
when the row is written is not enough: a hostname that resolved to a public
address on Tuesday can resolve to ``127.0.0.1`` on Wednesday, and the row is
long-lived. :func:`deliver` therefore runs :func:`~analyzer.url_safety.assert_url_is_safe`
immediately before the request.

**Redirects are not followed.** ``requests`` would happily follow a ``302`` to
an address the validation just rejected, which would make the check ornamental.
A receiver that wants us somewhere else can register that URL.

**The payload is signed and it is a summary, not the whole analysis.**
The old code posted the complete ``analyze_resume`` result, ``resume_text``
included, to whatever URL was on file. A webhook is a notification: it says
what happened and gives an id to fetch the rest with, so a misconfigured
endpoint cannot become a copy of somebody's resume. What is sent is signed with
the webhook's own secret so a receiver can verify it came from us.
"""

import hashlib
import hmac
import json
import logging

import requests

from django.utils import timezone

from .models import Webhook
from .url_safety import UnsafeURLError, assert_url_is_safe

logger = logging.getLogger(__name__)

#: How long a single delivery attempt may take. Retries are the Celery task's
#: job, so this only has to bound one request.
DELIVERY_TIMEOUT_SECONDS = 10

#: Cap on the response we read back. We do not use the body for anything, and a
#: receiver that streams gigabytes should not be able to hold a worker open.
MAX_RESPONSE_BYTES = 8192

SIGNATURE_HEADER = "X-Resume-Signature"
TIMESTAMP_HEADER = "X-Resume-Timestamp"
EVENT_HEADER = "X-Resume-Event"
DELIVERY_HEADER = "X-Resume-Delivery"


def sign_payload(secret: str, timestamp: str, body: bytes) -> str:
    """Return the signature for one delivery.

    The timestamp is inside the signed material, not merely alongside it. If it
    were only a header, an attacker who captured a delivery could replay it
    forever with a fresh timestamp; signing it lets a receiver reject anything
    older than it is willing to accept and know the value was not altered.
    """
    message = timestamp.encode("utf-8") + b"." + body
    digest = hmac.new(
        secret.encode("utf-8"), message, hashlib.sha256
    ).hexdigest()
    return f"sha256={digest}"


def build_payload(event: str, data: dict) -> dict:
    """Wrap event data in the envelope receivers see."""
    return {
        "event": event,
        "sent_at": timezone.now().isoformat(),
        "data": data,
    }


def summarize_analysis(analysis_result: dict) -> dict:
    """Reduce an ``analyze_resume`` result to what a notification needs.

    Everything omitted here is available from ``/api/history/<id>/`` to a caller
    holding the user's own credentials. Notably absent: ``resume_text``,
    ``cover_letter_text`` and ``job_description``. Those are the parts a user
    would be most alarmed to find had been posted to a URL they set up once and
    forgot about.
    """
    if not isinstance(analysis_result, dict):
        return {}

    return {
        "analysis_id": analysis_result.get("id"),
        "score": analysis_result.get("score"),
        "target_role": analysis_result.get("target_role"),
        "skills_found": analysis_result.get("skills_found", []),
        "matched_skills": analysis_result.get("matched_skills", []),
        "missing_skills": analysis_result.get("missing_skills", []),
        "suggestion_count": len(analysis_result.get("suggestions", []) or []),
        "readability_label": analysis_result.get("readability_label"),
    }


def deliver(webhook: Webhook, event: str, data: dict) -> bool:
    """Send one event to one webhook, recording the outcome.

    Returns ``True`` when the receiver accepted it. Raises nothing: the caller
    is a background task, and a delivery failure is a fact to record rather than
    an error to propagate. The one exception is that the Celery task inspects
    the return value to decide whether to retry.
    """
    # Re-validated here rather than trusting the stored value — see the module
    # docstring. A hostname that has been repointed at an internal address
    # since it was registered is caught on this line.
    try:
        assert_url_is_safe(webhook.url)
    except UnsafeURLError as exc:
        logger.warning(
            "Refusing to deliver webhook %s: %s", webhook.pk, exc.reason
        )
        webhook.record_failure(f"Destination is not allowed: {exc.reason}")
        return False

    body = json.dumps(build_payload(event, data),
                      separators=(",", ":")).encode("utf-8")
    timestamp = str(int(timezone.now().timestamp()))

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "AI-Resume-Analyzer-Webhook/1.0",
        EVENT_HEADER: event,
        TIMESTAMP_HEADER: timestamp,
        DELIVERY_HEADER: str(webhook.pk),
        # Signed over the exact bytes on the wire, which is why `body` is built
        # once and passed as `data=` rather than re-serialized by `json=`.
        SIGNATURE_HEADER: sign_payload(webhook.secret, timestamp, body),
    }

    try:
        response = requests.post(
            webhook.url,
            data=body,
            headers=headers,
            timeout=DELIVERY_TIMEOUT_SECONDS,
            # See the module docstring: following a redirect would let the
            # receiver send us to an address the check above just rejected.
            allow_redirects=False,
            stream=True,
        )
        try:
            response.raw.read(MAX_RESPONSE_BYTES, decode_content=True)
        finally:
            response.close()
    except requests.RequestException as exc:
        logger.info("Webhook %s failed: %s", webhook.pk, exc)
        webhook.record_failure(exc)
        return False

    if 200 <= response.status_code < 300:
        webhook.record_success(response.status_code)
        return True

    webhook.record_failure(
        f"Receiver returned HTTP {response.status_code}",
        status_code=response.status_code,
    )
    return False


def trigger_webhooks_for_user(user, analysis_result):
    """Queue an ``resume_analysis.completed`` delivery for each active webhook.

    This used to start a raw ``threading.Thread`` per webhook, from inside a
    Celery worker, with no bound on how many and no record of what happened.
    Deliveries are now individual tasks, so they retry on their own schedule and
    a slow receiver cannot hold up the analysis that triggered it.
    """
    if not user:
        return 0

    # Imported here rather than at module scope: tasks.py imports this module,
    # so a top-level import would be circular.
    from .tasks import deliver_webhook_task

    payload = summarize_analysis(analysis_result)
    webhook_ids = list(
        Webhook.objects.filter(
            user=user, is_active=True).values_list("id", flat=True)
    )

    for webhook_id in webhook_ids:
        deliver_webhook_task.delay(
            webhook_id=webhook_id,
            event=Webhook.EVENT_ANALYSIS_COMPLETED,
            data=payload,
        )

    return len(webhook_ids)
