"""
AI-Driven Resume Gap Explanation and Narrative Builder.

Identifies employment gaps from resume timeline and generates professional,
positive narrative explanations for various gap reasons.
"""

import re
from datetime import datetime
from string import Formatter
from typing import List, Dict, Any, Optional

MONTH_MAP = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}

# A break shorter than this is ordinary notice-period/handover slack, not
# something a candidate needs a story for.
GAP_THRESHOLD_MONTHS = 3

# Every template is rendered with the same key set (see NARRATIVE_FIELDS), so
# any template may use any placeholder. Previously "job_market" referenced
# {certifications}, which was never supplied, and str.format raised KeyError on
# every gap that reached it.
NARRATIVE_TEMPLATES = {
    "upskilling": [
        "During this period I focused on deliberate upskilling, completing certifications in {skills} and staying hands-on through {activities}, all of which I bring directly to the {role_after} role.",
        "I took a strategic career pause to concentrate on professional development, acquiring new competencies in {skills} that map onto what a {target_role} is expected to do on day one.",
    ],
    "caregiving": [
        "I stepped away from full-time work to provide essential caregiving for a family member. It sharpened my crisis management, prioritisation and organisational skills, and I kept current with {skills} so that I could return to a {role_after} role without a ramp-up period.",
        "This timeframe was dedicated to family caregiving responsibilities. I maintained my industry knowledge through {activities} and am ready to bring that refined judgement to the {role_after} role.",
    ],
    "freelance": [
        "I operated as an independent consultant through this period, delivering {deliverables} for a range of clients. It broadened my depth in {skills} and put me across the whole project lifecycle rather than one slice of it.",
        "This period reflects freelance work, during which I {achievements}. It demanded self-directed planning and client communication, both of which carry straight into the {role_after} role.",
    ],
    "health": [
        "I took a necessary medical leave to address a health matter that is now fully resolved. I used part of that time to {activities}, and I am returning with full capacity for a {role_after} role.",
        "This gap was a temporary health situation, since completely resolved. I stayed engaged with the field through {activities} and with {skills} in particular, and can contribute immediately.",
    ],
    "job_market": [
        "I have been deliberately selective about my next move, holding out for a {role_after} role that fits my longer-term direction in {target_role}, and keeping my skills sharp through {activities}.",
        "Broader market conditions lengthened my search, so I used the time to deepen my expertise in {skills}, rebuild my portfolio and complete {certifications}.",
    ],
}

# Defaults for anything the caller does not supply. Keys are the union of every
# placeholder used across NARRATIVE_TEMPLATES; keeping them in one place is what
# makes "add a template" a safe change.
NARRATIVE_FIELDS = {
    "skills": "new technologies",
    "target_role": "this field",
    "activities": "independent study and industry reading",
    "deliverables": "scalable software solutions",
    "achievements": "streamlined client workflows",
    "certifications": "additional professional certifications",
    "role_after": "next",
    "role_before": "previous",
}


class _DefaultingFormatter(Formatter):
    """``str.format`` that substitutes a placeholder name instead of raising.

    A template is content, and content gets edited by people who are not
    looking at the call site. Losing the whole response to a ``KeyError``
    because someone added ``{mentors}`` to a sentence is not a reasonable
    failure mode for a text generator.
    """

    def get_value(self, key, args, kwargs):
        if isinstance(key, str):
            return kwargs.get(key, NARRATIVE_FIELDS.get(key, ""))
        return super().get_value(key, args, kwargs)


_FORMATTER = _DefaultingFormatter()


def parse_date(date_str: str) -> Optional[datetime]:
    """Parses various date string formats into a datetime object."""
    if not date_str:
        return None

    date_str = date_str.strip().lower()
    if date_str in ["present", "now", "current"]:
        return datetime.now()

    parts = re.split(r"[\s\-/]+", date_str)
    if len(parts) >= 2:
        month_str, year_str = parts[0], parts[1]
        month = MONTH_MAP.get(month_str[:3])
        if month and year_str.isdigit():
            return datetime(year=int(year_str), month=month, day=1)
        # Numeric "2021-03" / "2021/03" order, as well as "03-2021".
        if month_str.isdigit() and year_str.isdigit():
            a, b = int(month_str), int(year_str)
            if 1 <= b <= 12 and a > 12:
                return datetime(year=a, month=b, day=1)
            if 1 <= a <= 12 and b > 12:
                return datetime(year=b, month=a, day=1)
    elif len(parts) == 1 and parts[0].isdigit():
        return datetime(year=int(parts[0]), month=1, day=1)

    return None


def months_between(earlier: datetime, later: datetime) -> int:
    """Whole months from ``earlier`` to ``later``. Negative if they overlap."""
    return (later.year - earlier.year) * 12 + (later.month - earlier.month)


def detect_gaps(timeline_data: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    """Detects employment gaps longer than ``GAP_THRESHOLD_MONTHS`` between roles.

    A gap is the stretch between the end of the earlier role and the start of
    the one that follows it. The previous implementation measured the later
    role's *end* back to the earlier role's *start*, which is the span covering
    both jobs rather than the space between them: it reported 79 months for a
    13-month gap, grew by a month every month whenever the later role was still
    "Present", and reported a gap for back-to-back roles that had none.
    """
    gaps: List[Dict[str, Any]] = []
    if not timeline_data or len(timeline_data) < 2:
        return gaps

    # Most recent first.
    sorted_timeline = sorted(
        timeline_data,
        key=lambda x: parse_date(x.get("start_date", "")) or datetime.min,
        reverse=True,
    )

    for i in range(len(sorted_timeline) - 1):
        later_role = sorted_timeline[i]
        earlier_role = sorted_timeline[i + 1]

        # The gap runs from when the earlier role ended to when the later one
        # began -- not the other two endpoints.
        gap_start = parse_date(earlier_role.get("end_date", "")) or None
        gap_end = parse_date(later_role.get("start_date", "")) or None

        if not gap_start or not gap_end:
            continue

        duration = months_between(gap_start, gap_end)

        # <= 0 means the roles overlap (concurrent or contiguous work), which is
        # not a gap at all.
        if duration <= GAP_THRESHOLD_MONTHS:
            continue

        gaps.append(
            {
                "role_before": earlier_role.get("role", "Previous Role"),
                "role_after": later_role.get("role", "Current Role"),
                "start_date": gap_start.strftime("%b %Y"),
                "end_date": gap_end.strftime("%b %Y"),
                "duration_months": duration,
            }
        )

    return gaps


def generate_narratives(
    gaps: List[Dict[str, Any]], context: Dict[str, str]
) -> List[Dict[str, Any]]:
    """Generates narrative options for each detected gap."""
    results = []
    context = context or {}

    for gap in gaps:
        # Per-gap, so the narrative can name the role the candidate returned to
        # instead of being generic. Caller-supplied context wins; the gap
        # supplies role_before/role_after; NARRATIVE_FIELDS backs both.
        fields = dict(NARRATIVE_FIELDS)
        fields["role_before"] = gap.get("role_before") or fields["role_before"]
        fields["role_after"] = gap.get("role_after") or fields["role_after"]
        for key, value in context.items():
            if value:
                fields[key] = value

        narratives = []
        for category, templates in NARRATIVE_TEMPLATES.items():
            for template in templates[:2]:  # Take top 2 templates per category
                narratives.append(
                    {
                        "category": category.replace("_", " ").title(),
                        "text": _FORMATTER.vformat(template, (), fields),
                    }
                )

        results.append({**gap, "narratives": narratives})

    return results
