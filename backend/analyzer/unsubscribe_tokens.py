"""Signed tokens for one-click digest unsubscribe links.

The weekly digest has to let people opt out from an email client, with no
session and no login. Before this module the link carried a plain email
address and the endpoint acted on whatever it was given, so anyone could
unsubscribe anyone.

A token here is the user's primary key, signed with the project ``SECRET_KEY``
via :mod:`django.core.signing`, and stamped with the time it was issued. It
proves the link came from an email we sent, without a database table to clean
up and without exposing the address in the URL.

Tokens are scoped by a salt, so a token minted here cannot be replayed against
password reset or any other signed value in the project.
"""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from urllib.parse import urlencode

#: Namespaces the signature so these tokens only work for unsubscribing.
UNSUBSCRIBE_SALT = "analyzer.digest.unsubscribe"

#: How long a link stays valid. Digests go out weekly and people read email
#: late, so this is generous — it is a convenience token, not a credential.
DEFAULT_MAX_AGE_DAYS = 90


def get_max_age_seconds() -> int:
    """Token lifetime in seconds, overridable with ``UNSUBSCRIBE_TOKEN_MAX_AGE_DAYS``."""
    days = getattr(settings, "UNSUBSCRIBE_TOKEN_MAX_AGE_DAYS", DEFAULT_MAX_AGE_DAYS)
    return int(days) * 24 * 60 * 60


def make_unsubscribe_token(user) -> str:
    """Return a signed, timestamped token identifying ``user``."""
    return signing.dumps({"uid": user.pk}, salt=UNSUBSCRIBE_SALT)


def read_unsubscribe_token(token: str, max_age: int = None):
    """Return the user a token belongs to, or ``None``.

    ``None`` covers every failure mode — malformed, tampered with, expired, or
    pointing at a user who has since deleted their account. Callers are not
    told which, so the endpoint cannot be used to probe for valid accounts.
    """
    if not token or not isinstance(token, str):
        return None

    try:
        payload = signing.loads(
            token,
            salt=UNSUBSCRIBE_SALT,
            max_age=get_max_age_seconds() if max_age is None else max_age,
        )
    except signing.BadSignature:
        # Covers SignatureExpired too — it is a BadSignature subclass.
        return None

    if not isinstance(payload, dict):
        return None

    user_id = payload.get("uid")
    if user_id is None:
        return None

    User = get_user_model()
    return User.objects.filter(pk=user_id).first()


def build_unsubscribe_url(user, frontend_url: str = None) -> str:
    """Build the unsubscribe link that goes into a digest email."""
    base = frontend_url or getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    query = urlencode({"token": make_unsubscribe_token(user)})
    return f"{base.rstrip('/')}/unsubscribe?{query}"
