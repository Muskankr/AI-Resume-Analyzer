"""
Views for ATS Reading Flow Simulator and Section Reorderer.

Exposes the POST /api/simulate-ats-flow/ endpoint.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import serializers
from .ats_flow_simulator import simulate_ats_flow


class ATSFlowRequestSerializer(serializers.Serializer):
    """Serializer to validate the incoming request for ATS flow simulation."""

    resume_text = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=10000,
        help_text="The full text of the resume to analyze for parsing flow.",
    )


class SectionDetailSerializer(serializers.Serializer):
    """Serializer for a single detected resume section."""

    name = serializers.CharField()
    content_length = serializers.IntegerField()
    has_dead_zone = serializers.BooleanField()


class ATSFlowResponseSerializer(serializers.Serializer):
    """Serializer to structure the full ATS flow simulation response."""

    sections = SectionDetailSerializer(many=True)
    flow_score = serializers.IntegerField(min_value=0, max_value=100)
    suggestions = serializers.ListField(child=serializers.CharField())


class ATSFlowView(APIView):
    """
    API View to handle ATS reading flow simulation requests.
    """

    def post(self, request, *args, **kwargs):
        """
        Process resume text and return ATS flow analysis with reordering suggestions.
        """
        # Validate incoming data
        request_serializer = ATSFlowRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {"errors": request_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resume_text = request_serializer.validated_data["resume_text"]

        try:
            # Simulate ATS flow
            analysis_result = simulate_ats_flow(resume_text)

            # Validate and return response
            response_serializer = ATSFlowResponseSerializer(data=analysis_result)
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {
                    "error": "An unexpected error occurred during ATS flow simulation.",
                    "details": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
