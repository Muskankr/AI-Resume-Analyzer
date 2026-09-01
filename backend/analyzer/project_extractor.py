"""
Resume Project Portfolio Extractor and Impact Scorer.

Isolates project sections from the resume, evaluates them for impact metrics,
and assigns a Project Impact Score with specific improvement suggestions.
"""

import re
from typing import List, Dict, Any

PROJECT_HEADERS = [
    r"projects",
    r"personal projects",
    r"key projects",
    r"portfolio",
    r"academic projects",
    r"side projects",
]

# (label, pattern). The label is what goes back in ``metrics_found``, which is
# part of the API response -- deriving it from the regex source, as this used
# to, produced strings like "X%" and "X users" and could not survive a pattern
# gaining a group.
METRIC_PATTERNS = [
    ("percentage", r"\d+(?:\.\d+)?\s*%"),
    # "10k users", "2.5M requests", "1B rows". The old r"\d+\s+users?" required
    # whitespace between the number and the noun, so "10k users" never matched:
    # \d+ consumed "10" and \s+ then hit "k". Abbreviated magnitudes are the
    # common way to write these on a resume.
    ("scale", r"\d+(?:\.\d+)?\s*[kKmMbB]\b"),
    ("scale", r"\d+\s+(?:users?|customers?|requests?|records?|rows?|downloads?)"),
    ("scale", r"\d+\s+(?:million|billion|thousand)"),
    ("multiplier", r"\d+(?:\.\d+)?x\b"),
    ("monetary", r"\$\s?\d+(?:[.,]\d+)?\s*[kKmMbB]?"),
    ("team size", r"\d+\s+(?:team members?|engineers?|developers?|people)"),
    # Any tense, and allowing an object between the verb and "by":
    # "increasing sales by 20%", "reduced latency by 40ms", "cut build times by
    # half". The old patterns were the two literals "reduced by" and
    # "increased by", so the participle forms people actually write were missed.
    (
        "improvement",
        r"\b(?:increas|reduc|decreas|improv|boost|rais|lower|cut|grew|grow|"
        r"accelerat|boost|boosted|shrank|shrink|optimi[sz])\w*\s+"
        r"(?:\w+\s+){0,3}by\s+\d+",
    ),
    ("duration", r"\d+\s*(?:ms|seconds?|minutes?|hours?)\b"),
]

# Ceiling on the metric contribution. Each distinct kind of metric is worth 15,
# but one bullet quoting a percentage, a scale and a dollar figure describes one
# achievement, not three, and should not be able to carry the whole score.
MAX_METRIC_SCORE = 45

ACTION_VERBS = [
    r"\barchitected\b",
    r"\bdeveloped\b",
    r"\bimplemented\b",
    r"\bdesigned\b",
    r"\boptimized\b",
    r"\bled\b",
    r"\bbuilt\b",
    r"\bcreated\b",
]

TECH_STACK_INDICATORS = [
    r"python",
    r"react",
    r"node\.js",
    r"aws",
    r"docker",
    r"kubernetes",
    r"tensorflow",
    r"sql",
    r"mongodb",
    r"typescript",
    r"java",
    r"c\+\+",
]


def extract_projects(resume_text: str) -> List[Dict[str, Any]]:
    """
    Extracts project entries from the resume text.
    """
    projects = []
    text_lower = resume_text.lower()

    # Find the start of the projects section
    header_match = None
    for header in PROJECT_HEADERS:
        match = re.search(rf"^\s*{header}\s*$", text_lower, re.MULTILINE)
        if match:
            header_match = match
            break

    if not header_match:
        return projects

    # Extract text from the projects section until the next major section
    section_text = resume_text[header_match.end() :]
    next_section = re.search(
        r"^\s*(?:experience|education|skills|certifications|awards)\s*$",
        section_text.lower(),
        re.MULTILINE,
    )

    if next_section:
        section_text = section_text[: next_section.start()]

    # Split into individual projects (heuristic: capitalized lines or bullet points)
    raw_projects = re.split(
        r"\n(?=[A-Z][a-zA-Z\s]+(?:Project|:|$)|\s*[-•*]\s+[A-Z])", section_text.strip()
    )

    for raw_proj in raw_projects:
        if len(raw_proj.strip()) < 20:
            continue

        projects.append(
            {
                "name": "Unnamed Project",  # Simplified extraction
                "description": raw_proj.strip(),
            }
        )

    return projects


def score_project_impact(project: Dict[str, Any]) -> Dict[str, Any]:
    """
    Scores a project based on impact metrics, action verbs, and tech stack.
    """
    desc = project["description"]
    desc_lower = desc.lower()
    score = 40  # Base score for having a project

    suggestions = []
    metrics_found = []
    tech_found = []

    # Check for metrics
    for label, pattern in METRIC_PATTERNS:
        if re.search(pattern, desc, re.IGNORECASE) and label not in metrics_found:
            metrics_found.append(label)

    score += min(len(metrics_found) * 15, MAX_METRIC_SCORE)

    if not metrics_found:
        suggestions.append(
            "Add quantifiable metrics (e.g., 'Improved performance by 20%', 'Served 10k users')."
        )

    # Check for action verbs
    verb_count = sum(1 for pattern in ACTION_VERBS if re.search(pattern, desc_lower))
    score += min(verb_count * 10, 20)

    if verb_count == 0:
        suggestions.append(
            "Start descriptions with strong action verbs (e.g., 'Developed', 'Architected', 'Optimized')."
        )

    # Check for tech stack
    for tech in TECH_STACK_INDICATORS:
        if re.search(rf"\b{tech}\b", desc_lower):
            score += 5
            tech_found.append(tech.title())

    if not tech_found:
        suggestions.append(
            "Explicitly mention the technologies and tools used in the project."
        )

    return {
        "name": project["name"],
        "description": desc,
        "impact_score": min(100, score),
        "metrics_found": metrics_found,
        "technologies": list(set(tech_found)),
        "suggestions": suggestions,
    }


def analyze_portfolio(resume_text: str) -> List[Dict[str, Any]]:
    """
    Main function to extract and score all projects in a resume.
    """
    raw_projects = extract_projects(resume_text)
    if not raw_projects:
        return []

    return [score_project_impact(proj) for proj in raw_projects]
