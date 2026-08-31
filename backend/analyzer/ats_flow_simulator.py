"""
ATS Reading Flow Simulator and Section Reorderer.

This module evaluates the top-to-bottom parsing sequence of a resume,
checking for logical section ordering, visual weight distribution, and
"dead zones" where ATS parsers typically drop context.
"""

import re
from typing import List, Dict, Any, Tuple

# Ideal ATS parsing order (highest priority first)
IDEAL_SECTION_ORDER = [
    "contact",
    "summary",
    "experience",
    "education",
    "skills",
    "projects",
    "certifications",
    "awards",
]

# Common variations of section headers
SECTION_PATTERNS = {
    "contact": [r"contact", r"profile", r"personal details", r"information"],
    "summary": [r"summary", r"objective", r"about me", r"professional profile"],
    "experience": [
        r"experience",
        r"work history",
        r"employment",
        r"professional experience",
    ],
    "education": [
        r"education",
        r"academic background",
        r"qualifications",
        r"university",
    ],
    "skills": [
        r"skills",
        r"technical skills",
        r"competencies",
        r"expertise",
        r"technologies",
    ],
    "projects": [r"projects", r"portfolio", r"personal projects", r"academic projects"],
    "certifications": [r"certifications", r"licenses", r"credentials"],
    "awards": [r"awards", r"honors", r"achievements", r"recognitions"],
}


def identify_resume_sections(resume_text: str) -> List[Dict[str, Any]]:
    """
    Identifies sections in the resume and their approximate order.

    Args:
        resume_text (str): The raw resume text.

    Returns:
        List[Dict[str, Any]]: A list of detected sections with their order and content length.
    """
    lines = resume_text.split("\n")
    sections = []
    current_section = "unknown"
    current_content_length = 0

    for line in lines:
        cleaned_line = line.strip()
        if not cleaned_line:
            continue

        # Check if line is a section header
        is_header = False
        for section_name, patterns in SECTION_PATTERNS.items():
            if any(
                re.search(rf"^\s*{pattern}\s*$", cleaned_line, re.IGNORECASE)
                for pattern in patterns
            ):
                # Save previous section if it had content
                if current_section != "unknown" and current_content_length > 0:
                    sections.append(
                        {
                            "name": current_section,
                            "content_length": current_content_length,
                            "has_dead_zone": current_content_length
                            > 500,  # Heuristic for dead zone
                        }
                    )
                current_section = section_name
                current_content_length = 0
                is_header = True
                break

        if not is_header:
            current_content_length += len(cleaned_line)

    # Append the last section
    if current_section != "unknown" and current_content_length > 0:
        sections.append(
            {
                "name": current_section,
                "content_length": current_content_length,
                "has_dead_zone": current_content_length > 500,
            }
        )

    return sections


def calculate_flow_score(sections: List[Dict[str, Any]]) -> int:
    """
    Calculates a flow score based on adherence to ideal ATS parsing order.

    Args:
        sections (List[Dict[str, Any]]): The list of detected sections.

    Returns:
        int: A score from 0 to 100 representing structural flow quality.
    """
    if not sections:
        return 100  # Empty resume is technically perfectly ordered

    score = 100
    last_ideal_index = -1

    for section in sections:
        section_name = section["name"]
        if section_name in IDEAL_SECTION_ORDER:
            current_ideal_index = IDEAL_SECTION_ORDER.index(section_name)

            # Penalty for out-of-order sections
            if current_ideal_index < last_ideal_index:
                score -= 15

            last_ideal_index = current_ideal_index
        else:
            # Minor penalty for unrecognized sections interrupting flow
            score -= 5

        # Penalty for dead zones (huge blocks of text without clear structure)
        if section.get("has_dead_zone"):
            score -= 10

    return max(0, score)


def generate_reordering_suggestions(sections: List[Dict[str, Any]]) -> List[str]:
    """
    Generates actionable suggestions for improving resume section order.

    Args:
        sections (List[Dict[str, Any]]): The list of detected sections.

    Returns:
        List[str]: A list of human-readable suggestions.
    """
    suggestions = []
    section_names = [s["name"] for s in sections]

    # Check for critical missing sections
    if "contact" not in section_names:
        suggestions.append(
            "Add a clear 'Contact' section at the very top of your resume."
        )
    if "summary" not in section_names and "experience" in section_names:
        suggestions.append(
            "Consider adding a 'Summary' or 'Objective' section before your Experience."
        )

    # Check for ordering issues
    if "skills" in section_names and "experience" in section_names:
        skills_idx = section_names.index("skills")
        exp_idx = section_names.index("experience")
        if skills_idx < exp_idx:
            suggestions.append(
                "Move your 'Skills' section after 'Experience' for better ATS parsing flow."
            )

    # Check for dead zones
    dead_zones = [s["name"] for s in sections if s.get("has_dead_zone")]
    if dead_zones:
        suggestions.append(
            f"Break up large blocks of text in the '{dead_zones[0].title()}' section using bullet points to avoid ATS parsing dead zones."
        )

    if not suggestions:
        suggestions.append(
            "Your resume structure follows excellent ATS parsing conventions."
        )

    return suggestions


def simulate_ats_flow(resume_text: str) -> Dict[str, Any]:
    """
    Main function to simulate ATS reading flow and provide reordering advice.

    Args:
        resume_text (str): The full text of the resume.

    Returns:
        Dict[str, Any]: A comprehensive report including section order, flow score, and suggestions.
    """
    if not resume_text or not isinstance(resume_text, str):
        return {
            "sections": [],
            "flow_score": 100,
            "suggestions": ["Resume text is empty."],
        }

    sections = identify_resume_sections(resume_text)
    flow_score = calculate_flow_score(sections)
    suggestions = generate_reordering_suggestions(sections)

    return {"sections": sections, "flow_score": flow_score, "suggestions": suggestions}
