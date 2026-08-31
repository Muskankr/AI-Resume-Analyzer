"""
Views for Market Value Estimator.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .market_value_estimator import (
    calculate_salary_range,
    find_high_value_skills,
    generate_negotiation_points,
)
from .market_serializers import (
    MarketValueRequestSerializer,
    MarketValueResponseSerializer,
)


class MarketValueView(APIView):
    """API View to estimate market value and generate negotiation points."""

    def post(self, request, *args, **kwargs):
        request_serializer = MarketValueRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {"errors": request_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_role = request_serializer.validated_data["target_role"]
        experience_level = request_serializer.validated_data["experience_level"]
        skills = request_serializer.validated_data.get("skills", [])

        try:
            salary_range = calculate_salary_range(target_role, experience_level, skills)
            negotiation_points = generate_negotiation_points(experience_level, skills)

            # Identify value driving skills. This used to be a five-entry copy
            # of the list, while calculate_salary_range above priced against
            # all sixteen -- so "Docker, Rust, Azure" earned an uplift and came
            # back with an empty value_driving_skills, i.e. the response raised
            # the number and then reported that nothing drove it.
            value_driving = find_high_value_skills(skills)

            response_data = {
                "salary_range": salary_range,
                "value_driving_skills": value_driving,
                "negotiation_talking_points": negotiation_points,
            }

            response_serializer = MarketValueResponseSerializer(data=response_data)
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {
                    "error": "An unexpected error occurred during market value estimation.",
                    "details": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
