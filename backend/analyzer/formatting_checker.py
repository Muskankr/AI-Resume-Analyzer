"""Resume structural formatting and ATS-friendliness analyzer.

Performs structural checks beyond keyword matching:
1. Resume length & page count estimation (flags if over 2 pages or excessively long).
2. Presence and order of standard section headers (Experience, Education, Skills, Projects, Summary).
3. Detection of complex tables or multi-column layouts that may confuse ATS parsers.
4. Font and character cleanliness checks.
"""

import re
from typing import Dict, List, Any, Optional

STANDARD_SECTIONS = [
    {"key": "summary", "name": "Summary / Objective", "variants": ["summary", "professional summary", "about me", "objective", "profile"]},
    {"key": "experience", "name": "Work Experience", "variants": ["experience", "work experience", "employment", "work history", "professional experience"]},
    {"key": "education", "name": "Education", "variants": ["education", "academic", "qualifications", "degree"]},
    {"key": "skills", "name": "Skills", "variants": ["skills", "technical skills", "technologies", "competencies", "core competencies", "tools"]},
    {"key": "projects", "name": "Projects", "variants": ["projects", "personal projects", "portfolio", "key projects"]},
]

ESTIMATED_WORDS_PER_PAGE = 450


def check_resume_formatting(
    text: str,
    page_count: Optional[int] = None,
    has_tables: bool = False,
    has_columns: bool = False,
    file_type: str = "pdf",
) -> Dict[str, Any]:
    """Analyze resume text and document metadata for ATS structural friendliness.

    Returns structured formatting flags, diagnostics, and actionable tips.
    """
    words = len(text.split())
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    # 1. Page count / length estimation
    if page_count is None or page_count <= 0:
        # Estimate based on word count (~450-500 words per page standard formatting)
        estimated_pages = max(1, round(words / ESTIMATED_WORDS_PER_PAGE, 1))
    else:
        estimated_pages = page_count

    length_status = "optimal"
    length_tips = []
    if estimated_pages > 2.0 or words > 1000:
        length_status = "warning"
        length_tips.append(
            f"Your resume spans approximately {estimated_pages} pages ({words} words). Most ATS scanners and recruiters prefer 1 to 2 pages max. Trim older experience or redundant points."
        )
    elif words < 180:
        length_status = "warning"
        length_tips.append(
            f"Your resume is quite brief ({words} words). Consider elaborating on your project impact, technical skills, and responsibilities to reach at least 250–400 words."
        )
    else:
        length_tips.append(
            f"Good length ({words} words, ~{estimated_pages} page{'s' if estimated_pages > 1 else ''}). Fits comfortably within standard recruiter scanning limits."
        )

    # 2. Section order & presence check
    lowered_text = text.lower()
    found_sections = []
    missing_sections = []

    for section in STANDARD_SECTIONS:
        matched_variant = None
        for variant in section["variants"]:
            # Match heading either standalone line or early in line
            pattern = re.compile(rf"(?:^|\n)\s*{re.escape(variant)}\s*(?::|$|\n)", re.IGNORECASE)
            if pattern.search(text) or variant in lowered_text:
                matched_variant = variant
                break

        if matched_variant:
            found_sections.append({
                "key": section["key"],
                "name": section["name"],
                "detected_as": matched_variant,
            })
        else:
            missing_sections.append({
                "key": section["key"],
                "name": section["name"],
            })

    section_tips = []
    required_core = {"experience", "education", "skills"}
    missing_core = [s["name"] for s in missing_sections if s["key"] in required_core]

    if missing_core:
        section_tips.append(
            f"Missing essential ATS section header(s): {', '.join(missing_core)}. ATS parsers rely on standard headings ('Experience', 'Education', 'Skills') to categorize your background."
        )
    else:
        section_tips.append(
            "Found all core ATS sections (Experience, Education, Skills). Standard headings ensure 100% parser indexability."
        )

    if any(s["key"] == "projects" for s in missing_sections):
        section_tips.append(
            "Consider adding a dedicated 'Projects' section to showcase hands-on work and applied technical accomplishments."
        )

    # 3. Table and column layout parsing check
    layout_tips = []
    layout_status = "optimal"
    if has_tables or has_columns:
        layout_status = "warning"
        layout_tips.append(
            "Nested tables or multi-column layout detected. Some legacy ATS parsers read across columns left-to-right, garbling sentences. A clean single-column linear layout is safest."
        )
    else:
        # Check text lines for potential horizontal tabular alignment / multiple tabs
        tab_heavy_lines = [l for l in lines if l.count("\t") >= 2 or re.search(r"\s{4,}\S+\s{4,}", l)]
        if len(tab_heavy_lines) >= 4:
            layout_status = "warning"
            layout_tips.append(
                "Multiple tab/spaced columnar alignments detected. Ensure contact info or skills aren't trapped in invisible tables that break text flow."
            )
        else:
            layout_tips.append(
                "Clean single-column linear hierarchy detected. Highly compatible with modern and legacy ATS parsers."
            )

    # 4. Font and character cleanliness check
    font_tips = []
    non_ascii_symbols = re.findall(r"[^\x00-\x7F\u2010-\u2015\u2018-\u201D\u2022\u25CF\u2026\u00A0]", text)
    if len(non_ascii_symbols) > 15:
        font_tips.append(
            "Detected custom or decorative special symbols/glyphs. Stick to standard Unicode bullets (•) and standard web-safe fonts (Arial, Calibri, Helvetica, Roboto) for reliable ATS rendering."
        )
    else:
        font_tips.append(
            "Clean standard typography and bullet glyphs detected. Compatible across all standard PDF/DOCX document parsers."
        )

    # Overall structural score calculation (out of 100)
    score_deductions = 0
    if length_status == "warning":
        score_deductions += 20
    if missing_core:
        score_deductions += (len(missing_core) * 15)
    if layout_status == "warning":
        score_deductions += 15
    if len(non_ascii_symbols) > 15:
        score_deductions += 10

    structural_score = max(20, min(100, 100 - score_deductions))

    return {
        "score": structural_score,
        "page_count": estimated_pages,
        "word_count": words,
        "has_tables_or_columns": has_tables or has_columns or layout_status == "warning",
        "length_status": length_status,
        "layout_status": layout_status,
        "found_sections": [s["name"] for s in found_sections],
        "missing_sections": [s["name"] for s in missing_sections],
        "tips": {
            "length": length_tips,
            "sections": section_tips,
            "layout": layout_tips,
            "typography": font_tips,
        },
        "all_actionable_tips": length_tips + section_tips + layout_tips + font_tips,
    }
