"""Server-issued arithmetic CAPTCHA for signup and login.

The previous version had no server side at all. The browser generated its own
token the moment the user typed the right answer::

    const token = `CAP-VERIFIED-${now}-${randStr}`

and the backend accepted anything shaped like it::

    if token.startswith("CAP-VERIFIED-") and len(token) >= 20:
        return True

so ``CAP-VERIFIED-0000000000000000000`` passed, as did the two hardcoded test
strings that were live in production. The control did not stop a script; it
only stopped someone who had not looked.

The fix is to move the challenge to where it can be trusted. This module
generates the operands, keeps the expected answer inside a token signed with
``SECRET_KEY``, and checks the submitted answer against it. The client is never
asked whether it verified anything — it is only asked what the user typed.

Design notes:

* The token is signed, not encrypted. Nothing here is secret — the answer is
  two small numbers the user can already see. Signing is what stops the token
  being *forged*, which is the actual weakness.
* It carries the time it was issued, so a solved token cannot be stockpiled.
* It carries a random nonce, so a solved token can be burned after one use.
  Without that, one human solve could authorise unlimited signups inside the
  TTL, which is most of the way back to having no CAPTCHA.
* The salt namespaces the signature, so a token minted here cannot be replayed
  against the unsubscribe links in :mod:`analyzer.unsubscribe_tokens` or any
  other signed value in the project.

This is a low bar by design — arithmetic stops scripted abuse, not a determined
attacker with an OCR budget. It is the same bar the UI already promised; the
point of this module is that the bar now exists.
"""

import random
import secrets

from django.core import signing
from django.core.cache import cache

#: Namespaces the signature to this one purpose.
CAPTCHA_SALT = "analyzer.auth.captcha"

#: How long a challenge stays solvable. Long enough to type a password, short
#: enough that a batch of pre-solved tokens goes stale quickly.
CHALLENGE_MAX_AGE_SECONDS = 10 * 60

#: Cache key prefix for nonces that have already been spent.
_USED_NONCE_PREFIX = "captcha_used_nonce:"

#: Operand range. Kept to single digits so the question stays readable to
#: people using a screen reader or translating the page.
MIN_OPERAND = 1
MAX_OPERAND = 9


def issue_challenge():
    """Generate a new challenge.

    Returns ``(question, token)`` — the human-readable prompt and the signed
    token that has to come back with the answer.
    """
    first = random.randint(MIN_OPERAND, MAX_OPERAND)
    second = random.randint(MIN_OPERAND, MAX_OPERAND)

    payload = {
        "a": first + second,
        # Random per challenge, so a spent token can be recognised and refused.
        "n": secrets.token_urlsafe(9),
    }

    return f"{first} + {second}", signing.dumps(payload, salt=CAPTCHA_SALT)


def _parse_answer(raw):
    """Return the submitted answer as an int, or ``None`` if it is not one."""
    if raw is None:
        return None
    if isinstance(raw, bool):
        # bool is an int subclass; True would otherwise compare equal to 1.
        return None
    if isinstance(raw, int):
        return raw
    if isinstance(raw, str):
        try:
            return int(raw.strip())
        except (TypeError, ValueError):
            return None
    return None


def verify_challenge(token, answer, consume=True):
    """Return ``True`` only if ``answer`` solves the challenge in ``token``.

    Every failure mode — missing, malformed, tampered with, expired, wrong
    answer, or already used — returns ``False``. The caller gets one message
    for all of them, so this cannot be probed to learn which part was wrong.

    ``consume`` is there for callers that want to check without spending the
    token; it defaults to spending it, because a token that survives being
    used is a token that can be reused.
    """
    if not token or not isinstance(token, str):
        return False

    submitted = _parse_answer(answer)
    if submitted is None:
        return False

    try:
        payload = signing.loads(
            token, salt=CAPTCHA_SALT, max_age=CHALLENGE_MAX_AGE_SECONDS
        )
    except signing.BadSignature:
        # SignatureExpired is a subclass, so this covers expiry too.
        return False

    if not isinstance(payload, dict):
        return False

    expected = payload.get("a")
    nonce = payload.get("n")

    if not isinstance(expected, int) or not isinstance(nonce, str) or not nonce:
        return False

    if submitted != expected:
        return False

    cache_key = f"{_USED_NONCE_PREFIX}{nonce}"

    if cache.get(cache_key):
        return False

    if consume:
        # Held only as long as the token could otherwise still be valid; after
        # that the signature's own max_age refuses it anyway.
        cache.set(cache_key, True, CHALLENGE_MAX_AGE_SECONDS)

    return True


def verify_from_request_data(data, consume=True):
    """Pull the token and answer out of a request body and verify them.

    Accepts the field names the client sends. Kept here so ``views.py`` and
    ``serializers.py`` cannot drift apart on what the fields are called.
    """
    if not hasattr(data, "get"):
        return False

    token = data.get("captcha_token") or data.get("captcha")
    answer = data.get("captcha_answer")

    return verify_challenge(token, answer, consume=consume)
