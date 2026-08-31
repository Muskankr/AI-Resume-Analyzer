"""
Resume Accessibility and Screen Reader Compliance Checker.

This module evaluates resume structure for screen-reader compatibility,
flagging issues like missing heading hierarchies, improper list formatting,
or problematic layouts that hinder assistive technologies.
"""

import re
from typing import List, Dict, Any

#: Characters that mark a list item at the start of a line. Named once and
#: used twice: `no_bullet_points` looks for them, and `special_characters`
#: must not then complain about the ones it just recommended.
BULLET_CHARS = "-*•‣▪●◦·⁃∙"

#: A line that opens a list item: a bullet character or a numbered marker,
#: with whitespace after it.
BULLET_LINE_RE = re.compile(
    rf"^[ \t]*(?:[{re.escape(BULLET_CHARS)}]|\d+[.)])[ \t]+\S", re.MULTILINE
)

#: How much of the document counts as "the top" for the contact-block rule.
CONTACT_HEADER_LINES = 15
CONTACT_HEADER_CHARS = 800

#: Contact signals. The words, plus the shapes of an address and a phone
#: number — a contact block that reads "j.doe@example.com | +1 555 0142" is a
#: contact block whether or not it uses the word "email".
CONTACT_SIGNAL_RE = re.compile(
    r"(?:email|e-mail|phone|mobile|tel(?:ephone)?|address|linkedin|github|"
    r"portfolio|contact)"
    r"|[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}"
    r"|\+?\d[\d\s().-]{7,}\d",
    re.IGNORECASE,
)

#: Characters a screen reader genuinely struggles with: arrows, dingbats,
#: geometric and miscellaneous symbols, box drawing, emoji, and — the worst
#: of them — Private Use Area codepoints, which is where icon fonts put their
#: glyphs and where a screen reader has nothing at all to say.
#:
#: The rule used to be an allowlist, `[^\w\s\-\.\,\:\;\(\)\[\]\/\@]`, which
#: flagged "%" (the quantified metrics every resume guide asks for), "&"
#: (R&D), "+" and "#" (C++, C#), "|" (the standard contact-line separator)
#: and "•" — the bullet character `no_bullet_points` recommends two rules
#: above. It fired on essentially every real resume.
PROBLEM_CHAR_RE = re.compile(
    "["
    "←-⇿"  # arrows
    "─-╿"  # box drawing
    "▀-▟"  # block elements
    "■-◿"  # geometric shapes
    "☀-⛿"  # miscellaneous symbols
    "✀-➿"  # dingbats
    "-"  # private use area (icon fonts)
    "\U0001f000-\U0001faff"  # emoji and pictographs
    "]"
)

#: Acronyms and initialisms that are written in capitals because that is how
#: they are spelled. `\b[A-Z]{4,}\b` could not tell these apart from
#: caps-locked prose, so "Built REST APIs in JAVA using SPRING and JUNIT;
#: shipped HTTPS/OAUTH flows" counted as six accessibility problems.
KNOWN_ACRONYMS = frozenset(
    {
        # Web and data
        "HTML", "CSS", "SCSS", "SASS", "JSON", "XML", "YAML", "CSV", "HTTP",
        "HTTPS", "REST", "SOAP", "GRPC", "API", "APIS", "SQL", "NOSQL",
        "GRAPHQL", "ORM", "CRUD", "ETL", "SDK", "CLI", "GUI", "UI", "UX",
        "SEO", "CMS", "CDN", "DNS", "TCP", "SSH", "SSL", "TLS", "URL", "URI",
        # Platforms and practice
        "AWS", "GCP", "IAM", "VPC", "SAAS", "PAAS", "IAAS", "CI", "CD",
        "CICD", "SRE", "QA", "TDD", "BDD", "MVC", "MVP", "SPA", "PWA",
        "SCRUM", "AGILE", "KPI", "OKR", "ROI", "SLA", "SLO",
        # Auth and security
        "JWT", "OAUTH", "SAML", "SSO", "MFA", "RBAC", "GDPR", "SOC", "PCI",
        # AI and analytics
        "AI", "ML", "NLP", "LLM", "GPU", "CPU", "RAM", "OCR", "BI",
        # Job titles and credentials
        "CEO", "CTO", "COO", "CFO", "CIO", "VP", "SVP", "EVP", "PM", "PMP",
        "MBA", "BSC", "MSC", "PHD", "BS", "MS", "BA", "MA", "CPA", "CFA",
        # Languages and tools commonly written in caps
        "PHP", "SAS", "SPSS", "MATLAB", "LATEX", "IDE", "IOS", "OS",
        # Regions and misc
        "USA", "UK", "EU", "NYC", "LLC", "INC", "R&D", "IT", "HR",
    }
)

#: How many capitalised words that are *not* recognised acronyms it takes
#: before the text reads as caps-locked rather than as a technical resume.
EXCESSIVE_CAPS_THRESHOLD = 5

#: Words in capitals, two letters or more.
CAPS_WORD_RE = re.compile(r"\b[A-Z][A-Z&/.'-]{1,}\b")


def _top_of_document(text: str) -> str:
    """The part of the resume a reader meets first."""
    lines = text.splitlines()[:CONTACT_HEADER_LINES]
    return "\n".join(lines)[:CONTACT_HEADER_CHARS]


def _has_contact_block_at_top(text: str) -> bool:
    """Whether the top of the document carries contact details.

    The rule's description has always said "top-level contact information
    section", but the check searched the whole document for the *words*
    "email", "phone", "address" or "linkedin" — so a resume mentioning "email
    marketing" in a bullet on page two passed, and nothing tested position.
    """
    return bool(CONTACT_SIGNAL_RE.search(_top_of_document(text)))


def _has_bullet_lines(text: str) -> bool:
    """Whether the text uses list markers, as opposed to merely containing one.

    The check was `"-" not in text and "*" not in text and "•" not in text`,
    a substring test over the whole document. Any hyphen anywhere satisfied
    it — a date range, a phone number, a hyphenated word — so on a real
    resume the rule could not fire. "2020-2023" alone switched it off.
    """
    return bool(BULLET_LINE_RE.search(text))


def _is_known_acronym(word: str) -> bool:
    """Whether `word` is a recognised acronym, however it is punctuated.

    Acronyms arrive with punctuation attached — "HTTPS/" from "HTTPS/OAuth",
    "B.S." from a degree line, "CI/CD" as a pair — so a bare set lookup
    misses most of them and they get counted as caps-locked prose.
    """
    upper = word.upper().strip(".&/'-")
    if upper in KNOWN_ACRONYMS:
        return True
    # "B.S." -> "BS"
    if upper.replace(".", "") in KNOWN_ACRONYMS:
        return True
    # "CI/CD" -> "CI" and "CD"
    if "/" in upper:
        parts = [part for part in upper.split("/") if part]
        return bool(parts) and all(part in KNOWN_ACRONYMS for part in parts)
    return False


def _unexplained_caps_words(text: str) -> List[str]:
    """Capitalised words that are not recognised acronyms."""
    return [word for word in CAPS_WORD_RE.findall(text) if not _is_known_acronym(word)]


def _has_problem_characters(text: str) -> bool:
    """Whether the text contains a character assistive tech cannot vocalise."""
    return bool(PROBLEM_CHAR_RE.search(text))


# Heuristic rules for accessibility checks
ACCESSIBILITY_RULES = {
    "missing_contact_header": {
        "severity": "critical",
        "description": "Resume lacks a clear, top-level contact information section.",
        "check": lambda text: not _has_contact_block_at_top(text),
    },
    "no_bullet_points": {
        "severity": "warning",
        "description": "Experience sections lack bullet points, making them hard to parse for screen readers.",
        "check": lambda text: not _has_bullet_lines(text),
    },
    "excessive_caps": {
        "severity": "warning",
        "description": "Excessive use of ALL CAPS can be read as individual letters by some screen readers.",
        "check": lambda text: len(_unexplained_caps_words(text))
        >= EXCESSIVE_CAPS_THRESHOLD,
    },
    "special_characters": {
        "severity": "info",
        "description": "Contains special characters or symbols that may not be vocalized correctly.",
        "check": _has_problem_characters,
    },
    "missing_section_headers": {
        "severity": "critical",
        "description": "Resume lacks standard section headers (e.g., Experience, Education, Skills).",
        "check": lambda text: not re.search(
            r"(?:experience|education|skills|summary|projects)", text, re.IGNORECASE
        ),
    },
}


def check_accessibility(resume_text: str) -> List[Dict[str, Any]]:
    """
    Evaluates the resume text against accessibility heuristic rules.

    Args:
        resume_text (str): The parsed text of the resume.

    Returns:
        List[Dict[str, Any]]: A list of findings with severity, description, and rule name.
    """
    if not resume_text or not isinstance(resume_text, str):
        return []

    findings = []

    for rule_name, rule_data in ACCESSIBILITY_RULES.items():
        if rule_data["check"](resume_text):
            findings.append(
                {
                    "rule": rule_name,
                    "severity": rule_data["severity"],
                    "description": rule_data["description"],
                    "recommendation": get_recommendation(rule_name),
                }
            )

    return findings


def get_recommendation(rule_name: str) -> str:
    """
    Provides a specific recommendation for a given accessibility rule violation.
    """
    recommendations = {
        "missing_contact_header": "Add a dedicated 'Contact' section at the very top with your email, phone, and LinkedIn URL.",
        "no_bullet_points": "Start each list item on its own line with a standard bullet character (-, *, or •) so screen readers announce it as a list item.",
        "excessive_caps": "Use Title Case or Sentence case instead of ALL CAPS for headings to improve screen reader vocalization.",
        "special_characters": "Replace decorative symbols (e.g., arrows, icon-font glyphs, emoji) with standard text or simple bullet points.",
        "missing_section_headers": "Include clear, standard headings like 'Professional Experience', 'Education', and 'Skills'.",
    }
    return recommendations.get(
        rule_name, "Review this section for clarity and standard formatting."
    )


def calculate_accessibility_score(findings: List[Dict[str, Any]]) -> int:
    """
    Calculates an accessibility compliance score from 0 to 100.
    """
    if not findings:
        return 100

    score = 100
    for finding in findings:
        if finding["severity"] == "critical":
            score -= 30
        elif finding["severity"] == "warning":
            score -= 15
        elif finding["severity"] == "info":
            score -= 5

    return max(0, score)
