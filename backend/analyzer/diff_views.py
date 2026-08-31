"""
API endpoints to accept two resume texts and return the structured semantic diff.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiResponse
from .diff_serializers import (
    SemanticDiffRequestSerializer,
    SemanticDiffResponseSerializer,
)
from .semantic_differ import SemanticDiffer
from rest_framework.throttling import UserRateThrottle


class SemanticDiffThrottle(UserRateThrottle):
    # `scope` decides the cache key, and `UserRateThrottle` sets it to "user"
    # for every subclass. Without an override each of these endpoints counted
    # against one shared bucket keyed on the user id, so the tightest limit in
    # the app applied to all of them: five interview questions a minute meant
    # five bullet optimisations a minute too. Distinct scopes give each
    # endpoint the rate its own class declares.
    scope = "semantic_diff"
    rate = "10/minute"


class SemanticDiffView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [SemanticDiffThrottle]

    @extend_schema(
        request=SemanticDiffRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=SemanticDiffResponseSerializer,
                description="Successful semantic diff",
            ),
            400: OpenApiResponse(description="Invalid input data"),
        },
        summary="Compare two resume versions and generate a semantic diff report",
    )
    def post(self, request):
        serializer = SemanticDiffRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        text_v1 = serializer.validated_data["text_v1"]
        text_v2 = serializer.validated_data["text_v2"]

        result = SemanticDiffer.compare(text_v1, text_v2)

        if "error" in result:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_200_OK)
