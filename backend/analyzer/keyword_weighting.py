"""
Job Description Keyword Weighting and Priority Matrix.

This module analyzes the job description to assign weights to keywords
(e.g., "must-have" vs. "nice-to-have") based on frequency, context modifiers,
and positioning, then maps these to the resume to generate a priority matrix.
"""

import re
from typing import List, Dict, Any, Set

# Modifiers that indicate high importance (must-have)
CRITICAL_MODIFIERS = [
    r"\bmust have\b",
    r"\brequired\b",
    r"\bessential\b",
    r"\bmandatory\b",
    r"\bminimum qualification\b",
    r"\bexpertise in\b",
    r"\bdeep knowledge of\b",
]

# Modifiers that indicate lower importance (nice-to-have)
PREFERRED_MODIFIERS = [
    r"\bpreferred\b",
    r"\bnice to have\b",
    r"\bplus\b",
    r"\bfamiliarity with\b",
    r"\bbasic understanding of\b",
    r"\bexposure to\b",
]

# Common technical and soft skills to look for (simplified dictionary)
COMMON_SKILLS = [
    "python",
    "java",
    "javascript",
    "react",
    "node.js",
    "sql",
    "aws",
    "docker",
    "kubernetes",
    "machine learning",
    "agile",
    "leadership",
    "communication",
    "project management",
    "data analysis",
    "typescript",
    "git",
    "ci/cd",
]


def extract_weighted_keywords(jd_text: str) -> Dict[str, int]:
    """
    Extracts keywords from the JD and assigns weights based on context modifiers.

    Args:
        jd_text (str): The job description text.

    Returns:
        Dict[str, int]: A dictionary mapping keywords to their importance weight (1-3).
    """
    jd_lower = jd_text.lower()
    keyword_weights = {}

    # Split JD into sentences for context analysis
    sentences = re.split(r"(?<=[.!?])\s+", jd_lower)

    for skill in COMMON_SKILLS:
        weight = 1  # Default weight (nice-to-have)

        for sentence in sentences:
            if skill in sentence:
                # Check for critical modifiers in the same sentence
                if any(
                    re.search(modifier, sentence) for modifier in CRITICAL_MODIFIERS
                ):
                    weight = 3  # Critical
                    break  # No need to check further, it's critical
                # Check for preferred modifiers
                elif any(
                    re.search(modifier, sentence) for modifier in PREFERRED_MODIFIERS
                ):
                    weight = max(weight, 2)  # Preferred

        if weight > 1 or skill in jd_lower:  # Only include if mentioned at all
            keyword_weights[skill] = weight

    return keyword_weights


def extract_resume_skills(resume_text: str) -> Set[str]:
    """
    Extracts skills present in the resume.

    Args:
        resume_text (str): The resume text.

    Returns:
        Set[str]: A set of skills found in the resume.
    """
    resume_lower = resume_text.lower()
    found_skills = set()

    for skill in COMMON_SKILLS:
        if skill in resume_lower:
            found_skills.add(skill)

    return found_skills


def generate_priority_matrix(jd_text: str, resume_text: str) -> Dict[str, Any]:
    """
    Generates a 2x2 priority matrix categorizing keywords.

    Args:
        jd_text (str): The job description text.
        resume_text (str): The resume text.

    Returns:
        Dict[str, Any]: A dictionary containing the four quadrants of the matrix.
    """
    jd_weights = extract_weighted_keywords(jd_text)
    resume_skills = extract_resume_skills(resume_text)

    matrix = {
        "critical_missing": [],  # Weight 3, not in resume
        "core_strengths": [],  # Weight 3, in resume
        "bonus_skills": [],  # Weight 1 or 2, in resume
        "irrelevant_or_missing": [],  # Weight 1 or 2, not in resume (or not in JD at all but in resume)
    }

    for skill, weight in jd_weights.items():
        if skill in resume_skills:
            if weight == 3:
                matrix["core_strengths"].append(skill)
            else:
                matrix["bonus_skills"].append(skill)
        else:
            if weight == 3:
                matrix["critical_missing"].append(skill)
            else:
                matrix["irrelevant_or_missing"].append(skill)

    # Add skills in resume but not in JD to irrelevant_or_missing (or could be a separate category)
    for skill in resume_skills:
        if skill not in jd_weights:
            matrix["irrelevant_or_missing"].append(skill)

    # Sort each category alphabetically for consistent display
    for key in matrix:
        matrix[key] = sorted(list(set(matrix[key])))

    return matrix
