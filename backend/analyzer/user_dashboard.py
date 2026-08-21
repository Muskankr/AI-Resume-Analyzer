import json
from collections import Counter
from django.db.models import Avg, Count
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import ResumeAnalysis

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats_view(request):
    """
    Returns aggregated dashboard statistics for the authenticated user,
    including overall averages, role-specific metrics, and skill trends.
    """
    user = request.user
    analyses = ResumeAnalysis.objects.filter(user=user)

    total_analyses = analyses.count()
    if total_analyses == 0:
        return Response({
            "total_analyses": 0,
            "average_score": 0,
            "scores_by_role": [],
            "top_skills_found": [],
            "top_skills_missing": [],
            "recent_timeline": []
        })

    average_score = analyses.aggregate(avg_score=Avg('score'))['avg_score'] or 0

    scores_by_role_qs = analyses.values('target_role').annotate(
        avg_score=Avg('score'),
        count=Count('id')
    ).order_by('-count')

    scores_by_role = [
        {
            "role": item['target_role'],
            "average_score": round(item['avg_score'], 1),
            "count": item['count']
        }
        for item in scores_by_role_qs
    ]

    all_found_skills = []
    all_missing_skills = []

    # Flatten skills for frequency analysis.
    # Note: Using python-level iteration since JSONField aggregation is complex in raw ORM.
    for analysis in analyses.only('skills_found', 'missing_skills', 'created_at', 'score', 'target_role', 'file_name'):
        if isinstance(analysis.skills_found, list):
            all_found_skills.extend([s.lower() for s in analysis.skills_found])
        if isinstance(analysis.missing_skills, list):
            all_missing_skills.extend([s.lower() for s in analysis.missing_skills])

    top_found = Counter(all_found_skills).most_common(10)
    top_missing = Counter(all_missing_skills).most_common(10)

    # Latest 10 timeline events for sparklines
    recent_qs = analyses.order_by('-created_at')[:10]
    recent_timeline = [
        {
            "id": a.id,
            "created_at": a.created_at.isoformat(),
            "score": a.score,
            "target_role": a.target_role,
            "file_name": a.file_name
        }
        for a in reversed(list(recent_qs))  # chronological order for charting
    ]

    return Response({
        "total_analyses": total_analyses,
        "average_score": round(average_score, 1),
        "scores_by_role": scores_by_role,
        "top_skills_found": [{"skill": k, "count": v} for k, v in top_found],
        "top_skills_missing": [{"skill": k, "count": v} for k, v in top_missing],
        "recent_timeline": recent_timeline
    })
