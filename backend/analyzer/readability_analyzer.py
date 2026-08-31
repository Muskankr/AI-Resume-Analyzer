"""
Resume Readability and Cognitive Load Analyzer.

This module evaluates sentence length, syllable density, passive voice ratio,
and jargon clustering to compute a "Cognitive Load Score," ensuring the resume
is easily skimmable by recruiters.
"""

import re
from typing import List, Dict, Any, Tuple

# Common complex jargon that might increase cognitive load (simplified)
JARGON_WORDS = [
    r"\bsynergy\b",
    r"\bparadigm shift\b",
    r"\bleverage\b",
    r"\butilize\b",
    r"\bholistic\b",
    r"\bdisruptive\b",
    r"\bideation\b",
    r"\bcore competencies\b",
]

# Passive voice indicators (simplified heuristic)
PASSIVE_INDICATORS = [
    r"\bwas\b",
    r"\bwere\b",
    r"\bbeen\b",
    r"\bbeing\b",
    r"\bis\b",
    r"\bare\b",
]


def count_syllables(word: str) -> int:
    """
    Estimates the number of syllables in a word.
    """
    word = word.lower()
    if len(word) <= 3:
        return 1

    vowels = "aeiouy"
    count = 0
    if word[0] in vowels:
        count += 1

    for index in range(1, len(word)):
        if word[index] in vowels and word[index - 1] not in vowels:
            count += 1

    if word.endswith("e"):
        count -= 1

    if count == 0:
        count += 1

    return count


def analyze_sentence(sentence: str) -> Dict[str, Any]:
    """
    Analyzes a single sentence for readability metrics.

    Args:
        sentence (str): The sentence to analyze.

    Returns:
        Dict[str, Any]: Metrics including word count, avg syllables, and passive voice flag.
    """
    words = re.findall(r"\b\w+\b", sentence)
    if not words:
        return {
            "word_count": 0,
            "avg_syllables": 0,
            "is_passive": False,
            "has_jargon": False,
        }

    word_count = len(words)
    total_syllables = sum(count_syllables(w) for w in words)
    avg_syllables = total_syllables / word_count if word_count > 0 else 0

    # Check for passive voice
    sentence_lower = sentence.lower()
    is_passive = any(
        re.search(rf"{indicator}\s+\w+ed\b", sentence_lower)
        for indicator in PASSIVE_INDICATORS
    )

    # Check for jargon
    has_jargon = any(re.search(jargon, sentence_lower) for jargon in JARGON_WORDS)

    return {
        "word_count": word_count,
        "avg_syllables": round(avg_syllables, 2),
        "is_passive": is_passive,
        "has_jargon": has_jargon,
    }


def calculate_cognitive_load(resume_text: str) -> Dict[str, Any]:
    """
    Calculates the overall cognitive load score and identifies heavy sentences.

    Args:
        resume_text (str): The full text of the resume.

    Returns:
        Dict[str, Any]: A report including the score, heavy sentences, and suggestions.
    """
    if not resume_text or not isinstance(resume_text, str):
        return {"score": 100, "heavy_sentences": [], "suggestions": []}

    # Split into sentences (simplified)
    sentences = re.split(r"(?<=[.!?])\s+", resume_text)

    heavy_sentences = []
    passive_count = 0
    jargon_count = 0
    total_words = 0

    for i, sentence in enumerate(sentences):
        cleaned = sentence.strip()
        if not cleaned:
            continue

        metrics = analyze_sentence(cleaned)
        total_words += metrics["word_count"]

        is_heavy = False
        reasons = []

        if metrics["word_count"] > 25:
            is_heavy = True
            reasons.append("Too long (>25 words)")

        if metrics["avg_syllables"] > 1.5:
            is_heavy = True
            reasons.append("Complex vocabulary")

        if metrics["is_passive"]:
            is_heavy = True
            reasons.append("Passive voice")
            passive_count += 1

        if metrics["has_jargon"]:
            is_heavy = True
            reasons.append("Corporate jargon")
            jargon_count += 1

        if is_heavy:
            heavy_sentences.append(
                {
                    "text": cleaned,
                    "reasons": reasons,
                    "word_count": metrics["word_count"],
                }
            )

    # Calculate score (100 = perfect readability)
    base_score = 100
    if total_words > 0:
        passive_ratio = passive_count / len([s for s in sentences if s.strip()])
        jargon_ratio = jargon_count / len([s for s in sentences if s.strip()])

        base_score -= int(passive_ratio * 30)
        base_score -= int(jargon_ratio * 20)
        base_score -= int(
            (len(heavy_sentences) / len([s for s in sentences if s.strip()])) * 50
        )

    final_score = max(0, min(100, base_score))

    # Generate suggestions
    suggestions = []
    if passive_count > 0:
        suggestions.append(
            "Replace passive voice with strong action verbs (e.g., 'Led', 'Developed', 'Optimized')."
        )
    if jargon_count > 0:
        suggestions.append(
            "Replace corporate jargon with clear, specific descriptions of your actual work."
        )
    if len(heavy_sentences) > 0:
        suggestions.append(
            "Break up long, complex sentences into shorter, punchier bullet points (aim for <20 words per bullet)."
        )

    if not suggestions:
        suggestions.append(
            "Your resume has excellent readability and low cognitive load!"
        )

    return {
        "score": final_score,
        "heavy_sentences": heavy_sentences[:5],  # Limit to top 5 for UI clarity
        "suggestions": suggestions,
    }
