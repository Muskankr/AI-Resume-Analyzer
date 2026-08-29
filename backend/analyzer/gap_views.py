"""
Views for Gap Narrative Builder.
"""

import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import AnonRateThrottle
from .gap_narrative import detect_gaps, generate_narratives
from .gap_serializers import (
    GapNarrativeRequestSerializer,
    GapNarrativeResponseSerializer,
)


logger = logging.getLogger(__name__)


class GapNarrativeThrottle(AnonRateThrottle):
    """Caps the GapNarrativeView endpoint.

    ``DEFAULT_PERMISSION_CLASSES`` is ``AllowAny`` and this view does not
    override it, so the endpoint is open. It parses a caller-supplied
    timeline and renders ten narrative templates per detected gap. Rate from
    ``DEFAULT_THROTTLE_RATES["gap_narrative"]``.

    ``scope`` is set explicitly: every ``AnonRateThrottle`` subclass inherits
    the scope "anon" otherwise, which would put this endpoint in the same
    bucket as unrelated ones.
    """

    scope = "gap_narrative"


class GapNarrativeView(APIView):
    """API View to detect resume gaps and generate professional narratives."""

    throttle_classes = [GapNarrativeThrottle]

    def post(self, request, *args, **kwargs):
        request_serializer = GapNarrativeRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {"errors": request_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        timeline_data = request_serializer.validated_data["timeline_data"]
        context = request_serializer.validated_data.get("context", {})

        try:
            raw_gaps = detect_gaps(timeline_data)
            enriched_gaps = generate_narratives(raw_gaps, context)

            # GapNarrativeResponseSerializer declares total_narratives_generated
            # as required. Omitting it made is_valid(raise_exception=True) throw,
            # which the except below turned into a 500 -- so every *successful*
            # analysis returned "an unexpected error occurred".
            response_data = {
                "total_gaps_detected": len(enriched_gaps),
                "gaps": enriched_gaps,
                "total_narratives_generated": sum(
                    len(gap["narratives"]) for gap in enriched_gaps
                ),
            }

            response_serializer = GapNarrativeResponseSerializer(data=response_data)
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception:
            # `str(e)` used to go back in a "details" field. That hands the
            # caller file paths, SQL and library internals on any unexpected
            # failure; the operator wants that detail, the client does not.
            logger.exception("Gap narrative generation failed")
            return Response(
                {"error": "An unexpected error occurred during gap analysis."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
