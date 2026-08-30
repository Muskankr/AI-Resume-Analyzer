"""
Views for LinkedIn Profile Optimization.

Exposes the POST /api/optimize-linkedin/ endpoint.
"""

import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import AnonRateThrottle
from .linkedin_optimizer import generate_linkedin_profile
from .linkedin_serializers import (
    LinkedInOptimizationRequestSerializer,
    LinkedInOptimizationResponseSerializer,
)

logger = logging.getLogger(__name__)


class LinkedInOptimizationThrottle(AnonRateThrottle):
    """Caps /api/optimize-linkedin/, an open endpoint that rewrites caller-sized text."""

    scope = "linkedin_optimization"


class LinkedInOptimizationView(APIView):
    """
    API View to handle LinkedIn profile optimization requests.
    """

    throttle_classes = [LinkedInOptimizationThrottle]

    def post(self, request, *args, **kwargs):
        """
        Process resume data and return optimized LinkedIn profile sections.
        """
        # Validate incoming data
        request_serializer = LinkedInOptimizationRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {"errors": request_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        validated_data = request_serializer.validated_data

        try:
            # Generate optimized profile
            optimized_profile = generate_linkedin_profile(validated_data)

            # Serialize and return response
            response_serializer = LinkedInOptimizationResponseSerializer(
                data=optimized_profile
            )
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception:
            logger.exception("LinkedIn optimization failed")
            return Response(
                {"error": "An unexpected error occurred during optimization."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

from .linkedin_consistency import check_consistency, fetch_linkedin_public_profile
from .linkedin_serializers import LinkedInConsistencyRequestSerializer, LinkedInConsistencyResponseSerializer

class LinkedInConsistencyView(APIView):
    """
    API View to handle LinkedIn profile consistency checks.
    """
    throttle_classes = [LinkedInOptimizationThrottle]

    def post(self, request, *args, **kwargs):
        request_serializer = LinkedInConsistencyRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response({"errors": request_serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = request_serializer.validated_data
        resume_text = validated_data.get("resume_text", "")
        linkedin_text = validated_data.get("linkedin_text", "")
        linkedin_url = validated_data.get("linkedin_url", "")
        
        if linkedin_url:
            try:
                linkedin_text = fetch_linkedin_public_profile(linkedin_url)
            except ValueError as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
                
        try:
            result = check_consistency(resume_text, linkedin_text)
            response_serializer = LinkedInConsistencyResponseSerializer(data=result)
            response_serializer.is_valid(raise_exception=True)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception("LinkedIn consistency check failed")
            return Response({"error": "An unexpected error occurred."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
