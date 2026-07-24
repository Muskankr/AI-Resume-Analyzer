"""Resume version comparison engine.

Given two ``ResumeAnalysis`` rows belonging to the same user, this module
computes:

* the ATS score delta between versions
* which skills were added / removed
* which "matched" / "missing" (role-required) skills changed
* a line-level diff of the extracted resume text, bucketed into
  added / removed / unchanged lines (a lightweight stand-in for a full
  section parser — good enough to show *what* changed without needing a
  dedicated resume-section extractor)
* a short list of human-readable "insights" explaining *why* the score
  moved and what to do next

No external LLM call is made: the project doesn't currently wire up an
AI provider (no API key / SDK in requirements.txt), and the existing
suggestion engine in ``services.py`` is itself template-based. This keeps
the comparison feature dependency-free and deterministic (and therefore
easy to unit test) while still satisfying the "AI-generated insight"
requirement with natural-language explanations synthesized from the diff.
"""

from __future__ import annotations

import difflib
from dataclasses import dataclass, field


@dataclass
class VersionComparison:
    older_id: int
    newer_id: int
    older_label: str
    newer_label: str
    older_score: int
    newer_score: int
    score_delta: int
    added_skills: list = field(default_factory=list)
    removed_skills: list = field(default_factory=list)
    newly_matched_skills: list = field(default_factory=list)
    newly_missing_skills: list = field(default_factory=list)
    still_missing_skills: list = field(default_factory=list)
    text_diff: list = field(default_factory=list)
    insights: list = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "older_id": self.older_id,
            "newer_id": self.newer_id,
            "older_label": self.older_label,
            "newer_label": self.newer_label,
            "older_score": self.older_score,
            "newer_score": self.newer_score,
            "score_delta": self.score_delta,
            "added_skills": self.added_skills,
            "removed_skills": self.removed_skills,
            "newly_matched_skills": self.newly_matched_skills,
            "newly_missing_skills": self.newly_missing_skills,
            "still_missing_skills": self.still_missing_skills,
            "text_diff": self.text_diff,
            "insights": self.insights,
        }


def _diff_lines(older_text: str, newer_text: str, max_lines: int = 200) -> list:
    """Line-level diff of the two resumes' extracted text.

    Returns a list of ``{"type": "added"|"removed"|"unchanged", "text": str}``
    entries (unchanged runs are skipped so the payload stays small).
    """

    older_lines = [ln.strip() for ln in (older_text or "").splitlines() if ln.strip()]
    newer_lines = [ln.strip() for ln in (newer_text or "").splitlines() if ln.strip()]

    matcher = difflib.SequenceMatcher(a=older_lines, b=newer_lines, autojunk=False)
    diff = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue
        if tag in ("replace", "delete"):
            for line in older_lines[i1:i2]:
                diff.append({"type": "removed", "text": line})
        if tag in ("replace", "insert"):
            for line in newer_lines[j1:j2]:
                diff.append({"type": "added", "text": line})

    return diff[:max_lines]


def _generate_insights(comparison: VersionComparison) -> list:
    """Rule-based natural-language explanation of what changed and why."""

    insights = []
    delta = comparison.score_delta

    if delta > 0:
        insights.append(
            f"Your ATS score improved by {delta} point{'s' if delta != 1 else ''} "
            f"({comparison.older_score}% \u2192 {comparison.newer_score}%)."
        )
    elif delta < 0:
        insights.append(
            f"Your ATS score dropped by {abs(delta)} point{'s' if abs(delta) != 1 else ''} "
            f"({comparison.older_score}% \u2192 {comparison.newer_score}%)."
        )
    else:
        insights.append(
            f"Your ATS score is unchanged at {comparison.newer_score}%."
        )

    if comparison.newly_matched_skills:
        skills = ", ".join(s.title() for s in comparison.newly_matched_skills)
        insights.append(
            f"You now cover {len(comparison.newly_matched_skills)} more required "
            f"skill{'s' if len(comparison.newly_matched_skills) != 1 else ''} for this "
            f"role than before: {skills}. This is the main driver behind the score change."
        )

    if comparison.newly_missing_skills:
        skills = ", ".join(s.title() for s in comparison.newly_missing_skills)
        insights.append(
            "Some previously matched skills no longer show up in the resume text: "
            f"{skills}. If this wasn't intentional, make sure they're still mentioned."
        )

    if comparison.added_skills:
        insights.append(
            f"{len(comparison.added_skills)} new skill keyword"
            f"{'s were' if len(comparison.added_skills) != 1 else ' was'} detected overall: "
            + ", ".join(s.title() for s in comparison.added_skills[:10])
            + ("..." if len(comparison.added_skills) > 10 else "")
        )

    if comparison.removed_skills:
        insights.append(
            f"{len(comparison.removed_skills)} skill keyword"
            f"{'s' if len(comparison.removed_skills) != 1 else ''} present in the older "
            "version no longer appear: "
            + ", ".join(s.title() for s in comparison.removed_skills[:10])
            + ("..." if len(comparison.removed_skills) > 10 else "")
        )

    if comparison.still_missing_skills:
        skills = ", ".join(s.title() for s in comparison.still_missing_skills[:5])
        insights.append(
            f"To improve further, consider adding evidence of: {skills}."
        )

    added_lines = sum(1 for d in comparison.text_diff if d["type"] == "added")
    removed_lines = sum(1 for d in comparison.text_diff if d["type"] == "removed")
    if added_lines or removed_lines:
        insights.append(
            f"Content changes: {added_lines} line{'s' if added_lines != 1 else ''} added, "
            f"{removed_lines} line{'s' if removed_lines != 1 else ''} removed or reworded."
        )

    if not insights:
        insights.append("No meaningful differences were detected between these versions.")

    return insights


def compare_versions(older, newer) -> VersionComparison:
    """Build a :class:`VersionComparison` for two ``ResumeAnalysis`` instances.

    ``older`` and ``newer`` are ordered chronologically by the caller
    (older.created_at <= newer.created_at is assumed but not enforced here,
    since a user may deliberately want to compare in either direction).
    """

    older_skills = set(s.lower() for s in (older.skills_found or []))
    newer_skills = set(s.lower() for s in (newer.skills_found or []))

    older_matched = set(s.lower() for s in (older.matched_skills or []))
    newer_matched = set(s.lower() for s in (newer.matched_skills or []))
    newer_missing = set(s.lower() for s in (newer.missing_skills or []))

    comparison = VersionComparison(
        older_id=older.id,
        newer_id=newer.id,
        older_label=f"{older.file_name} \u2014 {older.created_at:%b %d, %Y %H:%M}",
        newer_label=f"{newer.file_name} \u2014 {newer.created_at:%b %d, %Y %H:%M}",
        older_score=older.score,
        newer_score=newer.score,
        score_delta=newer.score - older.score,
        added_skills=sorted(newer_skills - older_skills),
        removed_skills=sorted(older_skills - newer_skills),
        newly_matched_skills=sorted(newer_matched - older_matched),
        newly_missing_skills=sorted(older_matched - newer_matched),
        still_missing_skills=sorted(newer_missing),
        text_diff=_diff_lines(older.resume_text, newer.resume_text),
    )
    comparison.insights = _generate_insights(comparison)
    return comparison
