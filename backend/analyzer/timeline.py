"""Reading the employment timeline out of a resume.

Everything the analyzer produces today is about *what* a resume says — skills,
keyword coverage, readability, whether bullets carry numbers. Nothing looks at
*when*. A resume can score 90 here and still be filtered on its dates, because
recruiters read the dates before the bullets and ATS platforms parse them into
structured employment records.

This module finds date ranges in the extracted text, sorts them, and reports
what a person reading the timeline would notice: undated roles, gaps, overlaps,
reversed ranges, dates in the future, and inconsistent formats. It also derives
total experience as the *union* of the ranges, so two concurrent roles are not
counted twice, and compares that against the experience level the user selected.

Being conservative is the design
--------------------------------
The layout is gone by the time we see this text. ``pdfplumber`` gives a stream
of lines with no idea which line is a job title and which is a bullet, so this
cannot know that "Acme Corp" and "Jan 2020 – Mar 2022" belong together — only
that they are near each other.

So the rule throughout is: **report what is confident, say nothing where it is
not.** In particular, an undated entry is only ever flagged when the resume has
*some* dated entries to compare against. A resume we simply failed to parse must
produce silence, not a page of warnings — a false "you forgot your dates" on a
resume that has them is worse than missing a real one, because it sends the user
looking for a problem that does not exist.

The findings are deliberately **not** folded into the headline ``score``. That
number is persisted on ``ResumeAnalysis`` and read by the leaderboard, version
comparison and the weekly digest, so changing what it means would change every
historical row — the same reasoning ``scoring.compute_score_breakdown`` already
gives for staying out of it.
"""

import re
from dataclasses import asdict, dataclass, field
from datetime import date
from typing import Dict, List, Optional, Sequence, Tuple

#: Gap, in months, before it is worth mentioning. Under a quarter is a normal
#: notice period plus a job search and nobody asks about it.
GAP_THRESHOLD_MONTHS = 4

#: Overlap, in months, before two roles read as concurrent rather than as a
#: handover. A few weeks of overlap is what leaving one job for another looks
#: like when both are written to the month.
OVERLAP_THRESHOLD_MONTHS = 2

#: How far ahead a date may be before it is treated as a typo rather than a
#: planned start. Offers do get signed a couple of months out.
FUTURE_TOLERANCE_MONTHS = 3

#: Severity levels, in the order a UI should sort them.
SEVERITY_HIGH = "high"
SEVERITY_MEDIUM = "medium"
SEVERITY_LOW = "low"
SEVERITY_INFO = "info"

_SEVERITY_ORDER = {
    SEVERITY_HIGH: 0,
    SEVERITY_MEDIUM: 1,
    SEVERITY_LOW: 2,
    SEVERITY_INFO: 3,
}

MONTHS = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

#: Words that mean "still there". ``to date`` is included because it is common
#: and is otherwise parsed as a stray preposition.
PRESENT_WORDS = ("present", "current", "currently",
                 "now", "ongoing", "to date", "today")

#: Separators between the two ends of a range: hyphen, en dash, em dash,
#: "to", "until", "through". Written out rather than as a character class so the
#: word forms can carry their own spacing rules.
_SEPARATOR = r"(?:\s*(?:-{1,2}|–|—|~|to|until|through|till)\s*)"

#: Years we will accept. Below this is almost always a version number, a
#: quantity or a page reference rather than a date somebody worked.
MIN_YEAR = 1950
MAX_YEAR = 2100

#: Plausible year, written as four digits. Kept separate from `MIN_YEAR` so the
#: regex and the validation cannot drift apart.
_YEAR = r"(?:19\d{2}|20\d{2}|21\d{2})"

_MONTH_NAMES = "|".join(sorted(MONTHS, key=len, reverse=True))


def _endpoint(prefix):
    """Return an alternation matching one end of a range, with named groups.

    Built as an f-string rather than a ``.format()`` template because the
    patterns contain regex quantifiers like ``\\d{4}``, which ``str.format``
    reads as replacement fields.

    Ordered most specific first: ``2020-03`` has to be tried before the bare
    year, or the year alone matches and the month is left dangling.
    """
    iso = (
        rf"(?P<{prefix}iso_year>{_YEAR})[/.-]"
        rf"(?P<{prefix}iso_month>0?[1-9]|1[0-2])(?!\d)"
    )
    month_year = (
        rf"(?P<{prefix}month_name>{_MONTH_NAMES})\.?,?\s+"
        rf"(?P<{prefix}my_year>{_YEAR})"
    )
    numeric = (
        rf"(?P<{prefix}num_month>0?[1-9]|1[0-2])[/.-]"
        rf"(?P<{prefix}nm_year>{_YEAR})"
    )
    bare = rf"(?P<{prefix}bare_year>{_YEAR})"

    return "(?:" + "|".join((iso, month_year, numeric, bare)) + ")"


#: Longest first. Python's alternation takes the first branch that matches, so
#: an unsorted list lets "current" win over "currently" and "to date" over
#: "today". The trailing lookahead in RANGE_PATTERN currently rescues those by
#: forcing a backtrack, but relying on that is a trap for the next word added.
_PRESENT = (
    r"(?P<present>"
    + "|".join(sorted(PRESENT_WORDS, key=len, reverse=True))
    + r")"
)

RANGE_PATTERN = re.compile(
    r"(?<![\w/])"
    + _endpoint("start_")
    + _SEPARATOR
    + r"(?:" + _PRESENT + r"|" + _endpoint("end_") + r")"
    + r"(?![\w/])",
    re.IGNORECASE,
)

#: A line that names a job but carries no range. Only used once at least one
#: range has been found — see the module docstring.
ROLE_HINT_PATTERN = re.compile(
    r"\b(engineer|developer|analyst|manager|designer|consultant|scientist|"
    r"architect|administrator|specialist|coordinator|director|intern|"
    r"associate|lead|officer|technician)\b",
    re.IGNORECASE,
)

#: How each recognised format is named back to the user. The keys are what
#: :func:`_parse_endpoint` returns, so a new format cannot be added without
#: giving it a name here.
FORMAT_LABELS = {
    "month-name": "Jan 2020",
    "numeric": "01/2020",
    "iso": "2020-01",
    "year-only": "2020",
    "present": "Present",
}


@dataclass
class DateRange:
    """One parsed employment range.

    Attributes:
        start_year / start_month: ``start_month`` is ``None`` for a year-only
            date. Kept rather than defaulted to January, because "2020" and
            "Jan 2020" carry different amounts of information and the gap
            arithmetic has to know which it has.
        end_year / end_month: ``None`` on both when the range runs to today.
        is_current: The range ended in "Present" or similar.
        start_format / end_format: Keys into :data:`FORMAT_LABELS`.
        text: The matched substring, so a finding can quote the resume back.
        line: The full line it came from, for context in the UI.
        line_number: Index of that line in the extracted text. Used to decide
            whether a nearby heading is really undated — see
            :func:`_undated_role_lines`.
    """

    start_year: int
    start_month: Optional[int]
    end_year: Optional[int]
    end_month: Optional[int]
    is_current: bool
    start_format: str
    end_format: str
    text: str
    line: str = ""
    line_number: int = -1

    def start_index(self) -> int:
        """Months since year zero, for arithmetic. Unknown month reads as January."""
        return self.start_year * 12 + ((self.start_month or 1) - 1)

    def end_index(self, today: date) -> int:
        """Months since year zero for the end.

        A current role ends today. A year-only end reads as **December** of that
        year, not January: "2019 – 2021" describes work through 2021, and
        treating it as ending in January would invent an eleven-month gap.
        """
        if self.is_current or self.end_year is None:
            return today.year * 12 + (today.month - 1)
        if self.end_month is None:
            return self.end_year * 12 + 11
        return self.end_year * 12 + (self.end_month - 1)

    def months(self, today: date) -> int:
        """Length in months, inclusive of both endpoints, never negative."""
        return max(0, self.end_index(today) - self.start_index() + 1)

    def label(self) -> str:
        return self.text.strip()

    def as_dict(self) -> Dict:
        return asdict(self)


@dataclass
class Finding:
    """Something a reader would notice about the timeline.

    ``message`` is written for the person being scored and is meant to be
    rendered as-is, in the style of ``scoring.FactorScore.detail``.
    """

    code: str
    severity: str
    message: str
    #: Text from the resume the finding refers to, so a user can locate it.
    evidence: str = ""

    def as_dict(self) -> Dict:
        return asdict(self)


@dataclass
class Timeline:
    """The parsed timeline and everything derived from it."""

    ranges: List[DateRange] = field(default_factory=list)
    findings: List[Finding] = field(default_factory=list)
    #: Union of the ranges, so concurrent roles are not counted twice.
    total_months: int = 0
    #: ``total_months`` as years, to one decimal, for display.
    total_years: float = 0.0
    #: Largest gap found, in months. 0 when there is none.
    largest_gap_months: int = 0
    #: True when at least one range runs to "Present".
    has_current_role: bool = False
    #: Distinct date formats seen, as display labels.
    formats_seen: List[str] = field(default_factory=list)
    #: False when nothing parseable was found — the UI should say "we could not
    #: read your dates", not "your resume has no dates".
    parsed: bool = False

    def as_dict(self) -> Dict:
        return {
            "parsed": self.parsed,
            "ranges": [r.as_dict() for r in self.ranges],
            "findings": [f.as_dict() for f in self.findings],
            "total_months": self.total_months,
            "total_years": self.total_years,
            "largest_gap_months": self.largest_gap_months,
            "has_current_role": self.has_current_role,
            "formats_seen": list(self.formats_seen),
        }


def _parse_endpoint(match, prefix) -> Optional[Tuple[int, Optional[int], str]]:
    """Return ``(year, month_or_None, format_key)`` for one end of a range."""
    groups = match.groupdict()

    iso_year = groups.get(f"{prefix}iso_year")
    if iso_year:
        return int(iso_year), int(groups[f"{prefix}iso_month"]), "iso"

    month_name = groups.get(f"{prefix}month_name")
    if month_name:
        return int(groups[f"{prefix}my_year"]), MONTHS[month_name.lower()], "month-name"

    num_month = groups.get(f"{prefix}num_month")
    if num_month:
        return int(groups[f"{prefix}nm_year"]), int(num_month), "numeric"

    bare = groups.get(f"{prefix}bare_year")
    if bare:
        return int(bare), None, "year-only"

    return None


def extract_ranges(text: str) -> List[DateRange]:
    """Find every date range in ``text``, in the order they appear.

    Scanned line by line rather than over the whole document, so a range cannot
    be assembled from the end of one line and the start of the next — which
    happens constantly in two-column resumes flattened to text.
    """
    ranges = []

    for line_number, line in enumerate((text or "").splitlines()):
        stripped = line.strip()
        if not stripped:
            continue

        for match in RANGE_PATTERN.finditer(stripped):
            start = _parse_endpoint(match, "start_")
            if start is None:
                continue

            start_year, start_month, start_format = start
            if not MIN_YEAR <= start_year <= MAX_YEAR:
                continue

            if match.groupdict().get("present"):
                ranges.append(
                    DateRange(
                        start_year=start_year,
                        start_month=start_month,
                        end_year=None,
                        end_month=None,
                        is_current=True,
                        start_format=start_format,
                        end_format="present",
                        text=match.group(0),
                        line=stripped,
                        line_number=line_number,
                    )
                )
                continue

            end = _parse_endpoint(match, "end_")
            if end is None:
                continue

            end_year, end_month, end_format = end
            if not MIN_YEAR <= end_year <= MAX_YEAR:
                continue

            ranges.append(
                DateRange(
                    start_year=start_year,
                    start_month=start_month,
                    end_year=end_year,
                    end_month=end_month,
                    is_current=False,
                    start_format=start_format,
                    end_format=end_format,
                    text=match.group(0),
                    line=stripped,
                    line_number=line_number,
                )
            )

    return ranges


def _shares_only_a_boundary_year(earlier: DateRange, later: DateRange) -> bool:
    """Do two ranges meet at a year whose precision hides where in it they met?

    Only true when *both* endpoints at the join are year-only and name the same
    year. In that case the twelve months the arithmetic produces are an artefact
    of the two conventions in :meth:`DateRange.end_index` and
    :meth:`DateRange.start_index`, not something the resume claimed.

    Deliberately narrow. A mixed pair — "Jan 2018 - Dec 2021" followed by
    "2021 - 2023" — really does overlap by somewhere between one and twelve
    months, and that is worth saying even though the exact figure is unknown.
    Widening this rule to cover that case would suppress a real signal.
    """
    return (
        not earlier.is_current
        and earlier.end_format == "year-only"
        and later.start_format == "year-only"
        and earlier.end_year is not None
        and earlier.end_year == later.start_year
    )


def _describe_months(months: int) -> str:
    """Render a month count the way a person would say it."""
    if months < 12:
        return f"{months} month{'s' if months != 1 else ''}"

    years, remainder = divmod(months, 12)
    if remainder == 0:
        return f"{years} year{'s' if years != 1 else ''}"
    return f"{years} year{'s' if years != 1 else ''} {remainder} month{'s' if remainder != 1 else ''}"


def merged_months(ranges: Sequence[DateRange], today: date) -> int:
    """Total months covered by ``ranges``, counting overlaps once.

    A promotion written as two entries, or a contract held alongside a staff
    job, would otherwise inflate total experience — which is the number this
    module compares against the selected seniority, so double-counting there
    would produce exactly the wrong advice.
    """
    if not ranges:
        return 0

    spans = sorted(
        (r.start_index(), r.end_index(today)) for r in ranges if r.end_index(today) >= r.start_index()
    )
    if not spans:
        return 0

    total = 0
    current_start, current_end = spans[0]

    for start, end in spans[1:]:
        if start <= current_end + 1:
            current_end = max(current_end, end)
        else:
            total += current_end - current_start + 1
            current_start, current_end = start, end

    total += current_end - current_start + 1
    return total


#: How far *after* a heading a date range may sit and still belong to it. Two,
#: because the common layouts are ``Title / Dates`` and
#: ``Title / Company / Dates``.
DATE_LINES_AFTER = 2

#: How far *before*. Only one: a right-aligned date column flattens to the line
#: above its heading, but nothing puts the dates two lines early. Asymmetric
#: rather than a symmetric window, because widening it backwards is what makes a
#: genuinely undated role three lines below a dated one look dated.
DATE_LINES_BEFORE = 1


def _undated_role_lines(text: str, ranges: Sequence[DateRange]) -> List[str]:
    """Lines that look like a job title with no date range anywhere near them.

    The proximity check is the whole difficulty. ``pdfplumber`` gives a stream of
    lines with no idea which is a heading and which is a bullet, so a resume
    written as

    .. code-block:: text

        Senior Backend Engineer, Acme Corp
        Jan 2020 – Present

    has its title and its dates on *different lines*, and a naive same-line check
    reports every properly dated role as undated. That is the worst failure this
    module can have — it sends the user hunting for a problem that is not there —
    so a heading counts as dated when a range appears from
    :data:`DATE_LINES_BEFORE` above it to :data:`DATE_LINES_AFTER` below.

    Only meaningful once ``ranges`` is non-empty; the caller enforces that. A
    line containing any year is also skipped, because a date we failed to *pair
    into a range* is still a date.
    """
    dated_lines = {r.line_number for r in ranges if r.line_number >= 0}
    if not dated_lines:
        return []

    # Built from the heading's point of view: a range on line N vouches for a
    # heading anywhere from N - DATE_LINES_AFTER to N + DATE_LINES_BEFORE.
    near_a_date = set()
    for number in dated_lines:
        for offset in range(-DATE_LINES_AFTER, DATE_LINES_BEFORE + 1):
            near_a_date.add(number + offset)

    year_re = re.compile(_YEAR)
    undated = []

    for number, line in enumerate(text.splitlines()):
        stripped = line.strip()
        if not stripped or number in near_a_date:
            continue
        if len(stripped) > 120:
            # Long lines are prose, not headings.
            continue
        if year_re.search(stripped):
            continue
        if ROLE_HINT_PATTERN.search(stripped):
            undated.append(stripped)

    return undated


def _seniority_expectation(level: str) -> Optional[Tuple[int, str]]:
    """Return ``(minimum_months, label)`` for a level, or ``None``.

    Only a floor, and a lenient one. The point is to catch the resume that
    claims Senior and shows eighteen months, not to police the boundary between
    four and five years.
    """
    if not isinstance(level, str):
        return None

    text = level.strip().lower()
    if "senior" in text or "lead" in text or "staff" in text or "principal" in text:
        return 60, "Senior"
    if "mid" in text or "intermediate" in text:
        return 24, "Mid-Level"
    return None


def analyse(text, experience_level="", today=None) -> Timeline:
    """Parse ``text`` and report on the timeline it describes.

    Args:
        text: The extracted resume text.
        experience_level: What the user selected, used only for the seniority
            cross-check. Anything unrecognised skips that check rather than
            guessing.
        today: Clock override. Injected rather than read from the module, so
            "current role" and "future date" are testable without freezing time
            globally.

    Returns:
        A :class:`Timeline`. ``parsed`` is ``False`` when nothing was found, and
        in that case ``findings`` carries one informational entry and nothing
        else — see the module docstring on why silence is the right failure.
    """
    today = today or date.today()
    ranges = extract_ranges(text or "")

    if not ranges:
        return Timeline(
            parsed=False,
            findings=[
                Finding(
                    code="no_dates_found",
                    severity=SEVERITY_INFO,
                    message=(
                        "We could not read any employment dates from this resume. "
                        "If your roles do have dates, they may be in a layout an ATS "
                        "cannot parse either — a plain line like "
                        "\"Jan 2020 – Mar 2022\" beside each role is the safest format."
                    ),
                )
            ],
        )

    findings: List[Finding] = []

    # --- Impossible and implausible dates ---------------------------------
    #
    # Checked first, and the offending ranges are dropped, because a reversed or
    # far-future range would poison the gap and total-experience arithmetic that
    # follows.
    usable = []
    future_cutoff = today.year * 12 + \
        (today.month - 1) + FUTURE_TOLERANCE_MONTHS

    for r in ranges:
        if not r.is_current and r.end_index(today) < r.start_index():
            findings.append(
                Finding(
                    code="reversed_range",
                    severity=SEVERITY_HIGH,
                    message=(
                        f"\"{r.label()}\" ends before it starts. An ATS that parses this "
                        "into an employment record will either drop the role or record "
                        "it with a negative duration."
                    ),
                    evidence=r.line or r.label(),
                )
            )
            continue

        if r.start_index() > future_cutoff:
            findings.append(
                Finding(
                    code="future_date",
                    severity=SEVERITY_MEDIUM,
                    message=(
                        f"\"{r.label()}\" starts in the future. If that is not a planned "
                        "start date, it is likely a typo in the year."
                    ),
                    evidence=r.line or r.label(),
                )
            )
            continue

        # Only the *start* used to be checked against the cutoff. A typo in the
        # end year sailed through and was counted in full: "Jan 2020 - Dec 2029"
        # read on a 2024 resume reported 10.0 years of experience with no
        # finding raised at all, and total_months is what the seniority
        # cross-check below reads — so it would confirm a Senior claim on
        # fabricated time. _YEAR accepts up to 21xx, so "2015 - 2099" parses
        # cleanly too.
        if not r.is_current and r.end_index(today) > future_cutoff:
            findings.append(
                Finding(
                    code="future_end_date",
                    severity=SEVERITY_MEDIUM,
                    message=(
                        f"\"{r.label()}\" ends in the future. If the role is ongoing, "
                        "write \"Present\" rather than a future year — an end year that "
                        "has not happened yet is usually a typo, and it silently adds "
                        "the difference to your total experience."
                    ),
                    evidence=r.line or r.label(),
                )
            )
            continue

        usable.append(r)

    ordered = sorted(usable, key=lambda r: (
        r.start_index(), r.end_index(today)))

    # --- Gaps and overlaps ------------------------------------------------
    largest_gap = 0
    if len(ordered) > 1:
        furthest_end = ordered[0].end_index(today)
        previous = ordered[0]

        for current in ordered[1:]:
            gap = current.start_index() - furthest_end - 1
            if gap >= GAP_THRESHOLD_MONTHS:
                largest_gap = max(largest_gap, gap)
                findings.append(
                    Finding(
                        code="employment_gap",
                        severity=SEVERITY_MEDIUM if gap < 12 else SEVERITY_HIGH,
                        message=(
                            f"There is a gap of {_describe_months(gap)} between "
                            f"\"{previous.label()}\" and \"{current.label()}\". A gap is not a "
                            "problem, but an unexplained one is a question — a single line "
                            "naming what you were doing usually settles it."
                        ),
                        evidence=f"{previous.label()} → {current.label()}",
                    )
                )

            overlap = furthest_end - current.start_index() + 1
            if _shares_only_a_boundary_year(previous, current):
                # Both ends are year-only and name the same year. That is not a
                # claimed overlap, it is the precision of the dates: a year-only
                # end reads as December (deliberately — see DateRange.end_index)
                # and a year-only start reads as January, so "2019 - 2021" then
                # "2021 - 2023" always produced a phantom twelve months.
                #
                # That is the single most common way to write a promotion, and
                # the module's own union arithmetic disagreed with the finding:
                # merged_months returned 60, while the finding claimed a year of
                # overlap on top.
                overlap -= 12

            if overlap >= OVERLAP_THRESHOLD_MONTHS:
                findings.append(
                    Finding(
                        code="overlapping_roles",
                        severity=SEVERITY_LOW,
                        message=(
                            f"\"{previous.label()}\" and \"{current.label()}\" overlap by "
                            f"{_describe_months(overlap)}. That is normal for contract work, "
                            "a promotion or a side project — but say which it is, or it reads "
                            "as a mistake."
                        ),
                        evidence=f"{previous.label()} / {current.label()}",
                    )
                )

            if current.end_index(today) > furthest_end:
                furthest_end = current.end_index(today)
                previous = current

    # --- Format consistency -----------------------------------------------
    formats = []
    for r in ordered:
        for key in (r.start_format, r.end_format):
            label = FORMAT_LABELS.get(key)
            if label and label not in formats:
                formats.append(label)

    # "Present" is not a competing format — it is the only way to write an open
    # end — so it does not count towards inconsistency.
    competing = [f for f in formats if f != FORMAT_LABELS["present"]]
    if len(competing) > 1:
        findings.append(
            Finding(
                code="mixed_date_formats",
                severity=SEVERITY_LOW,
                message=(
                    "Your dates are written in more than one format ("
                    + ", ".join(competing)
                    + "). Parsers usually lock on to the first one they see and drop the "
                    "rest, so picking one and using it throughout is worth a minute."
                ),
            )
        )

    # --- Year-only ranges -------------------------------------------------
    year_only = [r for r in ordered if r.start_month is None]
    if year_only:
        findings.append(
            Finding(
                code="year_only_dates",
                severity=SEVERITY_LOW,
                message=(
                    f"{len(year_only)} of your date ranges give only years. Adding the month "
                    "makes the length of each role unambiguous — \"2021 – 2022\" could be "
                    "two months or twenty-three."
                ),
                evidence=year_only[0].line or year_only[0].label(),
            )
        )

    # --- Undated roles ----------------------------------------------------
    #
    # Only once we have parsed something. On a resume we simply could not read,
    # every line would qualify.
    undated = _undated_role_lines(text or "", ranges)
    if undated:
        findings.append(
            Finding(
                code="undated_role",
                severity=SEVERITY_HIGH,
                message=(
                    f"{len(undated)} line{'s' if len(undated) != 1 else ''} read like a role "
                    "but carry no dates. An entry with no dates is the most common reason an "
                    "ATS drops a job from your history entirely."
                ),
                evidence=undated[0],
            )
        )

    total_months = merged_months(ordered, today)

    # --- Seniority cross-check --------------------------------------------
    expectation = _seniority_expectation(experience_level)
    if expectation and total_months:
        minimum, label = expectation
        if total_months < minimum:
            findings.append(
                Finding(
                    code="seniority_mismatch",
                    severity=SEVERITY_MEDIUM,
                    message=(
                        f"You are targeting {label} roles, but the dates on this resume add up "
                        f"to about {_describe_months(total_months)}. If you have earlier "
                        "experience that is not listed, add it — a reviewer works from the "
                        "dates, not the job title you are aiming for."
                    ),
                )
            )

    findings.sort(key=lambda f: _SEVERITY_ORDER.get(f.severity, 99))

    return Timeline(
        parsed=True,
        ranges=ordered,
        findings=findings,
        total_months=total_months,
        total_years=round(total_months / 12, 1),
        largest_gap_months=largest_gap,
        has_current_role=any(r.is_current for r in ordered),
        formats_seen=formats,
    )
