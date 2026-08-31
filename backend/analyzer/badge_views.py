"""API endpoints for managing and publicly rendering a user's score badge."""

import uuid

from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .badge import generate_score_badge
from .badge_models import ResumeBadge
from .badge_serializers import ResumeBadgeUpdateSerializer
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
    """What the client needs to render the badge panel.

    ``badge_url`` and ``markdown`` are returned whether or not the badge is
    enabled, which is the opposite of what ``ShareStateSerializer`` does with
    ``share_url``. The two cases are genuinely different: a revoked share link
    is dead and copying it would be pointless, whereas a disabled badge keeps
    the same URL and starts working again the moment it is re-enabled. It is
    paused, not gone. Rotating is what makes a badge URL dead, and rotating
    returns the new one.

    The client is told ``enabled`` and decides what to show; it is not left to
    infer state from a missing field.
    """
    svg_url = request.build_absolute_uri(f"/api/badge/{badge.badge_id}/svg/")
    return {
        "badge_id": str(badge.badge_id),
        "enabled": badge.enabled,
        "badge_url": svg_url,
        "markdown": f"![ATS Score]({svg_url})",
        "updated_at": badge.updated_at.isoformat() if badge.updated_at else None,
    }


@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsAuthenticated])
def manage_resume_badge(request):
    """Read, reconfigure or switch off the signed-in user's badge.

    ``GET`` returns the current state, creating the row on first call. The
    other two verbs were the gap this endpoint had (#865): ``ResumeBadge`` has
    carried an ``enabled`` column since it was added, ``resume_score_badge``
    has always 404'd on it and ``tests_badge`` has always covered that path --
    by flipping the column directly in the ORM, because nothing in the API
    could produce a disabled badge. The score of a user who had opened an
    analysis once was published at a permanent URL they had no way to withdraw.

    ``POST`` takes ``enabled`` and/or ``rotate``. ``DELETE`` disables, matching
    the verb the share endpoint next to it uses for the same meaning.
    """
    badge, _ = ResumeBadge.objects.get_or_create(user=request.user)

    if request.method == "GET":
        return Response(_badge_payload(request, badge), status=status.HTTP_200_OK)

    if request.method == "DELETE":
        # Disable rather than delete the row. The badge_id is the user's
        # published identifier; destroying it would mean a later `GET` mints a
        # different one, so a link someone had turned off would silently come
        # back pointing somewhere else. Rotation is the explicit way to change
        # the URL.
        if badge.enabled:
            badge.enabled = False
            badge.save(update_fields=["enabled", "updated_at"])
        return Response(_badge_payload(request, badge), status=status.HTTP_200_OK)

    serializer = ResumeBadgeUpdateSerializer(data=request.data)
    unknown = serializer.unknown_fields()
    if unknown:
        return Response(
            {
                "detail": (
                    "Unrecognised field(s): " + ", ".join(unknown) + ". "
                    "This endpoint accepts `enabled` and `rotate`."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    serializer.is_valid(raise_exception=True)

    changed = []

    if serializer.validated_data.get("rotate"):
        badge.badge_id = uuid.uuid4()
        changed.append("badge_id")

    if "enabled" in serializer.validated_data:
        badge.enabled = serializer.validated_data["enabled"]
        changed.append("enabled")

    if changed:
        badge.save(update_fields=[*changed, "updated_at"])

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
