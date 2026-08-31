"""
Resume Score History & Trend Analysis Engine.

Aggregates a user's analysis history into trend data, improvement metrics,
skill progression tracking, and comparative analytics across resume versions.

Provides:
    - Score trend over time (with moving averages)
    - Improvement rate and velocity
    - Skill acquisition tracking (new skills gained per analysis)
    - Role-specific performance comparison
    - Monthly/weekly aggregation
    - Best/worst/average score statistics
"""

from __future__ import annotations

import statistics
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from datetime import timedelta
from typing import Any, Dict, List, Optional

from django.db.models import QuerySet
from django.utils import timezone


# ── Data classes ──────────────────────────────────────────────────────────

@dataclass
class ScoreDataPoint:
    """A single analysis entry in the timeline."""
    analysis_id: int
    score: int
    target_role: str
    created_at: str  # ISO format
    skills_count: int
    matched_count: int
    missing_count: int
    file_name: str

    def as_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class TrendStats:
    """Statistical summary of score trends."""
    current_score: int
    highest_score: int
    lowest_score: int
    average_score: float
    median_score: float
    total_analyses: int
    score_range: int
    std_deviation: float

    def as_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ImprovementMetrics:
    """Metrics measuring improvement over time."""
    total_improvement: int  # first to last score difference
    average_improvement_per_analysis: float
    improvement_rate_percent: float  # percentage improvement
    analyses_with_improvement: int
    analyses_with_decline: int
    analyses_unchanged: int
    best_single_jump: int  # largest positive score change between consecutive analyses
    improvement_streak: int  # consecutive analyses with score increase
    longest_streak: int

    def as_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class SkillProgression:
    """Tracks how skills have changed across analyses."""
    total_unique_skills: int
    consistently_matched: List[str]  # skills present in all analyses
    newly_acquired: List[str]  # skills gained since first analysis
    lost_skills: List[str]  # skills present in first but not latest
    skill_frequency: Dict[str, int]  # how many analyses each skill appeared in
    skill_trend: List[Dict[str, Any]]  # per-skill presence across analyses

    def as_dict(self) -> Dict[str, Any]:
        return {
            "total_unique_skills": self.total_unique_skills,
            "consistently_matched": self.consistently_matched,
            "newly_acquired": self.newly_acquired,
            "lost_skills": self.lost_skills,
            "skill_frequency": self.skill_frequency,
            "skill_trend": self.skill_trend,
        }


@dataclass
class MonthlyAggregation:
    """Aggregated data for a month."""
    month: str  # "2026-08"
    analysis_count: int
    average_score: float
    highest_score: int
    lowest_score: int
    score_delta: int  # change from previous month's average

    def as_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RolePerformance:
    """Performance breakdown by target role."""
    role: str
    analysis_count: int
    average_score: float
    highest_score: int
    lowest_score: int
    most_common_matched: List[str]
    most_common_missing: List[str]

    def as_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ScoreHistoryResult:
    """Complete score history analysis."""
    timeline: List[ScoreDataPoint]
    trend_stats: TrendStats
    improvement_metrics: ImprovementMetrics
    skill_progression: SkillProgression
    monthly_data: List[MonthlyAggregation]
    role_performance: List[RolePerformance]
    moving_average: List[Optional[float]]
    summary: str

    def as_dict(self) -> Dict[str, Any]:
        return {
            "timeline": [p.as_dict() for p in self.timeline],
            "trend_stats": self.trend_stats.as_dict(),
            "improvement_metrics": self.improvement_metrics.as_dict(),
            "skill_progression": self.skill_progression.as_dict(),
            "monthly_data": [m.as_dict() for m in self.monthly_data],
            "role_performance": [r.as_dict() for r in self.role_performance],
            "moving_average": self.moving_average,
            "summary": self.summary,
        }


# ── Engine ────────────────────────────────────────────────────────────────

def _compute_moving_average(scores: List[int], window: int = 3) -> List[Optional[float]]:
    """Compute a simple moving average with the given window size."""
    result: List[Optional[float]] = []
    for i in range(len(scores)):
        start = max(0, i - window + 1)
        subset = scores[start:i + 1]
        result.append(round(statistics.mean(subset), 1))
    return result


def _compute_trend_stats(scores: List[int]) -> TrendStats:
    """Compute statistical summary of scores."""
    if not scores:
        return TrendStats(0, 0, 0, 0.0, 0, 0, 0, 0.0)

    return TrendStats(
        current_score=scores[-1] if scores else 0,
        highest_score=max(scores),
        lowest_score=min(scores),
        average_score=round(statistics.mean(scores), 1),
        median_score=statistics.median(scores),
        total_analyses=len(scores),
        score_range=max(scores) - min(scores),
        std_deviation=round(statistics.stdev(scores), 1) if len(scores) > 1 else 0.0,
    )


def _compute_improvement_metrics(scores: List[int]) -> ImprovementMetrics:
    """Compute improvement metrics from a chronological score list."""
    if len(scores) < 2:
        return ImprovementMetrics(
            total_improvement=0,
            average_improvement_per_analysis=0.0,
            improvement_rate_percent=0.0,
            analyses_with_improvement=0,
            analyses_with_decline=0,
            analyses_unchanged=len(scores),
            best_single_jump=0,
            improvement_streak=0,
            longest_streak=0,
        )

    total_improvement = scores[-1] - scores[0]
    diffs = [scores[i] - scores[i - 1] for i in range(1, len(scores))]

    improvements = sum(1 for d in diffs if d > 0)
    declines = sum(1 for d in diffs if d < 0)
    unchanged = sum(1 for d in diffs if d == 0)
    best_jump = max(diffs) if diffs else 0

    # Streaks
    current_streak = 0
    longest_streak = 0
    streak = 0
    for d in diffs:
        if d > 0:
            streak += 1
            longest_streak = max(longest_streak, streak)
        else:
            streak = 0
    current_streak = streak

    improvement_rate = (
        (total_improvement / max(1, scores[0])) * 100
    ) if scores[0] > 0 else 0.0

    return ImprovementMetrics(
        total_improvement=total_improvement,
        average_improvement_per_analysis=round(
            sum(diffs) / len(diffs), 1
        ) if diffs else 0.0,
        improvement_rate_percent=round(improvement_rate, 1),
        analyses_with_improvement=improvements,
        analyses_with_decline=declines,
        analyses_unchanged=unchanged,
        best_single_jump=best_jump,
        improvement_streak=current_streak,
        longest_streak=longest_streak,
    )


def _compute_skill_progression(analyses: List[Dict]) -> SkillProgression:
    """Track skill changes across analysis history."""
    if not analyses:
        return SkillProgression(
            total_unique_skills=0,
            consistently_matched=[],
            newly_acquired=[],
            lost_skills=[],
            skill_frequency={},
            skill_trend=[],
        )

    all_skills: set = set()
    skill_appearances: Dict[str, int] = defaultdict(int)

    for a in analyses:
        matched = set(a.get("matched_skills") or [])
        all_skills.update(matched)
        for s in matched:
            skill_appearances[s] += 1

    total_analyses = len(analyses)
    first_matched = set(analyses[0].get("matched_skills") or [])
    latest_matched = set(analyses[-1].get("matched_skills") or [])

    consistently_matched = sorted(
        s for s in all_skills
        if skill_appearances[s] == total_analyses
    )
    newly_acquired = sorted(latest_matched - first_matched)
    lost_skills = sorted(first_matched - latest_matched)

    # Per-skill trend (present in each analysis)
    skill_trend = []
    for skill in sorted(all_skills)[:15]:  # Top 15 by name
        presence = [
            skill in set(a.get("matched_skills") or [])
            for a in analyses
        ]
        skill_trend.append({
            "skill": skill,
            "presence": presence,
            "appearances": skill_appearances[skill],
        })

    return SkillProgression(
        total_unique_skills=len(all_skills),
        consistently_matched=consistently_matched,
        newly_acquired=newly_acquired,
        lost_skills=lost_skills,
        skill_frequency=dict(skill_appearances),
        skill_trend=skill_trend,
    )


def _compute_monthly_data(analyses: List[Dict]) -> List[MonthlyAggregation]:
    """Aggregate scores by month."""
    if not analyses:
        return []

    monthly: Dict[str, List[int]] = defaultdict(list)
    for a in analyses:
        month_key = a.get("month_key", "")
        if month_key:
            monthly[month_key].append(a["score"])

    sorted_months = sorted(monthly.keys())
    result: List[MonthlyAggregation] = []
    prev_avg = 0.0

    for month in sorted_months:
        scores = monthly[month]
        avg = round(statistics.mean(scores), 1)
        result.append(MonthlyAggregation(
            month=month,
            analysis_count=len(scores),
            average_score=avg,
            highest_score=max(scores),
            lowest_score=min(scores),
            score_delta=round(avg - prev_avg, 1),
        ))
        prev_avg = avg

    return result


def _compute_role_performance(analyses: List[Dict]) -> List[RolePerformance]:
    """Performance breakdown by target role."""
    by_role: Dict[str, List[Dict]] = defaultdict(list)
    for a in analyses:
        role = a.get("target_role") or "Unknown"
        by_role[role].append(a)

    result: List[RolePerformance] = []
    for role, items in sorted(by_role.items(), key=lambda x: -len(x[1])):
        scores = [i["score"] for i in items]
        all_matched: Dict[str, int] = defaultdict(int)
        all_missing: Dict[str, int] = defaultdict(int)
        for item in items:
            for s in (item.get("matched_skills") or []):
                all_matched[s] += 1
            for s in (item.get("missing_skills") or []):
                all_missing[s] += 1

        top_matched = sorted(all_matched.items(), key=lambda x: -x[1])[:5]
        top_missing = sorted(all_missing.items(), key=lambda x: -x[1])[:5]

        result.append(RolePerformance(
            role=role,
            analysis_count=len(items),
            average_score=round(statistics.mean(scores), 1),
            highest_score=max(scores),
            lowest_score=min(scores),
            most_common_matched=[s for s, _ in top_matched],
            most_common_missing=[s for s, _ in top_missing],
        ))

    return result


def _generate_summary(
    trend: TrendStats,
    improvement: ImprovementMetrics,
    skill_prog: SkillProgression,
) -> str:
    """Write a human-readable summary."""
    if trend.total_analyses == 0:
        return "No analysis history found. Upload a resume to start tracking your progress."

    if trend.total_analyses == 1:
        return (
            f"This is your first analysis with a score of {trend.current_score}/100. "
            f"Upload more resumes to see trends and track improvement."
        )

    parts = []

    if improvement.total_improvement > 0:
        parts.append(
            f"You've improved by {improvement.total_improvement} points across "
            f"{trend.total_analyses} analyses (from {trend.lowest_score} to {trend.current_score})."
        )
    elif improvement.total_improvement < 0:
        parts.append(
            f"Your score has declined by {abs(improvement.total_improvement)} points. "
            f"Review the suggestions from your highest-scoring analysis."
        )
    else:
        parts.append(f"Your scores have been consistent around {trend.average_score}/100.")

    if improvement.improvement_streak > 1:
        parts.append(f"Current improvement streak: {improvement.improvement_streak} analyses.")

    if skill_prog.newly_acquired:
        parts.append(
            f"New skills acquired: {', '.join(skill_prog.newly_acquired[:3])}."
        )

    if skill_prog.lost_skills:
        parts.append(
            f"Skills no longer matched: {', '.join(skill_prog.lost_skills[:3])}."
        )

    return " ".join(parts)


# ── Public API ────────────────────────────────────────────────────────────

def analyse_score_history(analyses_queryset: QuerySet) -> ScoreHistoryResult:
    """Analyse a user's analysis history and produce trend data.

    Args:
        analyses_queryset: A Django QuerySet of ResumeAnalysis objects,
            ordered by created_at ascending.

    Returns:
        A ``ScoreHistoryResult`` with timeline, stats, and analytics.
    """
    analyses = list(analyses_queryset.order_by("created_at", "id"))

    if not analyses:
        empty_trend = TrendStats(0, 0, 0, 0.0, 0, 0, 0, 0.0)
        empty_improvement = ImprovementMetrics(
            0, 0.0, 0.0, 0, 0, 0, 0, 0, 0
        )
        empty_skills = SkillProgression(0, [], [], [], {}, [])
        return ScoreHistoryResult(
            timeline=[],
            trend_stats=empty_trend,
            improvement_metrics=empty_improvement,
            skill_progression=empty_skills,
            monthly_data=[],
            role_performance=[],
            moving_average=[],
            summary="No analysis history found.",
        )

    # Build timeline
    timeline: List[ScoreDataPoint] = []
    scores: List[int] = []
    analysis_dicts: List[Dict] = []

    for a in analyses:
        sp = ScoreDataPoint(
            analysis_id=a.id,
            score=a.score,
            target_role=a.target_role or "",
            created_at=a.created_at.isoformat() if a.created_at else "",
            skills_count=len(a.skills_found or []),
            matched_count=len(a.matched_skills or []),
            missing_count=len(a.missing_skills or []),
            file_name=a.file_name or "",
        )
        timeline.append(sp)
        scores.append(a.score)

        month_key = a.created_at.strftime("%Y-%m") if a.created_at else ""
        analysis_dicts.append({
            "id": a.id,
            "score": a.score,
            "target_role": a.target_role or "",
            "matched_skills": a.matched_skills or [],
            "missing_skills": a.missing_skills or [],
            "month_key": month_key,
        })

    trend_stats = _compute_trend_stats(scores)
    improvement_metrics = _compute_improvement_metrics(scores)
    skill_progression = _compute_skill_progression(analysis_dicts)
    monthly_data = _compute_monthly_data(analysis_dicts)
    role_performance = _compute_role_performance(analysis_dicts)
    moving_average = _compute_moving_average(scores)
    summary = _generate_summary(trend_stats, improvement_metrics, skill_progression)

    return ScoreHistoryResult(
        timeline=timeline,
        trend_stats=trend_stats,
        improvement_metrics=improvement_metrics,
        skill_progression=skill_progression,
        monthly_data=monthly_data,
        role_performance=role_performance,
        moving_average=moving_average,
        summary=summary,
    )
