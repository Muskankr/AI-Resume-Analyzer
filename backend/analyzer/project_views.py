"""
Views for Project Portfolio Extractor.
"""

import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import AnonRateThrottle
from .project_extractor import analyze_portfolio
from .project_serializers import (
    ProjectExtractionRequestSerializer,
    ProjectExtractionResponseSerializer,
)


logger = logging.getLogger(__name__)


class ProjectExtractionThrottle(AnonRateThrottle):
    """Caps the ProjectExtractionView endpoint.

    ``DEFAULT_PERMISSION_CLASSES`` is ``AllowAny`` and this view does not
    override it, so the endpoint is open. It runs the metric, action-verb
    and tech-stack passes over every project it finds in a caller-supplied
    body. Rate from ``DEFAULT_THROTTLE_RATES["project_extraction"]``.

    ``scope`` is set explicitly: every ``AnonRateThrottle`` subclass inherits
    the scope "anon" otherwise, which would put this endpoint in the same
    bucket as unrelated ones.
    """

    scope = "project_extraction"


class ProjectExtractionView(APIView):
    """API View to extract and score resume projects."""

    throttle_classes = [ProjectExtractionThrottle]

    def post(self, request, *args, **kwargs):
        request_serializer = ProjectExtractionRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {"errors": request_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resume_text = request_serializer.validated_data["resume_text"]

        try:
            projects = analyze_portfolio(resume_text)

            avg_score = 0.0
            if projects:
                avg_score = sum(p["impact_score"] for p in projects) / len(projects)

            response_data = {
                "total_projects_found": len(projects),
                "average_impact_score": round(avg_score, 1),
                "projects": projects,
            }

            response_serializer = ProjectExtractionResponseSerializer(
                data=response_data
            )
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception:
            # `str(e)` used to go back in a "details" field. That hands the
            # caller file paths, SQL and library internals on any unexpected
            # failure; the operator wants that detail, the client does not.
            logger.exception("Project extraction failed")
            return Response(
                {"error": "An unexpected error occurred during project extraction."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
