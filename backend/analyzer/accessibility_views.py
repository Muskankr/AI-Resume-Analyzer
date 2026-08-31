"""
Views for Accessibility Checker.

Exposes the POST /api/check-accessibility/ endpoint.
"""

import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import AnonRateThrottle
from .accessibility_checker import check_accessibility, calculate_accessibility_score
from .accessibility_serializers import (
    AccessibilityCheckRequestSerializer,
    AccessibilityReportResponseSerializer,
)

logger = logging.getLogger(__name__)


class AccessibilityCheckThrottle(AnonRateThrottle):
    """Caps /api/check-accessibility/.

    ``DEFAULT_PERMISSION_CLASSES`` is ``AllowAny`` and this view does not
    override it, so the endpoint is open. It runs five regex passes over a
    body the caller controls the size of. Rate from
    ``DEFAULT_THROTTLE_RATES["accessibility_check"]``.

    ``scope`` is set explicitly: every ``AnonRateThrottle`` subclass inherits
    the scope "anon" otherwise, which would put this endpoint in the same
    bucket as unrelated ones.
    """

    scope = "accessibility_check"


class AccessibilityCheckView(APIView):
    """
    API View to handle resume accessibility checking requests.
    """

    throttle_classes = [AccessibilityCheckThrottle]

    def post(self, request, *args, **kwargs):
        """
        Process resume text and return an accessibility compliance report.
        """
        request_serializer = AccessibilityCheckRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {"errors": request_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resume_text = request_serializer.validated_data["resume_text"]

        try:
            findings = check_accessibility(resume_text)
            score = calculate_accessibility_score(findings)

            response_data = {
                "findings": findings,
                "accessibility_score": score,
                "total_issues": len(findings),
            }

            response_serializer = AccessibilityReportResponseSerializer(
                data=response_data
            )
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception:
            # `str(e)` used to go back in the response body. That hands the
            # caller file paths, SQL and library internals on any unexpected
            # failure; the operator wants that detail, the client does not.
            logger.exception("Accessibility check failed")
            return Response(
                {"error": "An unexpected error occurred during accessibility check."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
