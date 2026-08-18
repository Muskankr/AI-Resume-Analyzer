"""Reading free-text fields off a request without trusting their type.

``request.data.get("job_description", "")`` looks like it defends against a
missing field, and it does — but only against a *missing* one. ``dict.get``
returns the stored value whenever the key is present, so a JSON body of
``{"job_description": null}`` yields ``None``, and the very next operation is
``None[:2000]`` or ``None.strip()``. Both raise ``TypeError``.

That is not hypothetical. A client that fills a form object and posts it whole
sends ``null`` for every field the user left blank — which is the normal shape
of a JSON request, not a malformed one. In ``upload_resume`` the slice happens
above the ``try:``, so nothing catches it and the request 500s with a traceback
instead of returning a 400.

The other half of the problem is that none of these fields had a length. A
resume upload caps the file at 5 MB, but the ``job_description`` that rides
along with it could be any size, and ``/api/analyze-jd/`` would tokenise the
whole thing.

:func:`clean_text` handles both: anything that is not a string becomes ``""``,
and everything has an explicit ceiling at the point it is read.
"""

#: Ceilings for the fields these endpoints accept. Named rather than inline so
#: the limits are visible in one place and can be asserted in tests.
MAX_JOB_DESCRIPTION_LENGTH = 20_000
MAX_CONTACT_NAME_LENGTH = 120
MAX_CONTACT_EMAIL_LENGTH = 254  # RFC 5321 maximum for a forward path
MAX_CONTACT_SUBJECT_LENGTH = 200
MAX_CONTACT_MESSAGE_LENGTH = 5_000
MAX_INTERVIEW_QUESTION_LENGTH = 1_000
MAX_INTERVIEW_ANSWER_LENGTH = 10_000

#: What ``upload_resume`` and ``compare_uploads`` persist. Lower than
#: MAX_JOB_DESCRIPTION_LENGTH because it is what the column has always stored;
#: kept as its own name so raising one does not silently raise the other.
MAX_STORED_JOB_DESCRIPTION_LENGTH = 2_000


def clean_text(value, max_length=None, strip=True):
    """Return ``value`` as a trimmed, length-capped string.

    Anything that is not a string — ``None``, a number, a list, a dict — becomes
    ``""``. Coercing with ``str()`` instead would be worse: it would turn
    ``{"message": ["a", "b"]}`` into the literal text ``"['a', 'b']"`` and store
    that, which is harder to debug than an empty field.

    Args:
        value: Whatever came off ``request.data``.
        max_length: Truncate to this many characters. ``None`` for no limit.
        strip: Trim surrounding whitespace. On by default because every caller
            wants it; a field where leading whitespace is meaningful can turn
            it off.

    Returns:
        A ``str``, never ``None``.
    """
    if not isinstance(value, str):
        return ""

    text = value.strip() if strip else value

    if max_length is not None and len(text) > max_length:
        text = text[:max_length]
        # Truncating can leave trailing whitespace that the earlier strip had
        # nothing to do with.
        if strip:
            text = text.rstrip()

    return text


def is_probably_an_email(value):
    """Return ``True`` when ``value`` looks like an address worth replying to.

    Django's ``EmailValidator`` does the work. The point of checking at all is
    that ``/api/contact/`` required a non-empty ``email`` and never looked at
    it, so a support inbox filled with messages nobody could answer.

    Deliberately not a deliverability check — that needs sending mail, and this
    runs on an unauthenticated endpoint.
    """
    from django.core.exceptions import ValidationError
    from django.core.validators import EmailValidator

    if not isinstance(value, str) or not value.strip():
        return False

    try:
        EmailValidator()(value.strip())
    except ValidationError:
        return False

    return True
