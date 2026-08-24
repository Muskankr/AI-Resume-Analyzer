"""API endpoints for managing and publicly rendering a user's score badge."""

from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .badge import generate_score_badge
from .badge_models import ResumeBadge
from .models import ResumeAnalysis


def _latest_analysis(user):
    return (
        ResumeAnalysis.objects
        .filter(user=user)
        .only("score", "created_at", "id")
        .order_by("-created_at", "-id")
        .first()
    )


def _badge_payload(request, badge):
    svg_url = request.build_absolute_uri(f"/api/badge/{badge.badge_id}/svg/")
    return {
        "badge_id": str(badge.badge_id),
        "enabled": badge.enabled,
        "badge_url": svg_url,
        "markdown": f"![ATS Score]({svg_url})",
    }


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def manage_resume_badge(request):
    """Create/retrieve the stable badge URL for the signed-in user."""
    badge, _ = ResumeBadge.objects.get_or_create(user=request.user)
    return Response(_badge_payload(request, badge), status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def resume_score_badge(request, badge_id):
    """Render the user's latest ATS score as an embeddable SVG.

    This endpoint intentionally performs a fresh latest-analysis lookup on every
    request. The badge therefore keeps the same URL while reflecting the user's
    newest analysis rather than becoming a snapshot of the score at creation.
    No authentication or resume-derived content is exposed by this endpoint.
    """
    badge = (
        ResumeBadge.objects
        .select_related("user")
        .filter(badge_id=badge_id, enabled=True)
        .first()
    )
    if badge is None:
        return HttpResponse("Badge not found", status=404, content_type="text/plain")

    analysis = _latest_analysis(badge.user)
    score = analysis.score if analysis is not None else None
    svg = generate_score_badge(score)

    response = HttpResponse(svg, content_type="image/svg+xml; charset=utf-8")
    response["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response["Pragma"] = "no-cache"
    response["Expires"] = "0"
    response["X-Content-Type-Options"] = "nosniff"
    return response
