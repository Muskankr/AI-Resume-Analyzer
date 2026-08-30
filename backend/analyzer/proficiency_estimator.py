"""
Skill Proficiency Estimator and Validation Engine.

Analyzes the context surrounding extracted skills to estimate proficiency levels
(Beginner, Intermediate, Advanced, Expert) and flags unsupported claims.
"""

import re
from typing import List, Dict, Any, Tuple

PROFICIENCY_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"]

BEGINNER_INDICATORS = [
    r"\bfamiliar with\b",
    r"\bbasic knowledge of\b",
    r"\blearning\b",
    r"\bexposed to\b",
    r"\bassisted in\b",
    r"\bhelped with\b",
]

ADVANCED_INDICATORS = [
    r"\barchitected\b",
    r"\bspearheaded\b",
    r"\bled\b",
    r"\bdesigned\b",
    r"\boptimized\b",
    r"\bimplemented\b",
    r"\bdeveloped\b",
    r"\bmanaged\b",
]

EXPERT_INDICATORS = [
    r"\b\d+\+?\s+years?\s+of\s+experience\b",
    r"\bdecade\b",
    r"\bdeep expertise\b",
    r"\bthought leader\b",
    r"\bsubject matter expert\b",
    r"\b SME\b",
]

QUANTIFIABLE_METRICS = [
    r"\b\d+%\b",
    r"\b\d+\s+users?\b",
    r"\b\d+\s+million\b",
    r"\b\d+x\b",
    r"\b\d+\s+team members?\b",
]

# How many sentences either side of a skill mention count as context for it.
#
# Resumes name a skill in one sentence and say what was built with it in the
# next -- "8+ years of experience in Python. I architected a system serving 10
# million users." Reading only the sentence containing the token throws away
# the half that carries the evidence.
SKILL_CONTEXT_WINDOW = 1

# Mentions to consider, and the ceiling on snippets handed back in the
# response so a skill named throughout a resume does not return the resume.
MAX_SKILL_MENTIONS = 3
MAX_CONTEXT_SNIPPETS = 6


def build_skill_context(
    sentences: List[str], skill_lower: str
) -> Tuple[List[str], List[str]]:
    """Split the evidence for ``skill_lower`` into primary and supporting.

    Primary: the sentences that name the skill. These decide the proficiency
    *level*, because the verb attached to a skill is the claim being made about
    it -- "basic knowledge of Java" is a beginner claim no matter what the next
    sentence says.

    Supporting: those sentences plus their immediate neighbours. Used only to
    corroborate a claim with numbers. This is what lets

        "8+ years of experience in Python. I architected a system serving
         10 million users, optimizing performance by 40%."

    count the metrics in the second sentence, which the previous
    sentence-must-contain-the-token rule discarded.

    Keeping the two apart matters: a single window would let a neighbouring
    sentence about a *different* skill donate its level indicators, so
    "Basic knowledge of Java. 10+ years of Python, architected systems."
    would promote Java to Expert.

    Both lists come back in document order with duplicates removed.
    """
    mention_indices = [i for i, s in enumerate(sentences) if skill_lower in s]
    if not mention_indices:
        return [], []

    considered = mention_indices[:MAX_SKILL_MENTIONS]
    primary = [sentences[i] for i in considered]

    selected = set()
    for index in considered:
        low = max(0, index - SKILL_CONTEXT_WINDOW)
        high = min(len(sentences), index + SKILL_CONTEXT_WINDOW + 1)
        selected.update(range(low, high))

    supporting = [sentences[i] for i in sorted(selected)][:MAX_CONTEXT_SNIPPETS]
    return primary, supporting


def analyze_skill_context(resume_text: str, skill: str) -> Dict[str, Any]:
    """
    Analyzes the context around a specific skill to estimate proficiency.
    """
    text_lower = resume_text.lower()
    skill_lower = skill.lower()

    sentences = re.split(r"(?<=[.!?])\s+", text_lower)
    primary_snippets, context_snippets = build_skill_context(sentences, skill_lower)

    # Level comes from the sentences that name the skill; metrics may come from
    # the sentence next door. See build_skill_context.
    claim_text = " ".join(primary_snippets)
    context_text = " ".join(context_snippets)

    score = 50  # Base score
    warnings = []
    level = "Intermediate"  # Default

    # Check for beginner indicators
    if any(re.search(indicator, claim_text) for indicator in BEGINNER_INDICATORS):
        score -= 30
        level = "Beginner"

    # Check for advanced indicators
    if any(re.search(indicator, claim_text) for indicator in ADVANCED_INDICATORS):
        score += 20
        level = "Advanced"

    # Check for expert indicators
    if any(re.search(indicator, claim_text) for indicator in EXPERT_INDICATORS):
        score += 30
        level = "Expert"

    # Quantifiable metrics corroborate the claim, and are read from the wider
    # window: people put the number in the sentence after the one naming the
    # skill at least as often as in it.
    metrics_found = [m for m in QUANTIFIABLE_METRICS if re.search(m, context_text)]
    if metrics_found:
        score += 15

    # Flag unsupported expert claims
    if level == "Expert" and not metrics_found and len(context_text) < 100:
        warnings.append(
            "Claimed expertise lacks quantifiable metrics or detailed context."
        )

    # Flag beginner skills listed as core
    if level == "Beginner" and score < 40:
        warnings.append(
            "Skill is presented with weak action verbs; consider reframing or moving to 'Familiar With' section."
        )

    confidence = min(100, max(0, score))

    return {
        "skill": skill,
        "estimated_level": level,
        "confidence_score": confidence,
        "warnings": warnings,
        "context_snippets": context_snippets,
    }


def estimate_all_proficiencies(
    resume_text: str, skills: List[str]
) -> List[Dict[str, Any]]:
    """
    Estimates proficiency for a list of skills based on resume context.
    """
    if not skills or not resume_text:
        return []

    results = []
    for skill in skills:
        analysis = analyze_skill_context(resume_text, skill)
        results.append(analysis)

    # Sort by confidence score descending
    results.sort(key=lambda x: x["confidence_score"], reverse=True)
    return results
