"""
Resume Content Quality Rewriter Engine.

Analyses resume text line-by-line, detects weak or suboptimal bullet points
and provides specific before/after rewrite suggestions with impact scores.

The engine identifies:
    - Weak action verbs and suggests stronger alternatives
    - Missing quantification (numbers, percentages, metrics)
    - Passive voice constructions
    - Vague or filler phrases
    - Overly long sentences that hurt scannability
    - Missing impact indicators

Each suggestion carries a priority, estimated impact score, and a concrete
rewrite the user can apply immediately.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple


# ── Weak phrase / verb mappings ───────────────────────────────────────────

#: Maps weak openers to a stronger replacement + context note.
WEAK_VERBS: Dict[str, Tuple[str, str]] = {
    "responsible for": (
        "managed",
        "Replace the duty phrase with a result-oriented verb.",
    ),
    "worked on": (
        "developed",
        "'Worked on' is vague — say what you built or delivered.",
    ),
    "helped with": (
        "contributed to",
        "Be specific about your role and its outcome.",
    ),
    "assisted in": (
        "supported",
        "State your direct contribution and its result.",
    ),
    "involved in": (
        "participated in",
        "Name the specific activity and its measurable outcome.",
    ),
    "tasked with": (
        "delivered",
        "Focus on what you accomplished, not what you were assigned.",
    ),
    "duties included": (
        "key achievements include",
        "Frame duties as accomplishments with measurable outcomes.",
    ),
    "participated in": (
        "contributed to",
        "Be specific about your contribution and its impact.",
    ),
    "was assigned to": (
        "led",
        "Show ownership — use 'led', 'drove', or 'delivered'.",
    ),
    "handled": (
        "managed",
        "'Handled' is informal; use a more professional verb.",
    ),
    "did": (
        "executed",
        "'Did' is too generic — say exactly what you executed.",
    ),
    "was responsible for": (
        "managed",
        "Remove the passive construction and lead with the verb.",
    ),
    "worked closely with": (
        "collaborated with",
        "Specify the outcome of the collaboration.",
    ),
    "assisted with": (
        "supported",
        "State your specific contribution and its measurable result.",
    ),
}

#: Passive voice patterns (leading auxiliary + verb).
PASSIVE_PATTERNS: List[Tuple[re.Pattern, str, str]] = [
    (
        re.compile(r"\b(was|were|is|are|been|being)\s+(developed|built|created|designed|implemented|managed|led)\b", re.IGNORECASE),
        "Passive voice detected — rewrite in active voice for impact.",
        "",
    ),
]

#: Vague filler phrases that add no value.
FILLER_PHRASES: List[Tuple[str, str]] = {
    "various tasks": "Name the specific tasks or responsibilities.",
    "multiple projects": "Specify the projects and your role in each.",
    "a variety of": "Be specific about what variety you're referring to.",
    "as needed": "Remove — state the actual scope of your work.",
    "on a daily basis": "Simplify to 'daily' or remove entirely.",
    "in order to": "Simplify to 'to' for conciseness.",
    "at the end of the day": "Remove — this is a filler phrase.",
    "the ability to": "Lead with the skill directly, e.g., 'Designed...'.",
    "great communicator": "Prove it with a specific example.",
    "team player": "Demonstrate teamwork through a concrete achievement.",
    "detail oriented": "Show attention to detail through a specific result.",
    "self motivated": "Demonstrate initiative through a concrete achievement.",
    "fast learner": "Prove it by describing how quickly you ramped up.",
    "results driven": "Show results with specific metrics.",
    "passionate about": "Demonstrate passion through a concrete project.",
    "go-getter": "Replace with a professional achievement.",
    "synergy": "Use specific collaboration outcomes instead.",
    "leverage": "State exactly how you used a resource or skill.",
    "utilize": "Use 'use' — it's simpler and clearer.",
    "facilitate": "State what you actually did and its outcome.",
}

#: Regex patterns that indicate quantification is present.
QUANTIFICATION_PATTERNS = [
    re.compile(r"\d+%"),
    re.compile(r"\d+\s*(?:users?|customers?|team\s*members?|projects?|sites?|tickets?|cases?|accounts?)"),
    re.compile(r"\$\d+"),
    re.compile(r"\d+x\b"),
    re.compile(r"\d+\s*(?:million|thousand|billion|k\b)"),
    re.compile(r"increased\s+by\s+\d+"),
    re.compile(r"reduced\s+by\s+\d+"),
    re.compile(r"improved\s+by\s+\d+"),
    re.compile(r"\d+\s*(?:hours?|days?|weeks?|months?)\s*(?:saved|reduced|faster)"),
]

#: Pattern for detecting bullet-point lines.
BULLET_PATTERN = re.compile(r"^\s*(?:[-–—*•▪▫▸▹●○◦‣∙·]|\d+[.)])\s+")


# ── Data classes ──────────────────────────────────────────────────────────

@dataclass
class RewriteSuggestion:
    """A single actionable rewrite recommendation."""
    original_text: str
    suggested_text: str
    issue_type: str  # "weak_verb" | "passive_voice" | "filler" | "no_quantification" | "too_long"
    priority: str  # "critical" | "high" | "medium" | "low"
    impact_score: int  # 1-10
    explanation: str
    line_number: int

    def as_dict(self) -> Dict:
        return asdict(self)


@dataclass
class ContentRewriteResult:
    """Complete rewrite analysis result."""
    total_lines_analyzed: int
    bullet_lines_found: int
    issues_found: int
    overall_quality_score: int  # 0-100
    suggestions: List[RewriteSuggestion]
    summary: str
    category_counts: Dict[str, int]
    top_priority_actions: List[RewriteSuggestion]

    def as_dict(self) -> Dict:
        return {
            "total_lines_analyzed": self.total_lines_analyzed,
            "bullet_lines_found": self.bullet_lines_found,
            "issues_found": self.issues_found,
            "overall_quality_score": self.overall_quality_score,
            "suggestions": [s.as_dict() for s in self.suggestions],
            "summary": self.summary,
            "category_counts": self.category_counts,
            "top_priority_actions": [s.as_dict() for s in self.top_priority_actions],
        }


# ── Rewriting logic ──────────────────────────────────────────────────────

def _is_bullet_line(line: str) -> bool:
    """Return True if the line looks like a resume bullet point."""
    stripped = line.strip()
    if not stripped or len(stripped) < 15:
        return False
    return bool(BULLET_PATTERN.match(stripped)) or len(stripped.split()) >= 6


def _has_quantification(text: str) -> bool:
    """Return True if the text contains numeric metrics."""
    return any(p.search(text) for p in QUANTIFICATION_PATTERNS)


def _check_weak_verb(line: str, line_number: int) -> List[RewriteSuggestion]:
    """Detect weak verb phrases and suggest replacements."""
    suggestions = []
    lower = line.lower().strip()
    # Strip bullet marker
    stripped = BULLET_PATTERN.sub("", lower).strip()

    for weak, (strong, note) in WEAK_VERBS.items():
        if weak in stripped:
            # Build suggested text
            original = line.strip()
            suggested = re.sub(
                re.compile(re.escape(weak), re.IGNORECASE),
                strong,
                original,
                count=1,
            )
            # Capitalize the replacement if it starts the sentence
            if suggested and suggested[0].islower() and (stripped.startswith(weak) or stripped.startswith(weak.split()[0])):
                suggested = suggested[0].upper() + suggested[1:]

            suggestions.append(RewriteSuggestion(
                original_text=original,
                suggested_text=suggested,
                issue_type="weak_verb",
                priority="high",
                impact_score=7,
                explanation=f"Replace '{weak}' with '{strong}'. {note}",
                line_number=line_number,
            ))
            break  # One weak verb per line

    return suggestions


def _check_passive_voice(line: str, line_number: int) -> List[RewriteSuggestion]:
    """Detect passive voice constructions."""
    suggestions = []
    stripped = BULLET_PATTERN.sub("", line.strip()).strip()

    for pattern, note, _ in PASSIVE_PATTERNS:
        if pattern.search(stripped):
            suggestions.append(RewriteSuggestion(
                original_text=line.strip(),
                suggested_text=f"[Rewrite in active voice] {stripped}",
                issue_type="passive_voice",
                priority="medium",
                impact_score=5,
                explanation=note,
                line_number=line_number,
            ))
            break

    return suggestions


def _check_filler_phrases(line: str, line_number: int) -> List[RewriteSuggestion]:
    """Detect vague filler phrases."""
    suggestions = []
    lower = line.lower().strip()
    stripped = BULLET_PATTERN.sub("", lower).strip()

    for phrase, note in FILLER_PHRASES.items():
        if phrase in stripped:
            suggestions.append(RewriteSuggestion(
                original_text=line.strip(),
                suggested_text=f"[Replace '{phrase}' with specific details]",
                issue_type="filler",
                priority="medium",
                impact_score=6,
                explanation=f"'{phrase}' is vague. {note}",
                line_number=line_number,
            ))
            break  # One filler per line

    return suggestions


def _check_no_quantification(line: str, line_number: int) -> List[RewriteSuggestion]:
    """Flag bullet lines that lack quantified achievements."""
    stripped = BULLET_PATTERN.sub("", line.strip()).strip()

    if len(stripped) < 30:
        return []

    # Only flag if the line is a bullet/achievement line
    if not _is_bullet_line(line):
        return []

    # Check if the line has action verbs (likely an achievement bullet)
    has_action = bool(re.search(
        r"\b(?:led|managed|developed|implemented|designed|created|improved|increased|reduced|achieved|delivered|launched|optimized|automated|scaled|built|architected|engineered|spearheaded|coordinated)\b",
        stripped, re.IGNORECASE
    ))

    if not has_action:
        return []

    if _has_quantification(stripped):
        return []

    return [RewriteSuggestion(
        original_text=line.strip(),
        suggested_text="[Add a metric: numbers, %, $, or time saved]",
        issue_type="no_quantification",
        priority="high",
        impact_score=8,
        explanation="This achievement bullet has no quantified metric. Adding numbers (e.g., 'Improved performance by 30%') makes it significantly more compelling.",
        line_number=line_number,
    )]


def _check_sentence_length(line: str, line_number: int) -> List[RewriteSuggestion]:
    """Flag overly long bullet lines that hurt scannability."""
    stripped = line.strip()
    word_count = len(stripped.split())

    if word_count > 35:
        return [RewriteSuggestion(
            original_text=stripped,
            suggested_text=f"[Split into two bullets — {word_count} words is too long]",
            issue_type="too_long",
            priority="low",
            impact_score=4,
            explanation=f"This line has {word_count} words. ATS scanners and recruiters prefer bullets under 25 words. Consider splitting into two focused points.",
            line_number=line_number,
        )]

    return []


def _compute_quality_score(
    total_bullets: int,
    issues: List[RewriteSuggestion],
) -> int:
    """Compute an overall content quality score (0-100)."""
    if total_bullets == 0:
        return 50  # Neutral if no bullets detected

    issue_count = len(issues)
    # Start at 100, deduct per issue
    critical = sum(1 for i in issues if i.priority == "critical")
    high = sum(1 for i in issues if i.priority == "high")
    medium = sum(1 for i in issues if i.priority == "medium")
    low = sum(1 for i in issues if i.priority == "low")

    deduction = (critical * 12) + (high * 8) + (medium * 4) + (low * 2)
    score = max(0, min(100, 100 - deduction))
    return score


def _generate_summary(
    quality_score: int,
    issues_count: int,
    bullet_count: int,
    category_counts: Dict[str, int],
) -> str:
    """Write a human-readable summary."""
    if quality_score >= 85:
        opening = "Excellent content quality!"
    elif quality_score >= 70:
        opening = "Good content quality with room for improvement."
    elif quality_score >= 50:
        opening = "Moderate content quality — several areas need attention."
    else:
        opening = "Content quality needs significant improvement."

    parts = [opening]

    if issues_count == 0:
        parts.append(f"All {bullet_count} bullet points look strong.")
    else:
        parts.append(f"Found {issues_count} issue{'s' if issues_count != 1 else ''} across {bullet_count} bullet points.")

    top_issues = sorted(category_counts.items(), key=lambda x: -x[1])
    if top_issues:
        labels = {
            "weak_verb": "weak verbs",
            "passive_voice": "passive voice",
            "filler": "filler phrases",
            "no_quantification": "missing metrics",
            "too_long": "overly long lines",
        }
        top_labels = [labels.get(k, k) for k, _ in top_issues[:3]]
        parts.append(f"Main areas: {', '.join(top_labels)}.")

    return " ".join(parts)


# ── Public API ────────────────────────────────────────────────────────────

def rewrite_content(resume_text: str) -> ContentRewriteResult:
    """Analyse resume text and generate rewrite suggestions.

    Args:
        resume_text: The full extracted text of a resume.

    Returns:
        A ``ContentRewriteResult`` with prioritised suggestions.
    """
    lines = resume_text.splitlines()
    all_suggestions: List[RewriteSuggestion] = []
    bullet_count = 0

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue

        if _is_bullet_line(line):
            bullet_count += 1

        all_suggestions.extend(_check_weak_verb(stripped, i + 1))
        all_suggestions.extend(_check_passive_voice(stripped, i + 1))
        all_suggestions.extend(_check_filler_phrases(stripped, i + 1))
        all_suggestions.extend(_check_no_quantification(stripped, i + 1))
        all_suggestions.extend(_check_sentence_length(stripped, i + 1))

    # Deduplicate suggestions on the same line + issue type
    seen = set()
    unique: List[RewriteSuggestion] = []
    for s in all_suggestions:
        key = (s.line_number, s.issue_type)
        if key not in seen:
            seen.add(key)
            unique.append(s)

    # Sort by priority then impact
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    unique.sort(key=lambda s: (priority_order.get(s.priority, 4), -s.impact_score))

    # Category counts
    category_counts: Dict[str, int] = {}
    for s in unique:
        category_counts[s.issue_type] = category_counts.get(s.issue_type, 0) + 1

    quality_score = _compute_quality_score(bullet_count, unique)
    summary = _generate_summary(quality_score, len(unique), bullet_count, category_counts)
    top_actions = unique[:5]

    return ContentRewriteResult(
        total_lines_analyzed=len([l for l in lines if l.strip()]),
        bullet_lines_found=bullet_count,
        issues_found=len(unique),
        overall_quality_score=quality_score,
        suggestions=unique,
        summary=summary,
        category_counts=category_counts,
        top_priority_actions=top_actions,
    )
