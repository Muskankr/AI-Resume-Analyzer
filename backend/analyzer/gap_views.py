"""
Views for Gap Narrative Builder.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .gap_narrative import detect_gaps, generate_narratives
from .gap_serializers import (
    GapNarrativeRequestSerializer,
    GapNarrativeResponseSerializer,
)


class GapNarrativeView(APIView):
    """API View to detect resume gaps and generate professional narratives."""

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

            response_data = {
                "total_gaps_detected": len(enriched_gaps),
                "gaps": enriched_gaps,
            }

            response_serializer = GapNarrativeResponseSerializer(data=response_data)
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {
                    "error": "An unexpected error occurred during gap analysis.",
                    "details": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
