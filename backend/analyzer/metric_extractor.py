"""
Resume Achievement Quantification and Metric Suggestion Engine.

This module scans resume bullet points to identify achievements lacking
quantifiable metrics (numbers, percentages, timeframes) and generates
specific, context-aware suggestions to add measurable impact.
"""

import re
from typing import List, Dict, Any, Tuple

# Regex patterns to detect existing quantifiable metrics
METRIC_PATTERNS = [
    r"\d+%",  # Percentages (e.g., 20%)
    r"\$\d+(?:,\d{3})*(?:\.\d{2})?",  # Currency (e.g., $1,000, $50.00)
    r"\d+\s*(?:users?|clients?|customers?|students?|employees?)",  # People counts
    r"\d+\s*(?:years?|months?|days?|hours?)",  # Timeframes
    r"\d+\s*(?:million|thousand|hundred|billion)",  # Large numbers
    r"\d+\s*x\s*(?:faster|larger|more|greater)",  # Multipliers (e.g., 2x faster)
    r"ranked\s*(?:#|number)\s*\d+",  # Rankings
    r"\d+\s*(?:projects?|products?|features?|systems?)",  # Item counts
]

# Action verbs mapped to typical metric suggestions
ACTION_VERB_SUGGESTIONS = {
    r"\b(increased|improved|grew|expanded|boosted)\b": "by [X]% or generated $[Y] in revenue",
    r"\b(reduced|decreased|cut|saved|minimized)\b": "by [X]% or saved [Y] hours per week",
    r"\b(managed|led|supervised|directed)\b": "a team of [X] people or a budget of $[Y]",
    r"\b(developed|built|created|designed|architected)\b": "[X] features/systems used by [Y] users",
    r"\b(optimized|streamlined|accelerated)\b": "processes, reducing time by [X]% or increasing efficiency by [Y]%",
    r"\b(won|secured|obtained|earned)\b": "[X] new clients or $[Y] in funding",
}


def has_metrics(text: str) -> bool:
    """
    Checks if a given text contains any quantifiable metrics.

    Args:
        text (str): The bullet point or text to analyze.

    Returns:
        bool: True if metrics are found, False otherwise.
    """
    for pattern in METRIC_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False


def generate_metric_suggestion(bullet: str) -> str:
    """
    Generates a context-aware suggestion for adding metrics to a bullet point.

    Args:
        bullet (str): The original bullet point text.

    Returns:
        str: A suggested enhancement with placeholder metrics.
    """
    bullet_lower = bullet.lower()

    # Check for specific action verbs to provide tailored suggestions
    for verb_pattern, suggestion_template in ACTION_VERB_SUGGESTIONS.items():
        if re.search(verb_pattern, bullet_lower):
            # Find the object of the verb to make the suggestion more specific
            # Simplified heuristic: take the rest of the sentence after the verb
            match = re.search(verb_pattern, bullet_lower)
            if match:
                verb = match.group(1)
                return f"Consider adding: '{verb.capitalize()} [specific outcome] {suggestion_template}'"

    # Fallback generic suggestion if no specific action verb is matched
    return "Consider adding quantifiable impact, such as: 'resulting in a [X]% improvement', 'serving [Y] users', or 'saving [Z] hours per week'."


def analyze_resume_bullets(resume_text: str) -> List[Dict[str, Any]]:
    """
    Analyzes resume text, splits it into bullet points, and identifies
    those lacking quantifiable metrics, providing suggestions.

    Args:
        resume_text (str): The full text of the resume.

    Returns:
        List[Dict[str, Any]]: A list of dictionaries containing the original
                              bullet, a boolean indicating if it has metrics,
                              and a suggestion if it does not.
    """
    if not resume_text or not isinstance(resume_text, str):
        return []

    # Split text into potential bullet points
    # Looks for lines starting with -, *, •, or numbered lists, or just distinct lines
    lines = resume_text.split("\n")
    bullets = []

    for line in lines:
        cleaned_line = line.strip()
        # Filter out empty lines, very short lines, or section headers
        if len(cleaned_line) > 20 and not re.match(r"^[A-Z\s\-]+$", cleaned_line):
            # Check if it looks like a bullet point or a descriptive sentence
            if (
                re.match(r"^[\-\*\•\d\.\)]\s+", cleaned_line)
                or len(cleaned_line.split()) > 5
            ):
                bullets.append(cleaned_line)

    results = []
    for bullet in bullets:
        has_metric = has_metrics(bullet)
        suggestion = "" if has_metric else generate_metric_suggestion(bullet)

        results.append(
            {
                "original_bullet": bullet,
                "has_metrics": has_metric,
                "suggestion": suggestion,
                "enhanced_bullet": (
                    _create_enhanced_bullet(bullet, suggestion)
                    if not has_metric
                    else bullet
                ),
            }
        )

    return results


def _create_enhanced_bullet(original: str, suggestion: str) -> str:
    """
    Attempts to create a template for an enhanced bullet based on the suggestion.
    """
    # This is a heuristic template generator
    if "by [X]%" in suggestion:
        return f"{original} [resulting in a X% improvement]"
    elif "team of [X]" in suggestion:
        return f"{original} [for a team of X people]"
    elif "used by [Y] users" in suggestion:
        return f"{original} [used by Y users]"
    else:
        return f"{original} [add specific metric here]"

    return original
