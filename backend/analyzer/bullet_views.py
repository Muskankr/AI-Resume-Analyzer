"""
API endpoints to process single or batch bullet point optimizations,
ensuring proper rate limiting, authentication, and error handling.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiResponse
from .bullet_serializers import (
    BulletOptimizationRequestSerializer,
    BulletOptimizationResponseSerializer,
)
from .bullet_optimizer import BulletOptimizer
from rest_framework.throttling import UserRateThrottle


class BulletOptimizationThrottle(UserRateThrottle):
    # `scope` decides the cache key, and `UserRateThrottle` sets it to "user"
    # for every subclass. Without an override each of these endpoints counted
    # against one shared bucket keyed on the user id, so the tightest limit in
    # the app applied to all of them: five interview questions a minute meant
    # five bullet optimisations a minute too. Distinct scopes give each
    # endpoint the rate its own class declares.
    scope = "bullet_optimization"
    rate = "10/minute"


class BulletOptimizeView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [BulletOptimizationThrottle]

    @extend_schema(
        request=BulletOptimizationRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=BulletOptimizationResponseSerializer,
                description="Successful optimization",
            ),
            400: OpenApiResponse(description="Invalid input data"),
        },
        summary="Optimize resume bullet points using STAR framework",
    )
    def post(self, request):
        serializer = BulletOptimizationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        bullets = serializer.validated_data["bullets"]
        target_role = serializer.validated_data.get("target_role", "")
        job_description = serializer.validated_data.get("job_description", "")

        results = []
        total_score = 0

        for bullet in bullets:
            analysis = BulletOptimizer.analyze(bullet, job_description=job_description)
            results.append(
                {
                    "original": analysis.original,
                    "has_action_verb": analysis.has_action_verb,
                    "has_metric": analysis.has_metric,
                    "is_passive": analysis.is_passive,
                    "star_components": analysis.star_components,
                    "score": analysis.score,
                    "suggestions": analysis.suggestions,
                    "rewrites": analysis.rewrites,
                }
            )
            total_score += analysis.score

        avg_score = round(total_score / len(bullets), 2) if bullets else 0.0

        response_data = {
            "results": results,
            "average_score": avg_score,
            "total_processed": len(bullets),
        }

        return Response(response_data, status=status.HTTP_200_OK)
