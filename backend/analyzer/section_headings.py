"""Where a resume's sections actually start.

Three modules used to answer this question and all three got it wrong, in
opposite directions.

``scoring.score_sections`` and ``formatting_checker.check_resume_formatting``
asked ``variant in text.lower()``. A substring of a paragraph is not a heading,
so a resume with none at all scored full marks for section coverage:
"years of experience" supplied *experience*, "improved my skills" supplied
*skills*, "a degree from a good academic program" supplied *education*, and
"a portfolio of small projects" supplied *projects*. The person was told the
single change that would most improve their resume was already done.

``semantic_differ`` had the right idea — line-anchored heading patterns — and
then ran them against text whose newlines its own normaliser had already
replaced with spaces, so ``^`` could only match at offset zero. Any resume
opening with the candidate's name, which is every resume, had no sections at
all.

So: one module, one vocabulary, one definition of what a heading is. A heading
is a short line that names a section — not a phrase buried in a sentence about
one.
"""

import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

#: The section vocabulary, in the order a resume conventionally presents them.
#:
#: One table, because there were three and they had already drifted:
#: ``qualifications`` was in two of them, ``toolkit`` and ``core competencies``
#: in one each, and ``degrees`` was plural in one place and singular in
#: another. Adding a heading variant should not mean remembering which of three
#: lists to add it to.
#:
#: Longer variants come first within each section so that "professional
#: experience" is matched as a whole rather than as "experience" with a stray
#: word in front of it.
SECTION_VOCABULARY: Tuple[Tuple[str, str, Tuple[str, ...]], ...] = (
    (
        "summary",
        "Summary / Objective",
        (
            "professional summary",
            "career summary",
            "executive summary",
            "personal statement",
            "about me",
            "summary",
            "objective",
            "profile",
            "overview",
        ),
    ),
    (
        "experience",
        "Work Experience",
        (
            "professional experience",
            "professional background",
            "work experience",
            "employment history",
            "employment",
            "work history",
            "career history",
            "experience",
        ),
    ),
    (
        "education",
        "Education",
        (
            "education and training",
            "academic background",
            "academic",
            "education",
            "qualifications",
            "qualification",
            "degrees",
            "degree",
        ),
    ),
    (
        "skills",
        "Skills",
        (
            "core competencies",
            "technical skills",
            "technical proficiencies",
            "key skills",
            "competencies",
            "technologies",
            "toolkit",
            "tools",
            "skills",
        ),
    ),
    (
        "projects",
        "Projects",
        (
            "personal projects",
            "selected work",
            "key projects",
            "side projects",
            "portfolio",
            "projects",
        ),
    ),
)

#: Lookup by key, so callers can ask for the sections they care about.
SECTIONS: Dict[str, Tuple[str, Tuple[str, ...]]] = {
    key: (name, variants) for key, name, variants in SECTION_VOCABULARY
}

#: Every section key, in conventional resume order.
SECTION_KEYS: Tuple[str, ...] = tuple(key for key, _, _ in SECTION_VOCABULARY)

#: A heading is a label, not a sentence. Six words covers "Education, Training
#: and Professional Certifications" without admitting a clause.
MAX_HEADING_WORDS = 6

#: Decoration people put around a heading: "=== EXPERIENCE ===", "## Skills",
#: "--- Projects ---".
DECORATION = " \t#*=_~-–—|•●▪<>[]{}"

#: Sentence punctuation at the end of a line means it is a sentence. A colon
#: does not, so it is excluded here and handled separately.
SENTENCE_ENDINGS = ".,;!?"

#: Words that may stay lowercase inside a title-cased heading.
#:
#: Conjunctions and "of" only. Prepositions such as "in" and "for" are left out
#: deliberately: "Skills in Python" and "Experience for the platform team" read
#: as fragments, and allowing a lowercase preposition would admit both.
_MINOR_WORDS = {"and", "or", "of", "&", "/", "+"}


@dataclass(frozen=True)
class SectionHeading:
    """One heading found in a resume."""

    key: str
    #: The display name for the section, e.g. ``"Work Experience"``.
    name: str
    #: The variant that matched, as written in the resume.
    detected_as: str
    #: Index into ``text.splitlines()``.
    line_index: int
    #: The heading line as it appears, stripped of surrounding whitespace.
    line: str
    #: Anything written after a colon on the same line — "Skills: Python, Django".
    inline_content: str = ""


def _normalise(candidate: str) -> str:
    """Lowercased, decoration removed, internal whitespace collapsed."""
    return re.sub(r"\s+", " ", candidate.strip(DECORATION)).strip().lower()


def _is_title_or_upper_case(candidate: str) -> bool:
    """True when the line is written the way headings are written.

    "Employment History" and "EMPLOYMENT HISTORY" are headings. "Experience
    building internal tools" is a sentence fragment that happens to start with
    a section word, and the lowercase second word is what separates them.
    """
    words = [word for word in candidate.split() if word]
    if not words:
        return False

    for index, word in enumerate(words):
        if index and word.lower() in _MINOR_WORDS:
            continue
        first_letter = next((char for char in word if char.isalpha()), "")
        if first_letter and not first_letter.isupper():
            return False
    return True


def _match_variant(candidate: str) -> Optional[Tuple[str, str]]:
    """``(key, variant)`` when ``candidate`` names a section, else ``None``."""
    normalised = _normalise(candidate)
    if not normalised:
        return None

    # An exact match needs no case test: "Work history" is unambiguously a
    # heading, and requiring title case would reject a perfectly ordinary one.
    for key, _, variants in SECTION_VOCABULARY:
        for variant in variants:
            if normalised == variant:
                return key, variant

    # A heading with extra words — "Employment History", "Academic Background",
    # "Technical Skills & Tools". Here the case test does the work of telling a
    # heading apart from a sentence that starts with the same word.
    if len(normalised.split()) > MAX_HEADING_WORDS:
        return None
    if not _is_title_or_upper_case(candidate.strip(DECORATION)):
        return None

    for key, _, variants in SECTION_VOCABULARY:
        for variant in variants:
            if re.match(rf"{re.escape(variant)}\b", normalised):
                return key, variant

    return None


def classify_line(line: str) -> Optional[Tuple[str, str, str]]:
    """``(key, variant, inline_content)`` when ``line`` is a section heading.

    Handles the two ways a heading is written: alone on its line, and as a
    label with its content after a colon.
    """
    stripped = (line or "").strip()
    if not stripped:
        return None

    label, separator, inline = stripped.partition(":")

    if separator:
        matched = _match_variant(label)
        if matched:
            return matched[0], matched[1], inline.strip()
        # No colon interpretation available; fall through and try the whole
        # line, which covers "Skills / Tools: ..." style labels.

    if stripped.rstrip(DECORATION).endswith(tuple(SENTENCE_ENDINGS)):
        return None

    matched = _match_variant(stripped)
    if matched:
        return matched[0], matched[1], ""

    return None


def find_headings(text: str) -> List[SectionHeading]:
    """Every section heading in ``text``, in the order it appears.

    A section repeated — some resumes split "Experience" across pages and
    repeat the heading — is reported once, at its first occurrence, because
    every caller wants "does this resume have an experience section" rather
    than "how many times is the word printed".
    """
    headings: List[SectionHeading] = []
    seen = set()

    for index, line in enumerate((text or "").splitlines()):
        classified = classify_line(line)
        if classified is None:
            continue

        key, variant, inline = classified
        if key in seen:
            continue

        seen.add(key)
        name, _ = SECTIONS[key]
        headings.append(
            SectionHeading(
                key=key,
                name=name,
                detected_as=variant,
                line_index=index,
                line=line.strip(),
                inline_content=inline,
            )
        )

    return headings


def find_section_keys(text: str) -> List[str]:
    """The keys of the sections present, in document order."""
    return [heading.key for heading in find_headings(text)]


def has_section(text: str, key: str) -> bool:
    """Whether ``text`` carries a heading for the named section."""
    return key in find_section_keys(text)


def missing_section_keys(text: str, expected: Sequence[str] = SECTION_KEYS) -> List[str]:
    """Which of ``expected`` are absent, in the order ``expected`` gives them."""
    present = set(find_section_keys(text))
    return [key for key in expected if key not in present]


def section_body(text: str, key: str) -> str:
    """The lines under ``key``'s heading, up to the next heading of any kind.

    Includes anything written after a colon on the heading line itself, so
    "Skills: Python, Django" and a "Skills" heading with the list underneath
    both return the list.
    """
    lines = (text or "").splitlines()
    headings = find_headings(text)

    target = next((heading for heading in headings if heading.key == key), None)
    if target is None:
        return ""

    # The next heading *by position*, which is not necessarily the next one in
    # `headings` if a resume orders its sections unconventionally.
    following = [
        heading.line_index
        for heading in headings
        if heading.line_index > target.line_index
    ]
    end = min(following) if following else len(lines)

    body = lines[target.line_index + 1 : end]
    if target.inline_content:
        body = [target.inline_content, *body]

    return "\n".join(body).strip()
