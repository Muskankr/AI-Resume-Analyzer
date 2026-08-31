"""
Dynamic Cover Letter Optimization and Alignment Scorer.

This module evaluates a user's draft cover letter against a target job
description, scoring the alignment, highlighting missing keywords, and
suggesting paragraph-level rewrites for better impact.
"""

import re
from typing import List, Dict, Any, Tuple

# Common action verbs and strong phrases for cover letters
STRONG_PHRASES = [
    r"\bspearheaded\b",
    r"\barchitected\b",
    r"\bdelivered\b",
    r"\boptimized\b",
    r"\bproven track record\b",
    r"\benthusiastic about\b",
    r"\beager to contribute\b",
]

WEAK_PHRASES = [
    r"\bI think\b",
    r"\bI believe\b",
    r"\bjust\b",
    r"\bonly\b",
    r"\btrying to\b",
    r"\bI want to learn\b",
    r"\bI hope to get\b",
]


def extract_keywords(text: str) -> List[str]:
    """
    Extracts potential keywords from text (simplified heuristic).
    """
    # Remove common stop words and short words
    stop_words = {
        "and",
        "the",
        "is",
        "in",
        "at",
        "which",
        "on",
        "for",
        "with",
        "to",
        "of",
        "a",
        "an",
    }
    words = re.findall(r"\b\w{4,}\b", text.lower())
    return list(set([w for w in words if w not in stop_words]))


def calculate_alignment_score(
    cover_letter: str, job_description: str
) -> Dict[str, Any]:
    """
    Calculates the alignment score between a cover letter and job description.

    Args:
        cover_letter (str): The user's draft cover letter.
        job_description (str): The target job description.

    Returns:
        Dict[str, Any]: Alignment score, missing keywords, and matched keywords.
    """
    cl_keywords = extract_keywords(cover_letter)
    jd_keywords = extract_keywords(job_description)

    # Focus on more specific/longer keywords from JD
    important_jd_keywords = [kw for kw in jd_keywords if len(kw) > 5]

    if not important_jd_keywords:
        return {
            "score": 50,
            "matched_keywords": [],
            "missing_keywords": [],
            "feedback": "Job description is too short to extract meaningful keywords.",
        }

    matched = [kw for kw in important_jd_keywords if kw in cl_keywords]
    missing = [kw for kw in important_jd_keywords if kw not in cl_keywords]

    # Calculate score based on match percentage and length
    match_ratio = (
        len(matched) / len(important_jd_keywords) if important_jd_keywords else 0
    )
    base_score = int(match_ratio * 100)

    # Bonus for strong phrases, penalty for weak phrases
    cl_lower = cover_letter.lower()
    strong_count = sum(1 for phrase in STRONG_PHRASES if re.search(phrase, cl_lower))
    weak_count = sum(1 for phrase in WEAK_PHRASES if re.search(phrase, cl_lower))

    final_score = max(0, min(100, base_score + (strong_count * 5) - (weak_count * 10)))

    return {
        "score": final_score,
        "matched_keywords": matched[:10],  # Limit to top 10
        "missing_keywords": missing[:10],
        "feedback": _generate_alignment_feedback(
            final_score, len(matched), len(important_jd_keywords)
        ),
    }


def _generate_alignment_feedback(score: int, matched: int, total: int) -> str:
    """Generates a summary feedback message based on the alignment score."""
    if score >= 80:
        return "Excellent alignment! Your cover letter strongly reflects the job requirements."
    elif score >= 60:
        return f"Good alignment. You matched {matched} out of {total} key terms. Consider adding a few more specific keywords from the job description."
    else:
        return f"Low alignment. You only matched {matched} out of {total} key terms. Significant revision is needed to tailor this to the role."


def suggest_paragraph_rewrites(
    cover_letter: str, missing_keywords: List[str]
) -> List[Dict[str, Any]]:
    """
    Suggests paragraph-level rewrites to incorporate missing keywords.

    Args:
        cover_letter (str): The user's draft cover letter.
        missing_keywords (List[str]): Keywords from the JD not found in the cover letter.

    Returns:
        List[Dict[str, Any]]: List of suggestions with the target paragraph and rewrite idea.
    """
    suggestions = []
    paragraphs = [p.strip() for p in cover_letter.split("\n\n") if p.strip()]

    if not missing_keywords or not paragraphs:
        return suggestions

    # Suggest adding missing keywords to the body paragraphs (skip greeting/sign-off if possible)
    target_paragraphs = paragraphs[1:-1] if len(paragraphs) > 2 else paragraphs

    for i, para in enumerate(target_paragraphs):
        if len(para) < 50:
            continue

        # Pick a missing keyword relevant to the paragraph (simplified: just pick the first available)
        keyword_to_add = missing_keywords[0] if missing_keywords else "relevant skills"

        suggestions.append(
            {
                "paragraph_index": i + 1,
                "original_snippet": para[:100] + "..." if len(para) > 100 else para,
                "suggestion": f"Consider weaving in the keyword '{keyword_to_add}' here. For example: 'In my previous role, I utilized {keyword_to_add} to drive measurable results...'",
                "missing_keyword": keyword_to_add,
            }
        )

        # Remove the suggested keyword from the missing list to avoid repetition
        if keyword_to_add in missing_keywords:
            missing_keywords.remove(keyword_to_add)

        if len(suggestions) >= 3:  # Limit to 3 suggestions
            break

    return suggestions
