"""Policy for public share links, and what is safe to put behind one.

A shared analysis is the one place in this project where data leaves the
account that owns it, so the rules live in one module rather than being spread
across a serializer and a view.

Two things are decided here.

**What a link is allowed to carry.** The private record holds ``resume_text`` —
the whole extracted document, home address and phone number included. The
public view renders a score, a role and some skill lists. Those are very
different payloads, and the difference is not something a reviewer should have
to infer from a field tuple. :data:`PUBLIC_FIELDS` states it, and
:func:`redact_contact_details` scrubs the strings that *are* published, because
suggestions and skill lists are derived from the document and can echo parts of
it back.

**How long a link lives.** ``share_id`` has always been assigned at creation
time, which made every analysis reachable before its owner asked for that and
left no way to take it back. Sharing is now something a user turns on, with an
expiry, and can rotate or revoke.
"""

import re

#: Fields the public endpoint may return. Everything absent from this tuple is
#: absent on purpose:
#:
#: - ``resume_text`` / ``cover_letter_text`` — the document itself.
#: - ``cover_letter_feedback`` — quotes the letter back in its findings.
#: - ``file_name`` — resumes are routinely saved as
#:   ``Firstname_Lastname_Resume.pdf``, so the filename alone identifies the
#:   owner.
#: - ``id`` — the private primary key, which appears in authenticated URLs.
PUBLIC_FIELDS = (
    "share_id",
    "score",
    "target_role",
    "experience_level",
    "skills_found",
    "matched_skills",
    "partial_skills",
    "missing_skills",
    "suggestions",
    "created_at",
)

#: Default life of a new link. Long enough to send in an application and have it
#: opened at the other end, short enough that a forgotten link stops working.
DEFAULT_SHARE_LIFETIME_DAYS = 30

#: Ceiling on a caller-supplied lifetime. A link with no end is the state this
#: issue is about, so "never expires" is not offered.
MAX_SHARE_LIFETIME_DAYS = 365

#: Floor, so a lifetime of 0 or a negative number is rejected rather than
#: quietly producing a link that is already dead.
MIN_SHARE_LIFETIME_DAYS = 1

#: What a redacted span is replaced with. Kept visible rather than deleted: a
#: user reading their own shared page should be able to see *that* something was
#: removed, and a reviewer should be able to grep for it.
REDACTION_MARKER = "[removed]"

# --- Patterns -------------------------------------------------------------
#
# Redaction is regex work, so the patterns are gathered here with the reasoning
# for each one, and the ordering decision is stated beside `_REDACTORS` below.


_EMAIL_RE = re.compile(r"\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b")

#: International and North American shapes: an optional ``+`` and country code,
#: then groups of digits broken up by spaces, dots, dashes or brackets. The
#: pattern is deliberately loose and :func:`_looks_like_phone` does the
#: rejecting — a regex tight enough to exclude every year range on its own is
#: unreadable, and the interesting decisions belong somewhere they can be
#: explained and tested.
_PHONE_CANDIDATE_RE = re.compile(
    r"(?<![\w.])"
    r"(?P<intl>\+\d{1,3}[\s.-]?)?"
    r"(?:\(\d{2,4}\)[\s.-]?)?"
    r"\d{2,5}(?:[\s.-]\d{2,5}){1,4}"
    r"(?![\w.])"
)

#: A number in this range, written as four digits, is a year far more often than
#: it is part of a phone number.
_PLAUSIBLE_YEAR = range(1900, 2101)


def _looks_like_phone(match):
    """Decide whether a digit run the loose pattern caught is really a number.

    Resume text is full of digit groups that are not phone numbers, and the two
    that actually collide with the pattern are date ranges (``2019-2022``) and
    metric pairs (``12.5 / 30``). Both are common enough in *suggestions*, which
    is text this module publishes, that getting them wrong would put
    ``[removed]`` in the middle of a tip.

    The rules, in order:

    1. An explicit ``+`` country code or a bracketed area code settles it. No
       date range is written that way.
    2. Fewer than seven digits is not a dialable number anywhere.
    3. Exactly two four-digit groups, both plausible years, is a year range.
    """
    text = match.group(0)
    digits = re.sub(r"\D", "", text)

    if match.group("intl") or "(" in text:
        return True

    if len(digits) < 7:
        return False

    groups = re.findall(r"\d+", text)
    if len(groups) == 2 and all(len(g) == 4 for g in groups):
        if all(int(g) in _PLAUSIBLE_YEAR for g in groups):
            return False

    return True


def _redact_phones(text):
    """Replace phone-shaped runs, leaving anything :func:`_looks_like_phone` rejects."""
    return _PHONE_CANDIDATE_RE.sub(
        lambda m: REDACTION_MARKER if _looks_like_phone(m) else m.group(0),
        text,
    )

_URL_RE = re.compile(r"\bhttps?://\S+|\bwww\.[\w-]+(?:\.[\w-]+)+\S*", re.IGNORECASE)

#: ``linkedin.com/in/jane-doe`` without a scheme, and the same for the handful
#: of profile hosts that show up on nearly every resume.
_PROFILE_RE = re.compile(
    r"\b(?:linkedin\.com|github\.com|gitlab\.com|behance\.net|dribbble\.com)"
    r"/[\w./-]+",
    re.IGNORECASE,
)

#: ``@handle``. Bounded on the left so an email that survived the first pass is
#: not turned into a handle match.
_HANDLE_RE = re.compile(r"(?<![\w@.])@[A-Za-z][\w.]{2,29}\b")

#: Applied in order. Emails go first because an address contains a
#: dot-separated host the URL pattern would otherwise claim half of, and the
#: phone pass runs late so it never sees the digits inside a URL.
_REDACTORS = (_EMAIL_RE, _URL_RE, _PROFILE_RE, _HANDLE_RE)


def redact_contact_details(value):
    """Return ``value`` with contact details replaced by :data:`REDACTION_MARKER`.

    Anything that is not a string is returned untouched, so this can be mapped
    over a mixed structure without type checks at every call site.

    This is a second line of defence, not the first. The first is
    :data:`PUBLIC_FIELDS` — not publishing the document at all. This exists
    because the fields that *are* published are generated from the document:
    ``skills_found`` comes out of the resume text, and a suggestion string can
    quote a phrase back. A false positive here costs a redaction marker in a
    tip. A false negative costs a phone number.

    >>> redact_contact_details("Reach me at jane@example.com or +1 415 555 0134")
    'Reach me at [removed] or [removed]'
    >>> redact_contact_details("Improved throughput by 40% across 3 services")
    'Improved throughput by 40% across 3 services'
    """
    if not isinstance(value, str) or not value:
        return value

    redacted = value
    for pattern in _REDACTORS:
        redacted = pattern.sub(REDACTION_MARKER, redacted)
    return _redact_phones(redacted)


def redact_structure(value):
    """Apply :func:`redact_contact_details` through lists, tuples and dicts.

    ``partial_skills`` is a list of dicts and ``suggestions`` is a list of
    strings, so a single helper that walks whatever shape it is handed keeps the
    serializer from growing a branch per field.

    Dictionary *keys* are left alone. They are field names we chose, not user
    text, and rewriting one would change the shape of the response.
    """
    if isinstance(value, str):
        return redact_contact_details(value)
    if isinstance(value, list):
        return [redact_structure(item) for item in value]
    if isinstance(value, tuple):
        return tuple(redact_structure(item) for item in value)
    if isinstance(value, dict):
        return {key: redact_structure(item) for key, item in value.items()}
    return value


def clamp_lifetime_days(raw, default=DEFAULT_SHARE_LIFETIME_DAYS):
    """Return a lifetime in days from caller input, held inside the allowed range.

    Returns ``(days, was_clamped)``. The flag exists so the API can tell a
    caller that asked for 10 years that it got one, instead of silently
    disagreeing with the request it just acknowledged.

    Junk — ``None``, a string, a float, a bool — falls back to ``default``
    rather than erroring. This value only shortens a link's life; there is no
    security decision resting on rejecting a malformed one.
    """
    if isinstance(raw, bool) or not isinstance(raw, int):
        try:
            days = int(str(raw).strip())
        except (TypeError, ValueError, AttributeError):
            return default, False
    else:
        days = raw

    if days < MIN_SHARE_LIFETIME_DAYS:
        return MIN_SHARE_LIFETIME_DAYS, True
    if days > MAX_SHARE_LIFETIME_DAYS:
        return MAX_SHARE_LIFETIME_DAYS, True
    return days, False
