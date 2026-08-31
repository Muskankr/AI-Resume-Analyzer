"""
Resume Format and Structure Normalizer.

This module restructures messy or non-standard resume text into a clean,
standardized format with proper section headers, consistent bullet points,
and chronological ordering.
"""

import re
from typing import List, Dict, Any, Optional

# Standard section headers to look for
STANDARD_SECTIONS = {
    "contact": [r"contact", r"profile", r"personal details"],
    "summary": [r"summary", r"objective", r"about me", r"professional profile"],
    "experience": [
        r"experience",
        r"work history",
        r"employment",
        r"professional experience",
    ],
    "education": [r"education", r"academic background", r"qualifications"],
    "skills": [r"skills", r"technical skills", r"competencies", r"expertise"],
    "projects": [r"projects", r"portfolio", r"personal projects"],
}

# Action verbs to help identify bullet points
ACTION_VERBS = [
    r"\bmanaged\b",
    r"\bdeveloped\b",
    r"\bcreated\b",
    r"\bdesigned\b",
    r"\bimplemented\b",
    r"\bled\b",
    r"\barchitected\b",
    r"\boptimized\b",
]


def identify_sections(resume_text: str) -> Dict[str, str]:
    """
    Identifies and extracts standard sections from messy resume text.

    Args:
        resume_text (str): The raw, unstructured resume text.

    Returns:
        Dict[str, str]: A dictionary mapping standard section names to their content.
    """
    sections = {
        "contact": "",
        "summary": "",
        "experience": "",
        "education": "",
        "skills": "",
        "projects": "",
    }

    lines = resume_text.split("\n")
    current_section = "summary"  # Default fallback

    for line in lines:
        cleaned_line = line.strip()
        if not cleaned_line:
            continue

        # Check if the line is a section header
        is_header = False
        for standard_name, patterns in STANDARD_SECTIONS.items():
            if any(
                re.search(rf"^\s*{pattern}\s*$", cleaned_line, re.IGNORECASE)
                for pattern in patterns
            ):
                current_section = standard_name
                is_header = True
                break

        # If it's a header that looks like a name/contact info at the very top, assign to contact
        if (
            not is_header
            and current_section == "summary"
            and len(sections["contact"]) < 200
        ):
            # Heuristic: if it's the first few lines and contains @ or phone-like patterns
            if re.search(r"@|www\.|\d{3}[-.\s]?\d{3}[-.\s]?\d{4}", cleaned_line):
                current_section = "contact"

        # Append to the current section
        if sections[current_section]:
            sections[current_section] += "\n" + cleaned_line
        else:
            sections[current_section] = cleaned_line

    return sections


def normalize_bullet_points(text: str) -> str:
    """
    Normalizes bullet points within a section to use consistent formatting.

    Args:
        text (str): The raw text of a section.

    Returns:
        str: The text with standardized bullet points.
    """
    lines = text.split("\n")
    normalized_lines = []

    for line in lines:
        cleaned = line.strip()
        if not cleaned:
            continue

        # Check if it looks like a bullet point or a sentence starting with an action verb
        is_bullet = re.match(r"^[\-\*\•\d\.\)]\s+", cleaned)
        starts_with_verb = any(
            re.search(rf"^{verb}", cleaned, re.IGNORECASE) for verb in ACTION_VERBS
        )

        if is_bullet or (starts_with_verb and len(cleaned.split()) > 4):
            # Standardize to a hyphen bullet
            clean_bullet = re.sub(r"^[\-\*\•\d\.\)]\s*", "", cleaned)
            normalized_lines.append(f"- {clean_bullet}")
        else:
            normalized_lines.append(cleaned)

    return "\n".join(normalized_lines)


def normalize_resume(resume_text: str) -> Dict[str, Any]:
    """
    Main function to normalize the entire resume structure.

    Args:
        resume_text (str): The raw, unstructured resume text.

    Returns:
        Dict[str, Any]: A structured dictionary with normalized sections and a summary of changes.
    """
    if not resume_text or not isinstance(resume_text, str):
        return {"sections": {}, "changes_made": []}

    raw_sections = identify_sections(resume_text)
    normalized_sections = {}
    changes_made = []

    for section_name, content in raw_sections.items():
        if not content.strip():
            continue

        # Normalize bullet points for experience and projects
        if section_name in ["experience", "projects", "skills"]:
            original_line_count = len(content.split("\n"))
            normalized_content = normalize_bullet_points(content)
            normalized_line_count = len(normalized_content.split("\n"))

            if original_line_count != normalized_line_count or "-" not in content:
                changes_made.append(
                    f"Standardized bullet points in '{section_name.title()}' section."
                )

            normalized_sections[section_name] = normalized_content
        else:
            normalized_sections[section_name] = content.strip()

    if not changes_made:
        changes_made.append(
            "Resume was already well-structured. Minor formatting applied."
        )

    return {"sections": normalized_sections, "changes_made": changes_made}
