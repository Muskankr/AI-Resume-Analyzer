"""
Resume A/B Testing Framework Logic.

Contains aggregation logic to compute statistical win rates and determine
the most effective resume variant based on application outcomes.
"""

from typing import Dict, Any, List
from django.db.models import Count, Q
from .models import ApplicationLog


def calculate_resume_win_rates(user_id: int) -> Dict[str, Any]:
    """
    Calculates the success rate of different resume versions for a specific user.

    Args:
        user_id (int): The ID of the user.

    Returns:
        Dict[str, Any]: Aggregated statistics on resume performance.
    """
    # Get all application logs for the user, grouped by resume_analysis_id
    logs = ApplicationLog.objects.filter(user_id=user_id).select_related(
        "resume_analysis"
    )

    if not logs.exists():
        return {
            "total_applications": 0,
            "resume_stats": [],
            "best_performing_resume_id": None,
        }

    resume_stats = []
    best_resume_id = None
    best_success_rate = -1.0

    # Group by resume_analysis_id
    resume_ids = logs.values_list("resume_analysis_id", flat=True).distinct()

    for res_id in resume_ids:
        res_logs = logs.filter(resume_analysis_id=res_id)
        total = res_logs.count()

        # Define success as 'interviewed' or 'offered'
        successes = res_logs.filter(status__in=["interviewed", "offered"]).count()
        success_rate = (successes / total * 100) if total > 0 else 0.0

        # Get resume details if available
        resume_name = "Unknown Resume"
        if res_id:
            try:
                from .models import ResumeAnalysis

                analysis = ResumeAnalysis.objects.get(id=res_id)
                resume_name = analysis.file_name or f"Analysis {res_id}"
            except Exception:
                pass

        stats_entry = {
            "resume_id": res_id,
            "resume_name": resume_name,
            "total_applications": total,
            "successful_applications": successes,
            "success_rate": round(success_rate, 2),
        }
        resume_stats.append(stats_entry)

        if success_rate > best_success_rate:
            best_success_rate = success_rate
            best_resume_id = res_id

    # Sort by success rate descending
    resume_stats.sort(key=lambda x: x["success_rate"], reverse=True)

    return {
        "total_applications": logs.count(),
        "resume_stats": resume_stats,
        "best_performing_resume_id": best_resume_id,
    }
