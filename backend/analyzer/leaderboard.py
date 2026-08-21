"""Aggregating skill counts across analyses without loading them all.

``skills_leaderboard_view`` did this:

.. code-block:: python

    data_list = list(analyses.values_list("matched_skills", "missing_skills"))
    total_count = len(data_list)
    for matched, missing in data_list:
        ...

``matched_skills`` and ``missing_skills`` are ``JSONField``s. ``list(...)``
forces the whole queryset, so the process held every skill list from every
analysis ever run, all of it decoded from JSON, in order to build two
``Counter``s and then discard the lists. Memory grew linearly with the table on
an endpoint that is ``AllowAny`` and unthrottled.

The loop only ever needs one row at a time. That is the whole fix, and it is
:func:`aggregate_skill_counts` below.

The rest of this module is about the *other* three problems in the same forty
lines, which are easier to see once they are named:

* the cache key was built from unvalidated user input, so anyone could mint
  entries — see :func:`normalise_track` and :func:`cache_key_for`;
* the denominator counted analyses rather than people, so one user re-running
  the same resume eight times moved the percentages — see
  :func:`aggregate_skill_counts`'s ``per_user`` argument;
* nothing bounded the requested size — see :func:`clamp_limit`.
"""

import hashlib
import re
from collections import Counter

#: How many rows the database sends per round trip while streaming. Large
#: enough that the query is not chatty, small enough that a chunk of JSON
#: columns is a bounded amount of memory.
ITERATOR_CHUNK_SIZE = 500

#: Default and maximum number of skills reported per list.
DEFAULT_LIMIT = 10
MAX_LIMIT = 50

#: Cache lifetime, unchanged from the value that was inline in the view.
CACHE_TIMEOUT_SECONDS = 300

#: Track name used for every unrecognised query. Everything that is not a known
#: role collapses onto this one key, so a caller cannot mint an entry per
#: request just by varying the string.
UNKNOWN_TRACK = "__unknown__"

#: Characters a cache key may contain. Memcached rejects keys with spaces or
#: control characters outright, and Django's LocMemCache warns about them, so a
#: key assembled from a raw query parameter was not reliably valid to begin
#: with.
_KEY_SAFE_RE = re.compile(r"[^a-z0-9_-]")


def normalise_track(raw, known_tracks):
    """Return a canonical track name, or ``""`` for "everything".

    ``known_tracks`` is the set of role names that actually exist. Matching is
    case- and whitespace-insensitive, because ``?track=frontend developer`` and
    ``?track=Frontend%20Developer`` are the same request and used to be two
    cache entries.

    Anything unrecognised returns :data:`UNKNOWN_TRACK` rather than being passed
    through. That is what stops an unbounded key space: a query for a role that
    does not exist is answered from one shared entry, and the answer is the same
    empty leaderboard whichever nonsense was asked for.
    """
    if not isinstance(raw, str):
        return ""

    cleaned = raw.strip()
    if not cleaned:
        return ""

    folded = {name.strip().lower(): name for name in known_tracks}
    return folded.get(cleaned.lower(), UNKNOWN_TRACK)


def cache_key_for(track, limit, per_user):
    """Build a cache key that is valid on every backend.

    The old key interpolated the raw query parameter:
    ``f"skills_leaderboard_{track}"``. A track containing a space produced a key
    memcached refuses; 5,000 random characters produced a key that would never
    be read again. Here the track has already been through
    :func:`normalise_track`, and anything still outside the safe set is hashed
    rather than dropped — dropping would map two different tracks onto one key.
    """
    slug = _KEY_SAFE_RE.sub("_", track.lower()) if track else "all"

    if slug != (track.lower() if track else "all"):
        # Non-ASCII role names survive as a stable digest instead of collapsing
        # to a row of underscores.
        digest = hashlib.sha256(track.encode("utf-8")).hexdigest()[:12]
        slug = f"{slug[:24]}-{digest}"

    return f"skills_leaderboard:v2:{slug}:{limit}:{'user' if per_user else 'row'}"


def clamp_limit(raw, default=DEFAULT_LIMIT, maximum=MAX_LIMIT):
    """Return how many skills to report, held inside the allowed range.

    Junk falls back to ``default``. The ceiling matters for the cache as much as
    for the response: the limit is part of the key, so an unbounded limit is an
    unbounded number of entries.
    """
    if isinstance(raw, bool) or not isinstance(raw, int):
        try:
            value = int(str(raw).strip())
        except (TypeError, ValueError, AttributeError):
            return default
    else:
        value = raw

    if value < 1:
        return 1
    return min(value, maximum)


def aggregate_skill_counts(queryset, per_user=False, chunk_size=ITERATOR_CHUNK_SIZE):
    """Count matched and missing skills by streaming rows.

    Args:
        queryset: ``ResumeAnalysis`` rows to aggregate, already filtered.
        per_user: Count each skill at most once per user. The leaderboard's
            denominator used to be the number of *analyses*, so someone running
            eight versions of one resume contributed eight votes and shifted the
            percentages by how often individuals re-upload rather than by how
            common a skill is. With this on, the figures answer "what fraction
            of people have this skill", which is the question the page asks.
        chunk_size: Rows per database round trip.

    Returns:
        ``(matched, missing, total)`` — two ``Counter``s and the denominator
        (analyses, or distinct users when ``per_user`` is set).

    Memory is bounded by the number of *distinct skills*, not the number of
    rows. ``.iterator()`` streams with a server-side cursor where the backend
    supports one and never populates the queryset cache, which is the part that
    matters: without it, holding a reference to the queryset holds every row.

    ``per_user`` costs one ``set`` of ``(user_id, skill)`` pairs, which is
    bounded by users × skills rather than by analyses. That is a real cost and
    worth naming, but it does not grow with re-uploads, which is the thing that
    actually grows.
    """
    matched_counter = Counter()
    missing_counter = Counter()

    total = 0
    seen_users = set()
    counted_pairs = set() if per_user else None

    rows = queryset.values_list("user_id", "matched_skills", "missing_skills")

    for user_id, matched, missing in rows.iterator(chunk_size=chunk_size):
        total += 1
        seen_users.add(user_id)

        for skills, counter in ((matched, matched_counter), (missing, missing_counter)):
            # A JSONField holds whatever was written to it. Historical rows and
            # a partly-failed analysis can both leave a null or a dict here, and
            # `Counter.update` on a dict would count its *keys*.
            if not isinstance(skills, list):
                continue

            for skill in skills:
                if not isinstance(skill, str):
                    continue
                name = skill.strip().lower()
                if not name:
                    continue

                if counted_pairs is not None:
                    pair = (user_id, name, counter is matched_counter)
                    if pair in counted_pairs:
                        continue
                    counted_pairs.add(pair)

                counter[name] += 1

    denominator = len(seen_users) if per_user else total
    return matched_counter, missing_counter, denominator


def top_skills(counter, total, limit=DEFAULT_LIMIT):
    """Format the most common entries of ``counter`` for the API.

    ``percentage`` is guarded against a zero denominator, which is not a
    hypothetical: an empty database and a track nobody has analysed both
    produce one.
    """
    return [
        {
            "skill": skill.title(),
            "count": count,
            "percentage": round(count / total * 100) if total else 0,
        }
        for skill, count in counter.most_common(limit)
    ]
