"""Multi-factor ATS scoring.

The headline ``score`` on an analysis is a single division — matched role
keywords over required ones. That makes a keyword-stuffed page with no work
history, no contact details and no measurable achievements score 100, and it
gives the user nothing to act on beyond "add more keywords".

This module scores a resume across the things an ATS and a recruiter actually
look at, and reports each factor separately so the UI can explain where the
points went. Signals the pipeline already computes — readability from
``textstat``, unquantified bullets from ``quantify_checker`` — are passed in
rather than recomputed.

The weights below sum to 100. Keyword match stays the single largest factor
because it is what actually gets a resume past a filter; the rest are the
difference between passing the filter and being worth reading afterwards.
"""

import re
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Sequence

from .section_headings import SECTIONS, find_section_keys

#: Factor weights, in points out of 100.
WEIGHTS = {
    "keyword_match": 40,
    "sections": 15,
    "impact_language": 12,
    "contact_details": 10,
    "quantification": 10,
    "readability": 8,
    "length_format": 5,
}

TOTAL_POINTS = sum(WEIGHTS.values())

#: Display names, kept beside the weights so a factor is described in one place.
FACTOR_LABELS = {
    "keyword_match": "Keyword & role match",
    "sections": "Section coverage",
    "impact_language": "Impact language",
    "contact_details": "Contact details",
    "quantification": "Quantified achievements",
    "readability": "Readability",
    "length_format": "Length & formatting",
}

#: Headings we expect to find. The variants live in
#: :mod:`analyzer.section_headings` alongside the two other copies of this list
#: they were drifting from — see the module docstring there.
EXPECTED_SECTION_KEYS = ("experience", "education", "skills", "projects")

#: Kept for callers that read it. Derived rather than hand-maintained.
EXPECTED_SECTIONS = {
    key: SECTIONS[key][1] for key in EXPECTED_SECTION_KEYS
}

#: Verbs that open a strong accomplishment bullet. Deliberately overlapping
#: with quantify_checker's list — that one asks "is there a number?", this one
#: asks "does the sentence lead with an action?".
ACTION_VERBS = {
    "accelerated", "achieved", "administered", "analyzed", "architected",
    "automated", "built", "championed", "collaborated", "consolidated",
    "coordinated", "created", "cut", "delivered", "deployed", "designed",
    "developed", "directed", "drove", "engineered", "enhanced", "established",
    "executed", "expanded", "facilitated", "generated", "grew", "implemented",
    "improved", "increased", "initiated", "integrated", "introduced",
    "launched", "led", "maintained", "managed", "mentored", "migrated",
    "modernized", "negotiated", "optimized", "orchestrated", "overhauled",
    "oversaw", "owned", "pioneered", "planned", "prototyped", "published",
    "redesigned", "reduced", "refactored", "resolved", "restructured",
    "revamped", "scaled", "shipped", "simplified", "spearheaded",
    "standardized", "streamlined", "strengthened", "supported", "tested",
    "trained", "transformed", "translated", "upgraded",
}

#: Weak openers that read as duties rather than achievements.
WEAK_OPENERS = (
    "responsible for",
    "worked on",
    "helped with",
    "assisted with",
    "involved in",
    "tasked with",
    "duties included",
    "participated in",
)

EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
#: A run of digits that *could* be a phone number. Every group but the first
#: is optional-ish, so this is deliberately loose; :func:`_find_phone` decides.
PHONE_PATTERN = re.compile(
    r"(?:\+\d{1,3}[\s.\-–—]?)?(?:\(\d{2,4}\)[\s.\-–—]?)?"
    r"\d{2,5}(?:[\s.\-–—]?\d{2,4}){1,3}"
)

#: Two four-digit years joined by a dash or slash — "2019-2023", "1998 – 2002".
#:
#: The old pattern matched these and counted them as a phone number. It is
#: searched against the first fifteen lines of the resume, which is exactly
#: where a graduation year range lives, so a resume with no phone number at all
#: was awarded the points for having one and told "Found: email address, phone
#: number" — so the person never added the number the ATS is actually keying on.
YEAR_RANGE_PATTERN = re.compile(
    r"^(?:19|20)\d{2}\s*[-–—/]\s*(?:(?:19|20)\d{2}|present|current|now)$",
    re.IGNORECASE,
)

#: E.164 allows at most 15 digits. Seven is the shortest real subscriber number.
PHONE_DIGIT_RANGE = (7, 15)


def _find_phone(text: str) -> Optional[str]:
    """The first digit run in ``text`` that plausibly is a phone number.

    Length alone does not separate a phone number from a year range —
    "2019-2023" is eight digits — so the year-range shape is rejected
    explicitly rather than by counting.
    """
    low, high = PHONE_DIGIT_RANGE

    for match in PHONE_PATTERN.finditer(text):
        candidate = match.group(0).strip()

        digits = re.sub(r"\D", "", candidate)
        if not low <= len(digits) <= high:
            continue

        if YEAR_RANGE_PATTERN.match(candidate):
            continue

        return candidate

    return None
PROFILE_LINK_PATTERN = re.compile(
    r"(linkedin\.com/\S+|github\.com/\S+|gitlab\.com/\S+|"
    r"[\w-]+\.(?:dev|io|me|com)/\S*portfolio\S*)",
    re.IGNORECASE,
)
#: Characters people actually start a bullet with.
#:
#: The en dash (U+2013) and em dash (U+2014) are the important additions: Word
#: and Google Docs autoformat a leading "-" into "–", so the glyph in the file
#: is usually not the one that was typed. Leaving them out meant the same four
#: bullets scored 12/12 written with "-" and 0/12 written with "–", because
#: ``score_impact_language`` strips the marker with this pattern and then reads
#: the first word — with the dash left in place, the first word is "".
#:
#: ``-`` is first in the class so it is a literal rather than a range.
BULLET_PATTERN = re.compile(r"^\s*(?:[-–—*•▪▫▸▹●○◦‣∙·]|\d+[.)])\s+")

#: A resume in this word range reads as complete without being a wall of text.
IDEAL_WORD_RANGE = (350, 900)


@dataclass
class FactorScore:
    """One scored dimension of a resume."""

    key: str
    label: str
    earned: int
    possible: int
    #: ``strong`` / ``partial`` / ``weak`` — drives the colour of the row.
    status: str
    #: One sentence explaining the number, written for the person being scored.
    detail: str

    def as_dict(self) -> Dict:
        return asdict(self)


@dataclass
class ScoreBreakdown:
    """The full result: an overall score plus the factors that produced it."""

    overall: int
    factors: List[FactorScore]
    summary: str

    def as_dict(self) -> Dict:
        return {
            "overall": self.overall,
            "summary": self.summary,
            "factors": [factor.as_dict() for factor in self.factors],
        }


def _status_for(earned: int, possible: int) -> str:
    if possible == 0:
        return "strong"
    ratio = earned / possible
    if ratio >= 0.8:
        return "strong"
    if ratio >= 0.45:
        return "partial"
    return "weak"


def _make_factor(key: str, earned: float, detail: str) -> FactorScore:
    possible = WEIGHTS[key]
    clamped = max(0, min(possible, int(round(earned))))
    return FactorScore(
        key=key,
        label=FACTOR_LABELS[key],
        earned=clamped,
        possible=possible,
        status=_status_for(clamped, possible),
        detail=detail,
    )


def _bullet_line_indices(lines: Sequence[str]) -> List[int]:
    """Indices of the lines that read as accomplishment bullets.

    Indices rather than text, because ``quantify_checker`` reports its findings
    by line index and the two have to be compared. See
    :func:`score_quantification`.
    """
    indices = []
    for index, raw in enumerate(lines):
        line = raw.strip()
        if len(line) < 25:
            continue
        if BULLET_PATTERN.match(raw) or len(line.split()) >= 6:
            indices.append(index)
    return indices


def _bullet_lines(lines: Sequence[str]) -> List[str]:
    """Lines that read as accomplishment bullets rather than headings or contact rows."""
    return [lines[index].strip() for index in _bullet_line_indices(lines)]


def _nudged_line_indices(quantify_nudges: Sequence[Dict]) -> set:
    """Line indices from ``quantify_checker.flag_unquantified_bullets``.

    Tolerant of a nudge without a usable ``line_index``: the caller may be an
    older code path, and a missing index should cost the user nothing.
    """
    indices = set()
    for nudge in quantify_nudges or []:
        if not isinstance(nudge, dict):
            continue
        index = nudge.get("line_index")
        if isinstance(index, int) and not isinstance(index, bool):
            indices.add(index)
    return indices


def score_keyword_match(matched: Sequence[str], required: Sequence[str],
                        detected: Sequence[str], partial_skills: Optional[Sequence] = None) -> FactorScore:
    """Points for covering the keywords the target role (or job description) asks for."""
    partials = partial_skills or []
    num_partial = len(partials)
    if required:
        effective_matched = len(matched) + (0.5 * num_partial)
        ratio = min(1.0, effective_matched / len(required))
        earned = ratio * WEIGHTS["keyword_match"]
        detail = f"{len(matched)} of {len(required)} target keywords found"
        if num_partial > 0:
            detail += f", plus {num_partial} partial match{'es' if num_partial != 1 else ''}"
        detail += f" ({int(round(ratio * 100))}% coverage)."
        if ratio < 1 and len(required) - len(matched) <= 3:
            detail += " You are a few keywords away from full coverage."
    else:
        # No role and no job description: fall back to breadth of detected
        # skills, capped so an unfocused keyword dump cannot max out the factor.
        capped = min(len(detected), 12)
        earned = (capped / 12) * WEIGHTS["keyword_match"]
        detail = (
            f"No target role or job description supplied, so this is scored on "
            f"the {len(detected)} skills detected overall."
        )

    return _make_factor("keyword_match", earned, detail)


def score_sections(text: str) -> FactorScore:
    """Points for having the sections a recruiter scans for.

    This asked ``variant in text.lower()``, which is a question about the whole
    document rather than about its headings. A resume with no headings at all
    scored the full 15: "years of experience" supplied *experience*, "improved
    my skills" supplied *skills*, "a degree from a good academic program"
    supplied *education*, and "a portfolio of small projects" supplied
    *projects*.

    That is the worst way for this factor to be wrong. Adding headings is the
    single cheapest thing most people can do to get past an ATS, and they were
    being told it was already done.
    """
    present = set(find_section_keys(text))
    found = [key for key in EXPECTED_SECTION_KEYS if key in present]
    missing = [key for key in EXPECTED_SECTION_KEYS if key not in present]

    earned = (len(found) / len(EXPECTED_SECTION_KEYS)) * WEIGHTS["sections"]

    if not missing:
        detail = "All four expected sections are present: experience, education, skills and projects."
    else:
        readable = ", ".join(sorted(missing))
        detail = (
            f"Found {len(found)} of 4 expected section headings. Missing: {readable}. "
            "An ATS splits a resume on its headings — text under no heading at "
            "all often lands in the wrong field or is dropped."
        )

    return _make_factor("sections", earned, detail)


def score_contact_details(text: str) -> FactorScore:
    """Points for being reachable — an ATS that cannot parse contact details drops the resume."""
    head = "\n".join(text.splitlines()[:15]) or text

    has_email = bool(EMAIL_PATTERN.search(text))
    has_phone = _find_phone(head) is not None
    has_link = bool(PROFILE_LINK_PATTERN.search(text))

    present = [
        label
        for label, found in (
            ("email address", has_email),
            ("phone number", has_phone),
            ("professional link", has_link),
        )
        if found
    ]
    missing = [
        label
        for label, found in (
            ("email address", has_email),
            ("phone number", has_phone),
            ("professional link (LinkedIn, GitHub or portfolio)", has_link),
        )
        if not found
    ]

    # Email carries most of the weight — it is the field an ATS actually keys on.
    earned = 0
    if has_email:
        earned += WEIGHTS["contact_details"] * 0.5
    if has_phone:
        earned += WEIGHTS["contact_details"] * 0.25
    if has_link:
        earned += WEIGHTS["contact_details"] * 0.25

    if not missing:
        detail = "Email, phone number and a professional link were all found."
    elif present:
        detail = f"Found: {', '.join(present)}. Consider adding: {', '.join(missing)}."
    else:
        detail = (
            "No contact details were detected. An ATS that cannot find an email "
            "address often discards the resume outright."
        )

    return _make_factor("contact_details", earned, detail)


def score_impact_language(lines: Sequence[str]) -> FactorScore:
    """Points for bullets that lead with an action verb rather than a duty phrase."""
    bullets = _bullet_lines(lines)
    if not bullets:
        return _make_factor(
            "impact_language",
            0,
            "No accomplishment bullets were detected — describe your work as short, "
            "action-led bullet points rather than paragraphs.",
        )

    strong = 0
    weak = 0
    for bullet in bullets:
        stripped = BULLET_PATTERN.sub("", bullet).strip().lower()
        first_word = re.split(r"[^\w]+", stripped,
                              maxsplit=1)[0] if stripped else ""
        if first_word in ACTION_VERBS:
            strong += 1
        elif any(stripped.startswith(opener) for opener in WEAK_OPENERS):
            weak += 1

    ratio = strong / len(bullets)
    earned = ratio * WEIGHTS["impact_language"]

    detail = f"{strong} of {len(bullets)} bullets open with a strong action verb."
    if weak:
        detail += (
            f" {weak} start with a phrase like \"responsible for\" — rewrite those "
            "to lead with what you did."
        )
    elif ratio < 0.5:
        detail += " Opening with verbs like \"built\", \"led\" or \"reduced\" reads as achievement rather than duty."

    return _make_factor("impact_language", earned, detail)


def score_quantification(quantify_nudges: Sequence[Dict], lines: Sequence[str]) -> FactorScore:
    """Points for achievements backed by a number.

    ``quantify_nudges`` comes from ``quantify_checker.flag_unquantified_bullets``:
    one entry per line that describes an accomplishment without a metric.

    The two halves of this factor used to be counted over different sets of
    lines. ``_bullet_lines`` keeps lines of 25 characters or more;
    ``quantify_checker.is_exempt`` skips lines under 15. So the numerator was
    ``len(bullets) - len(nudges)`` where the two counts came from different
    populations, and the subtraction was not a count of anything.

    In the worst case the sets are disjoint. A resume with three long,
    fully-quantified bullets and three short unquantified ones scored **0/10**
    and was told three bullets had no metric — while every bullet the factor
    was actually looking at had one. ``max(0, ...)`` hid the negative rather
    than surfacing it.

    Both counts are now over the same set: every line that *either* check calls
    an accomplishment bullet. That is also the set the user sees, since the
    nudge panel lists exactly the lines ``quantify_checker`` flagged — so the
    score and the advice beside it now describe the same lines.
    """
    bullet_indices = set(_bullet_line_indices(lines))
    reported_indices = _nudged_line_indices(quantify_nudges)

    # Ignore an index that does not point at a line we were given, rather than
    # letting it inflate the denominator.
    nudged_indices = {i for i in reported_indices if 0 <= i < len(lines)}

    considered = bullet_indices | nudged_indices

    if not considered:
        return _make_factor(
            "quantification",
            0,
            "No accomplishment bullets were found to check for metrics.",
        )

    unquantified = len(considered & nudged_indices)

    if quantify_nudges and not reported_indices:
        # A caller that reported nudges without any line index at all. Fall
        # back to the old count, clamped to the denominator so it cannot go
        # negative. Note this checks `reported_indices`, not `nudged_indices`:
        # indices that were given but point outside `lines` have already been
        # judged and discarded, and must not re-enter through here.
        unquantified = min(len(quantify_nudges), len(considered))

    quantified = len(considered) - unquantified
    ratio = quantified / len(considered)
    earned = ratio * WEIGHTS["quantification"]

    if unquantified == 0:
        detail = "Every accomplishment bullet includes a number, percentage or other metric."
    else:
        detail = (
            f"{unquantified} of {len(considered)} accomplishment bullets have no "
            "metric. Numbers make the same work measurably more convincing."
        )

    return _make_factor("quantification", earned, detail)


def score_readability(readability_score: Optional[float], readability_label: str = "") -> FactorScore:
    """Points for prose a recruiter can skim.

    ``readability_score`` is the Flesch reading-ease value already computed by
    ``services.calculate_readability``. Higher is easier; resumes sit
    comfortably in the 30–70 band because technical nouns drag the score down.
    """
    if readability_score is None:
        return _make_factor(
            "readability",
            WEIGHTS["readability"] * 0.5,
            "Not enough text to assess readability.",
        )

    if readability_score >= 50:
        earned = WEIGHTS["readability"]
        detail = f"Reads easily (Flesch {readability_score}) — recruiters can skim it quickly."
    elif readability_score >= 30:
        earned = WEIGHTS["readability"] * 0.75
        detail = (
            f"Moderately dense (Flesch {readability_score}). Normal for technical "
            "resumes, but shorter sentences would help."
        )
    elif readability_score >= 10:
        earned = WEIGHTS["readability"] * 0.4
        detail = (
            f"Dense (Flesch {readability_score}). Long sentences and stacked jargon "
            "slow a reader down — try splitting the longest bullets."
        )
    else:
        earned = WEIGHTS["readability"] * 0.15
        detail = (
            f"Very dense (Flesch {readability_score}). Consider rewriting the longest "
            "sentences as short, single-idea bullets."
        )

    if readability_label:
        detail = f"{detail} Rated \"{readability_label}\"."

    return _make_factor("readability", earned, detail)


def score_length_and_format(text: str, lines: Sequence[str]) -> FactorScore:
    """Points for a resume that is the right length and laid out as bullets."""
    words = len(text.split())
    bullets = _bullet_lines(lines)
    low, high = IDEAL_WORD_RANGE

    notes = []
    earned = 0.0

    if words == 0:
        return _make_factor(
            "length_format", 0, "No text could be extracted from the file."
        )

    if low <= words <= high:
        earned += WEIGHTS["length_format"] * 0.6
        notes.append(f"{words} words is a good length")
    elif words < low:
        earned += WEIGHTS["length_format"] * 0.25
        notes.append(
            f"{words} words is on the short side — aim for at least {low}")
    else:
        earned += WEIGHTS["length_format"] * 0.3
        notes.append(
            f"{words} words is long — trimming below {high} keeps attention")

    if len(bullets) >= 5:
        earned += WEIGHTS["length_format"] * 0.4
        notes.append(f"{len(bullets)} bullet points detected")
    elif bullets:
        earned += WEIGHTS["length_format"] * 0.2
        notes.append("only a few bullet points — break dense paragraphs up")
    else:
        notes.append(
            "no bullet points detected — ATS parsers handle bullets better than paragraphs")

    return _make_factor(
        "length_format", earned, "; ".join(notes).capitalize() + "."
    )


def _summarise(overall: int, factors: Sequence[FactorScore]) -> str:
    weakest = min(factors, key=lambda factor: factor.earned /
                  factor.possible if factor.possible else 1)

    if overall >= 80:
        opening = "Strong resume."
    elif overall >= 60:
        opening = "Solid resume with room to improve."
    elif overall >= 40:
        opening = "This resume needs work before it will rank well."
    else:
        opening = "This resume is likely to be filtered out early."

    if weakest.earned == weakest.possible:
        return f"{opening} Every factor scored well."
    return f"{opening} Biggest opportunity: {weakest.label.lower()}."


def compute_score_breakdown(
    text: str,
    matched_skills: Sequence[str],
    required_skills: Sequence[str],
    detected_skills: Sequence[str],
    readability_score: Optional[float] = None,
    readability_label: str = "",
    quantify_nudges: Optional[Sequence[Dict]] = None,
    partial_skills: Optional[Sequence] = None,
) -> ScoreBreakdown:
    """Score a resume across every factor and return the parts plus the total.

    Everything is derived from values the analysis pipeline already has, so
    this adds no parsing work beyond a handful of regex passes over the text.
    """
    lines = text.splitlines()
    nudges = quantify_nudges or []

    if not text.split():
        # Nothing was extracted — a scanned image, an empty file, or a PDF the
        # parser could not read. Scoring the individual factors here would hand
        # out consolation points (textstat rates empty text as "very dense"
        # rather than unknown), so every factor is reported as zero instead.
        return ScoreBreakdown(
            overall=0,
            factors=[
                _make_factor(
                    key,
                    0,
                    "No text could be extracted from this file, so this factor "
                    "could not be assessed.",
                )
                for key in WEIGHTS
            ],
            summary=(
                "No readable text was extracted from this file. If it is a scanned "
                "image, export a text-based PDF and try again."
            ),
        )

    factors = [
        score_keyword_match(matched_skills, required_skills,
                            detected_skills, partial_skills),
        score_sections(text),
        score_impact_language(lines),
        score_contact_details(text),
        score_quantification(nudges, lines),
        score_readability(readability_score, readability_label),
        score_length_and_format(text, lines),
    ]

    overall = sum(factor.earned for factor in factors)
    # The weights sum to 100, so the total is already a percentage.
    overall = max(0, min(TOTAL_POINTS, overall))

    return ScoreBreakdown(
        overall=overall,
        factors=factors,
        summary=_summarise(overall, factors),
    )
