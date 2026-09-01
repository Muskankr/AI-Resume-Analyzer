"""Pro Tier & Subscription Management Views (#992).

Defines feature differentiation between Free and Pro plans, and handles
the upgrade/downgrade subscription flow.
"""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserProfile

PRO_TIER_MATRIX = {
    "free": {
        "name": "Free Tier",
        "price": "$0 / month",
        "description": "Essential single-resume analysis and quality scoring for job seekers.",
        "features": [
            "Full ATS Resume Scoring & Breakdown",
            "Target Role Skills Matching & Keyword Density",
            "Single-Resume AI Bullet Point Optimizer",
            "Career Roadmap & Role Recommendations",
            "Basic Analysis History (Up to 10 stored resumes)",
            "Standard Processing Queue",
        ],
        "limits": {
            "max_history_items": 10,
            "bulk_analysis_enabled": False,
            "priority_processing": False,
            "recruiter_dashboard_enabled": False,
        },
    },
    "pro": {
        "name": "Pro Tier",
        "price": "$19 / month (or $190 / year)",
        "description": "Unlimited analysis, bulk comparisons, and priority AI processing for power users and recruiters.",
        "features": [
            "All Free Tier Features Included",
            "Bulk Resume & Bulk JD Comparison Engine",
            "Unlimited Analysis History Storage",
            "Priority Fast-Track Processing Queue",
            "Advanced Multi-Format Resume & Photo OCR Parsing",
            "Recruiter Candidate Shortlisting Dashboard",
            "Downloadable Contribution & Accomplishment Certificates",
        ],
        "limits": {
            "max_history_items": None,  # Unlimited
            "bulk_analysis_enabled": True,
            "priority_processing": True,
            "recruiter_dashboard_enabled": True,
        },
    },
}


class AccountTierView(APIView):
    """Retrieves subscription matrix or updates the current user's tier (Upgrade/Downgrade)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        current_tier = profile.tier or "free"

        return Response(
            {
                "username": request.user.username,
                "current_tier": current_tier,
                "tier_updated_at": profile.tier_updated_at,
                "tier_details": PRO_TIER_MATRIX.get(current_tier, PRO_TIER_MATRIX["free"]),
                "matrix": PRO_TIER_MATRIX,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        target_tier = str(request.data.get("tier", "")).strip().lower()

        if target_tier not in ("free", "pro"):
            return Response(
                {"error": "Invalid tier selection. Choose 'free' or 'pro'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        previous_tier = profile.tier
        profile.tier = target_tier
        profile.save()

        action = "upgraded" if target_tier == "pro" else "downgraded"

        return Response(
            {
                "message": f"Successfully {action} to {PRO_TIER_MATRIX[target_tier]['name']}.",
                "previous_tier": previous_tier,
                "current_tier": target_tier,
                "tier_details": PRO_TIER_MATRIX[target_tier],
                "tier_updated_at": profile.tier_updated_at,
            },
            status=status.HTTP_200_OK,
        )
