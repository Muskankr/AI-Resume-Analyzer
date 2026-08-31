"""
ATS (Applicant Tracking System) Compatibility Checker.

Analyses resume text against the parsing rules and heuristics used by
major ATS platforms (Workday, Greenhouse, Lever, iCIMS, Taleo, etc.)
and produces a compatibility score with actionable fix recommendations.

Checks performed:
    1. Section header standardisation (ATS expects known headings)
    2. Contact information parseability (email, phone, links)
    3. Date format consistency (ATS struggles with mixed formats)
    4. Character encoding issues (special chars, ligatures, symbols)
    5. Keyword density and placement (top-of-document weighting)
    6. Table / column layout detection (text garbling risk)
    7. Font / formatting purity (embedded images, unusual glyphs)
    8. File length and page count estimation
    9. Education section parseability
   10. Skills section structure (comma-separated vs bullet)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional, Tuple


# ── Known ATS section headers ─────────────────────────────────────────────

ATS_FRIENDLY_HEADERS = {
    "summary": ["summary", "professional summary", "executive summary", "profile", "about", "objective"],
    "experience": ["experience", "work experience", "employment history", "professional experience", "work history", "positions held"],
    "education": ["education", "academic background", "education background", "degrees", "qualifications"],
    "skills": ["skills", "technical skills", "competencies", "technologies", "proficiencies", "tech stack", "core competencies"],
    "projects": ["projects", "key projects", "personal projects", "portfolio", "side projects"],
    "certifications": ["certifications", "certificates", "licenses", "professional certifications"],
    "awards": ["awards", "honors", "achievements", "recognition"],
    "publications": ["publications", "papers", "articles"],
    "languages": ["languages", "spoken languages"],
    "interests": ["interests", "hobbies", "extracurricular"],
}

# ── Date format patterns ──────────────────────────────────────────────────

DATE_PATTERNS = {
    "month_year": re.compile(
        r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}",
        re.IGNORECASE,
    ),
    "mm_yyyy": re.compile(r"\d{1,2}/\d{4}"),
    "yyyy": re.compile(r"\b(?:19|20)\d{2}\b"),
    "yyyy_range": re.compile(r"(?:19|20)\d{2}\s*[-–—]\s*(?:(?:19|20)\d{2}|present|current|now)", re.IGNORECASE),
    "iso": re.compile(r"\d{4}-\d{2}"),
    "written_month": re.compile(
        r"(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}",
        re.IGNORECASE,
    ),
}

# ── Contact info patterns ─────────────────────────────────────────────────

EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_PATTERN = re.compile(
    r"(?:\+?\d{1,3}[\s.\-–—]?)?\(?\d{2,4}\)?[\s.\-–—]?\d{2,5}(?:[\s.\-–—]?\d{2,4}){1,3}"
)
LINKEDIN_PATTERN = re.compile(r"linkedin\.com/in/\S+", re.IGNORECASE)
GITHUB_PATTERN = re.compile(r"github\.com/\S+", re.IGNORECASE)
PORTFOLIO_PATTERN = re.compile(r"(?:[\w-]+\.(?:dev|io|me|com))/\S*", re.IGNORECASE)
URL_PATTERN = re.compile(r"https?://\S+")

# ── Problematic character detection ───────────────────────────────────────

#: Characters that commonly break ATS parsing.
PROBLEMATIC_CHARS = re.compile(
    r"[\u200b\u200c\u200d\u2060\u00a0\u2022\u25cf\u25cb\u25a0\u25b6\u25b2\u25bc\u25c0]"
    r"|[\u2018\u2019\u201c\u201d]"  # Smart quotes
    r"|[\u2013\u2014]"  # En/em dashes (common but can confuse some ATS)
    r"|[\u2026]"  # Ellipsis
)

#: Characters that are safe in resumes.
SAFE_CHARS = set("•-*·▪▸▹●○◦‣∙–—""''…\t")

# ── Table / column layout indicators ──────────────────────────────────────

TAB_HEAVY_LINE = re.compile(r"\t{2,}|\s{6,}\S+\s{6,}")
MULTI_COLUMN_INDICATORS = [
    re.compile(r"\|.*\|.*\|"),  # Pipe-delimited tables
    re.compile(r"^\s*\w+\s{10,}\w+\s{10,}\w+\s*$", re.MULTILINE),  # Spaced columns
]


# ── Data classes ──────────────────────────────────────────────────────────

@dataclass
class ATSCheckItem:
    """A single ATS compatibility check result."""
    check_name: str
    category: str  # "structure" | "formatting" | "content" | "encoding" | "keywords"
    status: str  # "pass" | "warning" | "fail"
    score: int  # 0-100 for this check
    message: str
    suggestion: str
    details: Optional[Dict[str, Any]] = None

    def as_dict(self) -> Dict[str, Any]:
        d = {
            "check_name": self.check_name,
            "category": self.category,
            "status": self.status,
            "score": self.score,
            "message": self.message,
            "suggestion": self.suggestion,
        }
        if self.details:
            d["details"] = self.details
        return d


@dataclass
class ATSCompatibilityResult:
    """Complete ATS compatibility analysis."""
    overall_score: int  # 0-100
    grade: str  # "A+" | "A" | "B+" | "B" | "C" | "D" | "F"
    checks: List[ATSCheckItem]
    category_scores: Dict[str, int]
    estimated_ats_pass_rate: int  # percentage
    top_fixes: List[ATSCheckItem]
    summary: str

    def as_dict(self) -> Dict[str, Any]:
        return {
            "overall_score": self.overall_score,
            "grade": self.grade,
            "checks": [c.as_dict() for c in self.checks],
            "category_scores": self.category_scores,
            "estimated_ats_pass_rate": self.estimated_ats_pass_rate,
            "top_fixes": [c.as_dict() for c in self.top_fixes],
            "summary": self.summary,
        }


# ── Check implementations ─────────────────────────────────────────────────

def _check_section_headers(text: str) -> ATSCheckItem:
    """Verify that standard ATS-friendly section headers are present."""
    text_lower = text.lower()
    found = []
    missing = []

    for key, variants in ATS_FRIENDLY_HEADERS.items():
        if any(v in text_lower for v in variants):
            found.append(key)
        else:
            missing.append(key)

    # Core sections that ATS absolutely needs
    core = {"summary", "experience", "education", "skills"}
    core_missing = [m for m in missing if m in core]

    if not core_missing and len(found) >= 4:
        score = 100
        status = "pass"
        msg = f"Found {len(found)} standard sections including all core headers."
        sug = "All core ATS sections are present."
    elif not core_missing:
        score = 75
        status = "warning"
        msg = f"Core sections present but missing some optional headers: {', '.join(missing[:3])}."
        sug = f"Consider adding: {', '.join(missing[:3])}."
    else:
        score = max(0, 100 - len(core_missing) * 25)
        status = "fail" if len(core_missing) >= 2 else "warning"
        msg = f"Missing critical ATS sections: {', '.join(core_missing)}."
        sug = f"Add section headers for: {', '.join(core_missing)}."

    return ATSCheckItem(
        check_name="Section Headers",
        category="structure",
        status=status,
        score=score,
        message=msg,
        suggestion=sug,
        details={"found": found, "missing": missing},
    )


def _check_contact_info(text: str) -> ATSCheckItem:
    """Verify parseable contact information."""
    has_email = bool(EMAIL_PATTERN.search(text))
    has_phone = bool(PHONE_PATTERN.search(text[:500]))  # Usually at top
    has_linkedin = bool(LINKEDIN_PATTERN.search(text))
    has_github = bool(GITHUB_PATTERN.search(text))

    present = []
    if has_email: present.append("email")
    if has_phone: present.append("phone")
    if has_linkedin: present.append("LinkedIn")
    if has_github: present.append("GitHub")

    score = 0
    if has_email: score += 40
    if has_phone: score += 30
    if has_linkedin: score += 20
    if has_github: score += 10

    if score >= 70:
        status = "pass"
        msg = f"Contact info found: {', '.join(present)}."
        sug = "Contact details are well-structured for ATS parsing."
    elif score >= 40:
        status = "warning"
        missing = [m for m in ["email", "phone", "LinkedIn"] if m not in present]
        msg = f"Found {', '.join(present)} but missing: {', '.join(missing)}."
        sug = f"Add {missing[0]} to improve ATS contact parsing."
    else:
        status = "fail"
        msg = "No parseable contact information found."
        sug = "Add an email address and phone number at the top of your resume."

    return ATSCheckItem(
        check_name="Contact Information",
        category="structure",
        status=status,
        score=score,
        message=msg,
        suggestion=sug,
    )


def _check_date_formats(text: str) -> ATSCheckItem:
    """Check for consistent date formatting."""
    format_counts = {}
    for name, pattern in DATE_PATTERNS.items():
        matches = pattern.findall(text)
        if matches:
            format_counts[name] = len(matches)

    total_dates = sum(format_counts.values())
    unique_formats = len(format_counts)

    if total_dates == 0:
        return ATSCheckItem(
            check_name="Date Formats",
            category="formatting",
            status="warning",
            score=50,
            message="No dates detected in the resume.",
            suggestion="Add dates to experience and education sections for ATS parsing.",
        )

    if unique_formats <= 2:
        score = 90
        status = "pass"
        msg = f"Found {total_dates} dates using {unique_formats} consistent format(s)."
        sug = "Date formatting looks consistent."
    elif unique_formats == 3:
        score = 60
        status = "warning"
        msg = f"Found {total_dates} dates across {unique_formats} different formats."
        sug = "Standardise dates to a single format (e.g., 'Jan 2023 - Present')."
    else:
        score = 30
        status = "fail"
        msg = f"Found {total_dates} dates across {unique_formats} inconsistent formats."
        sug = "Use one consistent date format throughout. Recommended: 'Mon YYYY - Mon YYYY'."

    return ATSCheckItem(
        check_name="Date Formats",
        category="formatting",
        status=status,
        score=score,
        message=msg,
        suggestion=sug,
        details=format_counts,
    )


def _check_character_encoding(text: str) -> ATSCheckItem:
    """Detect problematic characters that break ATS parsing."""
    problems = PROBLEMATIC_CHARS.findall(text)
    # Filter out safe chars
    real_problems = [c for c in problems if c not in SAFE_CHARS]

    if len(real_problems) == 0:
        return ATSCheckItem(
            check_name="Character Encoding",
            category="encoding",
            status="pass",
            score=100,
            message="No problematic characters detected.",
            suggestion="Character encoding looks clean.",
        )

    unique_problems = list(set(real_problems))
    severity = "warning" if len(real_problems) <= 5 else "fail"
    score = max(0, 100 - len(real_problems) * 5)

    return ATSCheckItem(
        check_name="Character Encoding",
        category="encoding",
        status=severity,
        score=score,
        message=f"Found {len(real_problems)} problematic characters ({len(unique_problems)} unique).",
        suggestion="Replace smart quotes with straight quotes, and remove invisible Unicode characters.",
        details={"count": len(real_problems), "unique": len(unique_problems)},
    )


def _check_keyword_placement(text: str) -> ATSCheckItem:
    """Check if key terms appear in the top portion of the resume."""
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if not lines:
        return ATSCheckItem(
            check_name="Keyword Placement",
            category="keywords",
            status="warning",
            score=30,
            message="No content to analyse.",
            suggestion="Add resume content.",
        )

    top_quarter = lines[:max(1, len(lines) // 4)]
    top_text = " ".join(top_quarter).lower()

    # Check for key professional terms in the top quarter
    key_terms = ["experience", "skills", "developer", "engineer", "analyst",
                 "manager", "python", "javascript", "react", "java", "sql"]
    found_in_top = [t for t in key_terms if t in top_text]
    total_in_text = [t for t in key_terms if t in text.lower()]

    if total_in_text:
        ratio = len(found_in_top) / len(total_in_text)
    else:
        ratio = 0

    if ratio >= 0.5:
        score = 90
        status = "pass"
        msg = f"{len(found_in_top)} key terms found in the top quarter."
        sug = "Good keyword placement for ATS scanning."
    elif ratio >= 0.3:
        score = 65
        status = "warning"
        msg = f"Only {len(found_in_top)} of {len(total_in_text)} key terms appear early."
        sug = "Move your most relevant skills and role title to the top of the resume."
    else:
        score = 40
        status = "fail"
        msg = f"Only {len(found_in_top)} key terms found in the top quarter."
        sug = "ATS systems weight the top of the document heavily. Lead with your strongest keywords."

    return ATSCheckItem(
        check_name="Keyword Placement",
        category="keywords",
        status=status,
        score=score,
        message=msg,
        suggestion=sug,
    )


def _check_table_layout(text: str) -> ATSCheckItem:
    """Detect table or multi-column layouts that confuse ATS."""
    tab_heavy = sum(1 for line in text.splitlines() if TAB_HEAVY_LINE.search(line))
    pipe_tables = sum(1 for p in MULTI_COLUMN_INDICATORS if p.search(text))

    issues = tab_heavy + pipe_tables

    if issues == 0:
        return ATSCheckItem(
            check_name="Layout Compatibility",
            category="formatting",
            status="pass",
            score=100,
            message="No table or multi-column layout detected.",
            suggestion="Clean single-column layout is ATS-friendly.",
        )

    score = max(0, 100 - issues * 15)
    status = "warning" if issues <= 2 else "fail"

    return ATSCheckItem(
        check_name="Layout Compatibility",
        category="formatting",
        status=status,
        score=score,
        message=f"Detected {issues} potential table/column layout indicators.",
        suggestion="Use a single-column layout. Tables and columns garble text in many ATS systems.",
        details={"tab_heavy_lines": tab_heavy, "pipe_tables": pipe_tables},
    )


def _check_length(text: str) -> ATSCheckItem:
    """Check resume length against ATS preferences."""
    words = len(text.split())
    lines = [l for l in text.splitlines() if l.strip()]

    if words < 200:
        score = 40
        status = "warning"
        msg = f"Resume is very short ({words} words, ~{max(1, words // 400)} pages)."
        sug = "Expand to at least 300-500 words for adequate ATS scoring."
    elif words <= 700:
        score = 100
        status = "pass"
        msg = f"Good length ({words} words, ~{max(1, words // 400)} pages)."
        sug = "Length is within the optimal range for ATS parsing."
    elif words <= 1000:
        score = 75
        status = "warning"
        msg = f"Slightly long ({words} words, ~{words // 400} pages)."
        sug = "Consider trimming to under 700 words for faster ATS processing."
    else:
        score = 50
        status = "fail"
        msg = f"Very long ({words} words, ~{words // 400} pages)."
        sug = "Overly long resumes may be truncated by ATS. Keep to 2 pages max."

    return ATSCheckItem(
        check_name="Resume Length",
        category="content",
        status=status,
        score=score,
        message=msg,
        suggestion=sug,
        details={"words": words, "lines": len(lines)},
    )


def _check_education_parseability(text: str) -> ATSCheckItem:
    """Check if education section is parseable by ATS."""
    text_lower = text.lower()
    has_education = any(
        h in text_lower
        for h in ["education", "academic", "university", "college", "degree"]
    )

    if not has_education:
        return ATSCheckItem(
            check_name="Education Section",
            category="structure",
            status="warning",
            score=50,
            message="No education section detected.",
            suggestion="Add an 'Education' section with degree, institution, and graduation year.",
        )

    # Check for common education keywords
    has_degree = bool(re.search(
        r"bachelor|master|phd|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?|associate|diploma",
        text_lower,
    ))
    has_institution = bool(re.search(
        r"university|college|institute|school|academy",
        text_lower,
    ))
    has_year = bool(re.search(r"(?:19|20)\d{2}", text))

    score = 0
    if has_degree: score += 40
    if has_institution: score += 35
    if has_year: score += 25

    if score >= 80:
        status = "pass"
        msg = "Education section is well-structured for ATS parsing."
        sug = "Education details are parseable."
    elif score >= 50:
        status = "warning"
        msg = "Education section present but may be missing key details."
        sug = "Include degree type, institution name, and graduation year."
    else:
        status = "fail"
        msg = "Education section exists but lacks key details."
        sug = "Add degree, institution, and year in a standard format."

    return ATSCheckItem(
        check_name="Education Section",
        category="structure",
        status=status,
        score=score,
        message=msg,
        suggestion=sug,
    )


def _check_skills_structure(text: str) -> ATSCheckItem:
    """Check if skills section is parseable."""
    text_lower = text.lower()
    has_skills = any(
        h in text_lower
        for h in ["skills", "technologies", "competencies", "proficiencies", "tech stack"]
    )

    if not has_skills:
        return ATSCheckItem(
            check_name="Skills Section",
            category="structure",
            status="warning",
            score=50,
            message="No dedicated skills section detected.",
            suggestion="Add a 'Skills' section with a clear list of technologies.",
        )

    # Find the skills section and check its structure
    skills_header = None
    for h in ["skills", "technical skills", "competencies", "proficiencies"]:
        idx = text_lower.find(h)
        if idx >= 0:
            skills_header = idx
            break

    if skills_header is None:
        return ATSCheckItem(
            check_name="Skills Section",
            category="structure",
            status="warning",
            score=50,
            message="Skills header found but could not locate section.",
            suggestion="Ensure skills are listed under a clear 'Skills' heading.",
        )

    section_text = text[skills_header:skills_header + 500]

    # Check for comma-separated or bullet-list format
    has_commas = "," in section_text
    has_bullets = bool(re.search(r"[-•*▪▸]", section_text))
    has_line_items = len([l for l in section_text.split("\n") if l.strip()]) >= 3

    if has_commas or has_bullets or has_line_items:
        score = 90
        status = "pass"
        msg = "Skills section uses a parseable format."
        sug = "Skills structure looks good for ATS."
    else:
        score = 60
        status = "warning"
        msg = "Skills section format may be hard for ATS to parse."
        sug = "List skills as comma-separated values or bullet points."

    return ATSCheckItem(
        check_name="Skills Section",
        category="structure",
        status=status,
        score=score,
        message=msg,
        suggestion=sug,
    )


def _check_file_purity(text: str) -> ATSCheckItem:
    """Check for signs of image-based or poorly extracted text."""
    # Very short lines with no spaces might indicate image extraction issues
    lines = [l for l in text.splitlines() if l.strip()]
    short_lines = sum(1 for l in lines if len(l.strip()) < 5 and " " not in l.strip())

    ratio = short_lines / max(1, len(lines))

    if ratio < 0.05:
        score = 95
        status = "pass"
        msg = "Text extraction looks clean."
        sug = "No signs of image-based or garbled content."
    elif ratio < 0.15:
        score = 70
        status = "warning"
        msg = f"Found {short_lines} very short lines that may indicate extraction issues."
        sug = "Some text may not have been extracted cleanly. Verify the PDF is text-based."
    else:
        score = 40
        status = "fail"
        msg = f"Found {short_lines} lines suggesting poor text extraction."
        sug = "This may be a scanned image PDF. Export a text-based PDF instead."

    return ATSCheckItem(
        check_name="Text Purity",
        category="encoding",
        status=status,
        score=score,
        message=msg,
        suggestion=sug,
    )


# ── Scoring & summary ─────────────────────────────────────────────────────

def _compute_overall(checks: List[ATSCheckItem]) -> Tuple[int, Dict[str, int]]:
    """Compute overall score and per-category scores."""
    category_scores: Dict[str, List[int]] = {}
    for check in checks:
        category_scores.setdefault(check.category, []).append(check.score)

    cat_avgs = {
        cat: round(sum(scores) / len(scores))
        for cat, scores in category_scores.items()
    }

    # Weighted average
    weights = {
        "structure": 0.30,
        "formatting": 0.25,
        "keywords": 0.20,
        "encoding": 0.15,
        "content": 0.10,
    }
    overall = 0
    total_weight = 0
    for cat, avg in cat_avgs.items():
        w = weights.get(cat, 0.1)
        overall += avg * w
        total_weight += w

    if total_weight > 0:
        overall = round(overall / total_weight)

    return overall, cat_avgs


def _grade_for(score: int) -> str:
    if score >= 95: return "A+"
    if score >= 85: return "A"
    if score >= 75: return "B+"
    if score >= 65: return "B"
    if score >= 50: return "C"
    if score >= 35: return "D"
    return "F"


def _estimate_ats_pass(overall: int, checks: List[ATSCheckItem]) -> int:
    """Estimate the probability of passing ATS screening."""
    failures = sum(1 for c in checks if c.status == "fail")
    warnings = sum(1 for c in checks if c.status == "warning")
    base = overall
    base -= failures * 8
    base -= warnings * 3
    return max(10, min(98, base))


def _generate_summary(overall: int, grade: str, checks: List[ATSCheckItem]) -> str:
    failures = [c for c in checks if c.status == "fail"]
    warnings = [c for c in checks if c.status == "warning"]

    if overall >= 85:
        opening = "Excellent ATS compatibility!"
    elif overall >= 70:
        opening = "Good ATS compatibility with minor issues."
    elif overall >= 50:
        opening = "Moderate ATS compatibility — several fixes needed."
    else:
        opening = "Poor ATS compatibility — significant improvements required."

    parts = [f"{opening} Overall grade: {grade} ({overall}/100)."]

    if failures:
        names = [c.check_name for c in failures[:3]]
        parts.append(f"Critical issues: {', '.join(names)}.")
    elif warnings:
        names = [c.check_name for c in warnings[:3]]
        parts.append(f"Minor warnings: {', '.join(names)}.")

    return " ".join(parts)


# ── Public API ────────────────────────────────────────────────────────────

def check_ats_compatibility(resume_text: str) -> ATSCompatibilityResult:
    """Analyse resume text for ATS compatibility.

    Args:
        resume_text: Full extracted text of a resume.

    Returns:
        An ``ATSCompatibilityResult`` with per-check results and scores.
    """
    checks = [
        _check_section_headers(resume_text),
        _check_contact_info(resume_text),
        _check_date_formats(resume_text),
        _check_character_encoding(resume_text),
        _check_keyword_placement(resume_text),
        _check_table_layout(resume_text),
        _check_length(resume_text),
        _check_education_parseability(resume_text),
        _check_skills_structure(resume_text),
        _check_file_purity(resume_text),
    ]

    overall, category_scores = _compute_overall(checks)
    grade = _grade_for(overall)
    ats_pass = _estimate_ats_pass(overall, checks)
    summary = _generate_summary(overall, grade, checks)

    # Top fixes: failures first, then warnings, sorted by score ascending
    top_fixes = sorted(
        [c for c in checks if c.status in ("fail", "warning")],
        key=lambda c: (0 if c.status == "fail" else 1, c.score),
    )[:5]

    return ATSCompatibilityResult(
        overall_score=overall,
        grade=grade,
        checks=checks,
        category_scores=category_scores,
        estimated_ats_pass_rate=ats_pass,
        top_fixes=top_fixes,
        summary=summary,
    )
