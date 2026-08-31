"""
Career Path Recommendation Engine.

Generates personalised, structured career development plans from a user's
detected skills, experience level and target role. The engine computes
priority-ranked actions (skill upgrades, projects, certifications, courses)
and arranges them into a phased timeline with estimated score-impact
projections.

Design rationale:
    The analysis pipeline already produces ``matched_skills``, ``missing_skills``
    and ``detected_skills``. Rather than re-run those, this module accepts
    them and focuses exclusively on *what to do next*, weighted by how much
    each action is likely to improve the overall ATS score.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional


# ── Skill metadata ────────────────────────────────────────────────────────

#: Each skill carries a tier (junior / mid / senior), estimated study time,
#: and an impact weight reflecting how much it moves the needle for the
#: target roles it appears in.

@dataclass(frozen=True)
class SkillMeta:
    name: str
    tier: str  # "junior" | "mid" | "senior"
    estimated_weeks: int  # self-study to proficiency
    impact_weight: float  # 0.0-1.0, higher = more score impact
    category: str  # "language" | "framework" | "tool" | "concept" | "soft"
    related_certifications: List[str] = field(default_factory=list)
    project_ideas: List[str] = field(default_factory=list)


SKILL_CATALOG: Dict[str, SkillMeta] = {
    # Languages
    "python": SkillMeta("Python", "junior", 6, 0.85, "language",
                        ["PCEP", "PCAP"],
                        ["Build a CLI task manager", "Create a REST API with Flask"]),
    "javascript": SkillMeta("JavaScript", "junior", 8, 0.90, "language",
                            ["Meta Front-End Developer"],
                            ["Build a real-time chat app", "Create a weather dashboard"]),
    "typescript": SkillMeta("TypeScript", "mid", 5, 0.80, "language", [],
                            ["Add types to an existing JS project", "Build a type-safe API client"]),
    "java": SkillMeta("Java", "junior", 10, 0.75, "language",
                       ["Oracle Certified Associate"],
                       ["Build a Spring Boot microservice"]),
    "sql": SkillMeta("SQL", "junior", 4, 0.70, "language",
                      ["Google Data Analytics"],
                      ["Design and query a multi-table schema"]),
    "html": SkillMeta("HTML", "junior", 2, 0.30, "language", [], []),
    "css": SkillMeta("CSS", "junior", 3, 0.35, "language", [], []),
    "c++": SkillMeta("C++", "mid", 12, 0.55, "language", [], []),
    "ruby": SkillMeta("Ruby", "mid", 6, 0.45, "language", [], []),
    "php": SkillMeta("PHP", "mid", 5, 0.40, "language", [], []),
    "swift": SkillMeta("Swift", "mid", 8, 0.50, "language", [], []),
    "kotlin": SkillMeta("Kotlin", "mid", 6, 0.45, "language", [], []),
    "go": SkillMeta("Go", "senior", 8, 0.65, "language", [], []),
    "rust": SkillMeta("Rust", "senior", 10, 0.55, "language", [], []),

    # Frameworks
    "react": SkillMeta("React", "mid", 6, 0.88, "framework",
                        ["Meta Front-End Developer"],
                        ["Build a kanban board", "Create a dashboard with data viz"]),
    "next.js": SkillMeta("Next.js", "mid", 5, 0.75, "framework", [], []),
    "angular": SkillMeta("Angular", "mid", 7, 0.70, "framework", [], []),
    "vue": SkillMeta("Vue.js", "mid", 5, 0.65, "framework", [], []),
    "django": SkillMeta("Django", "mid", 6, 0.82, "framework", [], []),
    "flask": SkillMeta("Flask", "mid", 4, 0.60, "framework", [], []),
    "fastapi": SkillMeta("FastAPI", "mid", 3, 0.70, "framework", [], []),
    "node.js": SkillMeta("Node.js", "mid", 5, 0.80, "framework", [], []),
    "express.js": SkillMeta("Express.js", "mid", 3, 0.55, "framework", [], []),
    "spring boot": SkillMeta("Spring Boot", "senior", 6, 0.65, "framework", [], []),

    # Tools
    "git": SkillMeta("Git", "junior", 2, 0.75, "tool", [], []),
    "github": SkillMeta("GitHub", "junior", 1, 0.55, "tool", [], []),
    "docker": SkillMeta("Docker", "mid", 4, 0.72, "tool",
                         ["Docker Certified Associate"], []),
    "kubernetes": SkillMeta("Kubernetes", "senior", 8, 0.68, "tool",
                             ["CKA"], []),
    "aws": SkillMeta("AWS", "mid", 8, 0.78, "tool",
                      ["AWS Solutions Architect", "AWS Developer Associate"], []),
    "terraform": SkillMeta("Terraform", "senior", 6, 0.60, "tool", [], []),
    "ci/cd": SkillMeta("CI/CD", "mid", 3, 0.65, "tool", [], []),
    "redis": SkillMeta("Redis", "mid", 3, 0.55, "tool", [], []),
    "webpack": SkillMeta("Webpack", "mid", 3, 0.45, "tool", [], []),
    "tailwind": SkillMeta("Tailwind CSS", "junior", 2, 0.50, "tool", [], []),

    # Databases
    "postgresql": SkillMeta("PostgreSQL", "mid", 4, 0.70, "tool",
                             ["PostgreSQL Certified"], []),
    "mysql": SkillMeta("MySQL", "junior", 3, 0.55, "tool", [], []),
    "mongodb": SkillMeta("MongoDB", "mid", 4, 0.60, "tool", [], []),

    # Concepts
    "system design": SkillMeta("System Design", "senior", 10, 0.72, "concept", [], []),
    "microservices": SkillMeta("Microservices", "senior", 8, 0.65, "concept", [], []),
    "distributed systems": SkillMeta("Distributed Systems", "senior", 12, 0.60, "concept", [], []),
    "machine learning": SkillMeta("Machine Learning", "senior", 16, 0.70, "concept", [], []),
    "deep learning": SkillMeta("Deep Learning", "senior", 20, 0.55, "concept", [], []),

    # Soft skills
    "leadership": SkillMeta("Leadership", "senior", 0, 0.50, "soft", [], []),
    "mentoring": SkillMeta("Mentoring", "senior", 0, 0.40, "soft", [], []),
    "communication": SkillMeta("Communication", "junior", 0, 0.45, "soft", [], []),
    "teamwork": SkillMeta("Teamwork", "junior", 0, 0.35, "soft", [], []),
    "problem-solving": SkillMeta("Problem Solving", "junior", 0, 0.50, "soft", [], []),
    "performance optimization": SkillMeta("Performance Optimization", "senior", 6, 0.55, "concept", [], []),
}

# ── Roadmap templates ─────────────────────────────────────────────────────

#: Short descriptive labels for each phase.
PHASE_LABELS = {
    "foundation": "Foundation — Fill Critical Gaps",
    "growth": "Growth — Build Depth",
    "mastery": "Mastery — Senior Readiness",
    "showcase": "Showcase — Prove It",
}

#: Maximum actions per phase to keep the roadmap readable.
MAX_ACTIONS_PER_PHASE = 5

#: How many weeks each phase spans at most.
PHASE_WEEK_CEILING = {
    "foundation": 8,
    "growth": 12,
    "mastery": 16,
    "showcase": 6,
}


# ── Data classes ──────────────────────────────────────────────────────────

@dataclass
class RoadmapAction:
    """One concrete step the user can take."""
    title: str
    description: str
    action_type: str  # "skill" | "project" | "certification" | "course" | "soft"
    skill_name: Optional[str]
    priority: str  # "critical" | "high" | "medium" | "low"
    estimated_weeks: int
    estimated_score_impact: int  # percentage points
    category: str
    resources: List[str] = field(default_factory=list)

    def as_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RoadmapPhase:
    """A time-boxed phase in the development plan."""
    phase_key: str
    label: str
    week_start: int
    week_end: int
    actions: List[RoadmapAction] = field(default_factory=list)
    phase_summary: str = ""

    def as_dict(self) -> Dict[str, Any]:
        return {
            "phase_key": self.phase_key,
            "label": self.label,
            "week_start": self.week_start,
            "week_end": self.week_end,
            "actions": [a.as_dict() for a in self.actions],
            "phase_summary": self.phase_summary,
        }


@dataclass
class CareerPathPlan:
    """Complete career development plan."""
    target_role: str
    experience_level: str
    current_score: int
    projected_score: int
    current_skills: List[str]
    missing_skills: List[str]
    skills_to_learn: List[str]
    total_estimated_weeks: int
    phases: List[RoadmapPhase]
    quick_wins: List[RoadmapAction]
    long_term_goals: List[RoadmapAction]
    summary: str

    def as_dict(self) -> Dict[str, Any]:
        return {
            "target_role": self.target_role,
            "experience_level": self.experience_level,
            "current_score": self.current_score,
            "projected_score": self.projected_score,
            "current_skills": self.current_skills,
            "missing_skills": self.missing_skills,
            "skills_to_learn": self.skills_to_learn,
            "total_estimated_weeks": self.total_estimated_weeks,
            "phases": [p.as_dict() for p in self.phases],
            "quick_wins": [a.as_dict() for a in self.quick_wins],
            "long_term_goals": [a.as_dict() for a in self.long_term_goals],
            "summary": self.summary,
        }


# ── Core engine ───────────────────────────────────────────────────────────

def _lookup_skill(name: str) -> Optional[SkillMeta]:
    """Look up a skill in the catalog, case-insensitively."""
    key = name.lower().strip()
    return SKILL_CATALOG.get(key)


def _priority_for_impact(impact_weight: float, missing: bool) -> str:
    """Map impact weight + missing flag to a human-readable priority."""
    if missing and impact_weight >= 0.75:
        return "critical"
    if missing and impact_weight >= 0.50:
        return "high"
    if missing:
        return "medium"
    return "low"


def _estimate_score_impact(impact_weight: float, tier: str, level: str) -> int:
    """Estimate how many ATS-score points this skill adds when learned.

    The estimate depends on how missing skills are currently weighted in the
    scoring engine (see ``scoring.py`` ``WEIGHTS["keyword_match"]``).
    """
    base = impact_weight * 30  # up to 30 points if the skill is critical
    tier_multiplier = {"junior": 1.0, "mid": 0.85, "senior": 0.7}.get(tier, 0.8)
    level_multiplier = {
        "Junior": 1.1,
        "Mid-Level": 1.0,
        "Senior": 0.85,
    }.get(level, 1.0)
    return max(1, round(base * tier_multiplier * level_multiplier))


def _make_skill_action(meta: SkillMeta, level: str) -> RoadmapAction:
    """Create a learning action for a missing skill."""
    priority = _priority_for_impact(meta.impact_weight, missing=True)
    impact = _estimate_score_impact(meta.impact_weight, meta.tier, level)
    resources = []
    if meta.related_certifications:
        resources.extend(meta.related_certifications)

    return RoadmapAction(
        title=f"Learn {meta.name}",
        description=(
            f"Study {meta.name} to {meta.tier}-level proficiency. "
            f"Estimated {meta.estimated_weeks} weeks of focused learning."
        ),
        action_type="skill",
        skill_name=meta.name,
        priority=priority,
        estimated_weeks=meta.estimated_weeks,
        estimated_score_impact=impact,
        category=meta.category,
        resources=resources,
    )


def _make_project_actions(meta: SkillMeta, level: str) -> List[RoadmapAction]:
    """Create project actions for a skill (0-2 per skill)."""
    actions = []
    for idea in meta.project_ideas[:2]:
        actions.append(RoadmapAction(
            title=f"Build: {idea}",
            description=(
                f"Apply {meta.name} knowledge in a hands-on project: {idea}. "
                f"Document it on GitHub to demonstrate practical competence."
            ),
            action_type="project",
            skill_name=meta.name,
            priority=_priority_for_impact(meta.impact_weight, missing=True),
            estimated_weeks=max(1, meta.estimated_weeks // 2),
            estimated_score_impact=max(1, _estimate_score_impact(
                meta.impact_weight, meta.tier, level
            ) // 3),
            category=meta.category,
            resources=["GitHub"],
        ))
    return actions


def _make_certification_actions(meta: SkillMeta) -> List[RoadmapAction]:
    """Create certification actions for a skill."""
    actions = []
    for cert in meta.related_certifications[:2]:
        actions.append(RoadmapAction(
            title=f"Pursue {cert}",
            description=(
                f"Obtain the {cert} certification to validate {meta.name} "
                f"expertise and strengthen your resume's credibility section."
            ),
            action_type="certification",
            skill_name=meta.name,
            priority="medium",
            estimated_weeks=4,
            estimated_score_impact=3,
            category=meta.category,
            resources=[cert],
        ))
    return actions


def _phase_actions(actions: List[RoadmapAction], phase_key: str,
                   experience_level: str) -> List[RoadmapAction]:
    """Select and limit actions for a given phase."""
    # Filter by priority for each phase
    phase_priority_map = {
        "foundation": {"critical", "high"},
        "growth": {"high", "medium"},
        "mastery": {"medium", "low"},
        "showcase": {"medium", "low"},
    }
    allowed_priorities = phase_priority_map.get(phase_key, {"medium", "low"})
    filtered = [a for a in actions if a.priority in allowed_priorities]

    # Sort: higher impact first, then shorter time
    filtered.sort(key=lambda a: (-a.estimated_score_impact, a.estimated_weeks))
    return filtered[:MAX_ACTIONS_PER_PHASE]


def _build_phases(
    all_actions: List[RoadmapAction],
    experience_level: str,
) -> List[RoadmapPhase]:
    """Distribute actions across four phases with rolling week counters."""
    phases: List[RoadmapPhase] = []
    week_cursor = 1

    for phase_key in ("foundation", "growth", "mastery", "showcase"):
        phase_actions = _phase_actions(all_actions, phase_key, experience_level)
        week_ceiling = PHASE_WEEK_CEILING[phase_key]
        total_weeks = sum(a.estimated_weeks for a in phase_actions)
        phase_weeks = min(week_ceiling, max(1, total_weeks)) if phase_actions else 0

        if phase_actions:
            summaries = {
                "foundation": (
                    "Focus on the highest-impact missing skills that unlock "
                    "the most ATS points. These are non-negotiable for a "
                    "competitive resume."
                ),
                "growth": (
                    "Build depth with projects and secondary skills that "
                    "differentiate you from other candidates."
                ),
                "mastery": (
                    "Pursue certifications and senior-level concepts that "
                    "signal expertise beyond day-to-day coding."
                ),
                "showcase": (
                    "Create portfolio projects and public demonstrations "
                    "that prove your skills in action."
                ),
            }
            phases.append(RoadmapPhase(
                phase_key=phase_key,
                label=PHASE_LABELS[phase_key],
                week_start=week_cursor,
                week_end=week_cursor + phase_weeks - 1,
                actions=phase_actions,
                phase_summary=summaries.get(phase_key, ""),
            ))
            week_cursor += phase_weeks
        else:
            phases.append(RoadmapPhase(
                phase_key=phase_key,
                label=PHASE_LABELS[phase_key],
                week_start=week_cursor,
                week_end=week_cursor,
                actions=[],
                phase_summary="No actions in this phase — great progress!",
            ))

    return phases


def _compute_projected_score(current_score: int, actions: List[RoadmapAction]) -> int:
    """Project the score after completing all high-impact actions.

    Diminishing returns: each successive action contributes less.
    """
    sorted_actions = sorted(actions, key=lambda a: -a.estimated_score_impact)
    projected = current_score
    diminishing = 1.0
    for action in sorted_actions:
        contribution = action.estimated_score_impact * diminishing
        projected += contribution
        diminishing *= 0.7  # 30% less impact per subsequent action
    return min(100, round(projected))


def _generate_summary(
    target_role: str,
    experience_level: str,
    current_score: int,
    projected_score: int,
    missing_count: int,
    total_weeks: int,
) -> str:
    """Write a human-readable plan summary."""
    if current_score >= 80:
        opening = "Your resume is already strong."
    elif current_score >= 60:
        opening = "Your resume has a solid foundation."
    elif current_score >= 40:
        opening = "Your resume has room for significant improvement."
    else:
        opening = "Your resume needs substantial work."

    gain = projected_score - current_score
    if missing_count == 0:
        return (
            f"{opening} No critical skill gaps were detected for the "
            f"{target_role} role at the {experience_level} level."
        )
    return (
        f"{opening} For a {experience_level} {target_role} role, "
        f"{missing_count} skill gap{'s' if missing_count != 1 else ''} "
        f"were identified. Following this plan over approximately "
        f"{total_weeks} weeks could improve your score by up to "
        f"{gain} points to a projected {projected_score}/100."
    )


# ── Public API ────────────────────────────────────────────────────────────

def generate_career_path(
    *,
    target_role: str,
    experience_level: str,
    current_score: int,
    matched_skills: List[str],
    missing_skills: List[str],
    detected_skills: Optional[List[str]] = None,
) -> CareerPathPlan:
    """Build a complete career development plan.

    Args:
        target_role: The job title the user is targeting.
        experience_level: "Junior" | "Mid-Level" | "Senior".
        current_score: The user's current ATS score (0-100).
        matched_skills: Skills the user already has that match the role.
        missing_skills: Skills the role requires that the user lacks.
        detected_skills: All skills detected on the resume (optional, used
            for enriched recommendations).

    Returns:
        A ``CareerPathPlan`` with phases, quick wins, and long-term goals.
    """
    all_actions: List[RoadmapAction] = []

    # Generate actions for every missing skill
    for skill_name in missing_skills:
        meta = _lookup_skill(skill_name)
        if meta is None:
            # Unknown skill — create a generic action
            all_actions.append(RoadmapAction(
                title=f"Learn {skill_name}",
                description=(
                    f"Acquire knowledge in {skill_name} as it is required "
                    f"for the {target_role} role. Research the best learning "
                    f"resources and practice consistently."
                ),
                action_type="skill",
                skill_name=skill_name,
                priority="high",
                estimated_weeks=6,
                estimated_score_impact=5,
                category="unknown",
                resources=[],
            ))
            continue

        # Main learning action
        all_actions.append(_make_skill_action(meta, experience_level))

        # Supplementary project actions
        all_actions.extend(_make_project_actions(meta, experience_level))

        # Certification actions
        all_actions.extend(_make_certification_actions(meta))

    # Skills the user already has — long-term mastery
    long_term_goals: List[RoadmapAction] = []
    for skill_name in matched_skills[:5]:
        meta = _lookup_skill(skill_name)
        if meta is None:
            continue
        if meta.tier in ("mid", "senior"):
            long_term_goals.append(RoadmapAction(
                title=f"Deepen {meta.name} expertise",
                description=(
                    f"You already use {meta.name} — aim for advanced "
                    f"patterns, performance tuning and architectural "
                    f"decision-making with it."
                ),
                action_type="skill",
                skill_name=meta.name,
                priority="low",
                estimated_weeks=meta.estimated_weeks,
                estimated_score_impact=max(1, _estimate_score_impact(
                    meta.impact_weight * 0.3, meta.tier, experience_level
                )),
                category=meta.category,
                resources=[],
            ))

    # Quick wins: actions that are short and high impact
    quick_wins = [
        a for a in all_actions
        if a.estimated_weeks <= 3 and a.estimated_score_impact >= 3
    ]
    quick_wins.sort(key=lambda a: -a.estimated_score_impact)
    quick_wins = quick_wins[:5]

    # Build phases
    phases = _build_phases(all_actions, experience_level)

    # Score projection
    projected = _compute_projected_score(current_score, all_actions)

    # Total weeks
    total_weeks = max(
        (p.week_end for p in phases if p.actions), default=0
    )

    # Summary
    summary = _generate_summary(
        target_role, experience_level, current_score, projected,
        len(missing_skills), total_weeks,
    )

    # Collect skills to learn (ordered by impact)
    skill_actions = [a for a in all_actions if a.action_type == "skill"]
    skill_actions.sort(key=lambda a: -a.estimated_score_impact)
    skills_to_learn = [a.skill_name for a in skill_actions if a.skill_name]

    return CareerPathPlan(
        target_role=target_role,
        experience_level=experience_level,
        current_score=current_score,
        projected_score=projected,
        current_skills=matched_skills,
        missing_skills=missing_skills,
        skills_to_learn=skills_to_learn,
        total_estimated_weeks=total_weeks,
        phases=phases,
        quick_wins=quick_wins,
        long_term_goals=long_term_goals,
        summary=summary,
    )
