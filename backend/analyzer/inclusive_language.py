"""
Inclusive Language and Unconscious Bias Detector for Resumes.

This module scans resume text for unconscious bias, gender-coded language,
ageism indicators, and culturally exclusive terms, suggesting neutral,
inclusive alternatives to ensure broad appeal and ATS compliance.
"""

import re
from typing import List, Dict, Any, Tuple

# Comprehensive dictionaries of biased phrases mapped to inclusive alternatives
GENDER_CODED_WORDS = {
    r"\baggressive\b": "driven, assertive, determined",
    r"\bninja\b": "expert, specialist, professional",
    r"\brockstar\b": "high-performer, expert, specialist",
    r"\bdominant\b": "leading, primary, key",
    r"\bobjective\b": "analytical, structured, focused",
    r"\bnurturing\b": "supportive, collaborative, developmental",
    r"\bdependent\b": "collaborative, team-oriented, cooperative",
    r"\bcompetitive\b": "ambitious, goal-oriented, driven",
}

AGE_BIASED_PHRASES = {
    r"\bdigital native\b": "technologically proficient, digitally fluent",
    r"\byoung and energetic\b": "enthusiastic, dynamic, motivated",
    r"\brecent graduate\b": "early-career professional, emerging talent",
    r"\bseasoned veteran\b": "experienced professional, subject matter expert",
    r"\bolder worker\b": "experienced professional, senior contributor",
}

ABLEIST_LANGUAGE = {
    r"\bcrazy\b": "remarkable, exceptional, innovative",
    r"\blame\b": "suboptimal, ineffective, flawed",
    r"\bblind to\b": "unaware of, overlooking",
    r"\bcripple\b": "hinder, impede, restrict",
    r"\bnormal\b": "standard, typical, expected",
    r"\binsane\b": "extraordinary, exceptional, remarkable",
}

CULTURALLY_EXCLUSIVE_TERMS = {
    r"\bculture fit\b": "culture add, values alignment",
    r"\bnative English speaker\b": "fluent in English, proficient in English",
    r"\bAmerican-style\b": "standard, conventional",
}

# Combine all dictionaries for unified processing
BIAS_DICTIONARY = {
    **GENDER_CODED_WORDS,
    **AGE_BIASED_PHRASES,
    **ABLEIST_LANGUAGE,
    **CULTURALLY_EXCLUSIVE_TERMS,
}

# Categorize the dictionary for detailed reporting
CATEGORY_MAP = {
    "gender_coded": GENDER_CODED_WORDS,
    "age_biased": AGE_BIASED_PHRASES,
    "ableist": ABLEIST_LANGUAGE,
    "culturally_exclusive": CULTURALLY_EXCLUSIVE_TERMS,
}


def detect_biased_language(text: str) -> List[Dict[str, Any]]:
    """
    Detects biased language in the provided text.

    Args:
        text (str): The resume text to analyze.

    Returns:
        List[Dict[str, Any]]: A list of detected biased phrases with their
                              positions, categories, and inclusive suggestions.
    """
    if not text or not isinstance(text, str):
        return []

    detections = []
    text_lower = text.lower()

    # Iterate through each category to find matches and classify them
    for category_name, pattern_dict in CATEGORY_MAP.items():
        for pattern, suggestion in pattern_dict.items():
            # Use re.finditer to get exact positions of matches
            matches = re.finditer(pattern, text_lower)
            for match in matches:
                original_phrase = text[match.start() : match.end()]
                detections.append(
                    {
                        "phrase": original_phrase,
                        "start": match.start(),
                        "end": match.end(),
                        "category": category_name.replace("_", " ").title(),
                        "suggestion": suggestion,
                        "severity": (
                            "medium"
                            if category_name in ["gender_coded", "culturally_exclusive"]
                            else "high"
                        ),
                    }
                )

    # Sort detections by their starting position in the text
    detections.sort(key=lambda x: x["start"])
    return detections


def generate_inclusive_text(text: str, detections: List[Dict[str, Any]]) -> str:
    """
    Generates an inclusive version of the text by replacing biased phrases.

    Args:
        text (str): The original resume text.
        detections (List[Dict[str, Any]]): The list of detected biased phrases.

    Returns:
        str: The text with inclusive replacements applied.
    """
    if not detections:
        return text

    inclusive_text = text
    # Process replacements in reverse order to maintain correct string indices
    for detection in reversed(detections):
        original = detection["phrase"]
        # Take the first suggested alternative for automatic replacement
        suggestion = detection["suggestion"].split(",")[0].strip()

        # Preserve original casing (capitalize if original was capitalized)
        if original and original[0].isupper():
            suggestion = suggestion.capitalize()

        inclusive_text = (
            inclusive_text[: detection["start"]]
            + suggestion
            + inclusive_text[detection["end"] :]
        )

    return inclusive_text


def analyze_resume_inclusivity(resume_text: str) -> Dict[str, Any]:
    """
    Main function to analyze resume text for inclusivity and bias.

    Args:
        resume_text (str): The full text of the resume.

    Returns:
        Dict[str, Any]: A comprehensive report including detections,
                        an inclusive rewrite, and an overall inclusivity score.
    """
    detections = detect_biased_language(resume_text)
    inclusive_text = generate_inclusive_text(resume_text, detections)

    # Calculate a simple inclusivity score (100 = perfectly inclusive)
    # Deduct points based on severity and count of issues
    base_score = 100
    for detection in detections:
        if detection["severity"] == "high":
            base_score -= 10
        else:
            base_score -= 5

    final_score = max(0, base_score)

    return {
        "detections": detections,
        "inclusive_text": inclusive_text,
        "inclusivity_score": final_score,
        "total_issues": len(detections),
    }
