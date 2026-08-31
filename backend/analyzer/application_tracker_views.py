import json
import logging

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import serializers, status
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiResponse

from .models import ApplicationLog

logger = logging.getLogger(__name__)

User = get_user_model()


# ── Serializers ──────────────────────────────────────────────────────


class ApplicationLogSerializer(serializers.ModelSerializer):
    """Full representation for a single application record."""

    class Meta:
        model = ApplicationLog
        fields = [
            "id",
            "company_name",
            "job_title",
            "status",
            "applied_date",
            "notes",
            "resume_analysis",
        ]
        read_only_fields = ["applied_date"]


class ApplicationLogCreateSerializer(serializers.ModelSerializer):
    """Input payload for creating an application entry."""

    class Meta:
        model = ApplicationLog
        fields = [
            "id",
            "company_name",
            "job_title",
            "status",
            "notes",
            "resume_analysis",
        ]
        read_only_fields = ["id"]


class ApplicationStatsSerializer(serializers.Serializer):
    """Aggregated statistics for the current user's applications."""

    total = serializers.IntegerField()
    by_status = serializers.DictField()
    interview_rate = serializers.FloatField()
    offer_rate = serializers.FloatField()
    rejection_rate = serializers.FloatField()
    applications_this_week = serializers.IntegerField()
    applications_this_month = serializers.IntegerField()


# ── Views ────────────────────────────────────────────────────────────

VALID_STATUSES = {choice for choice, _ in ApplicationLog.STATUS_CHOICES}


class ApplicationLogListView(APIView):
    """List all of the user's tracked applications, or create a new one."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List job applications",
        description="Returns all job applications for the authenticated user, ordered by most recent.",
        responses={200: ApplicationLogSerializer(many=True)},
    )
    def get(self, request):
        apps = (
            ApplicationLog.objects.filter(user=request.user)
            .select_related("resume_analysis")
            .order_by("-applied_date", "-id")
        )

        status_filter = request.query_params.get("status")
        if status_filter and status_filter in VALID_STATUSES:
            apps = apps.filter(status=status_filter)

        serializer = ApplicationLogSerializer(apps, many=True)
        return Response({"results": serializer.data})

    @extend_schema(
        summary="Create a job application",
        description="Adds a new job application entry for the authenticated user.",
        request=ApplicationLogCreateSerializer,
        responses={
            201: ApplicationLogSerializer,
            400: OpenApiResponse(description="Validation error"),
        },
    )
    def post(self, request):
        serializer = ApplicationLogCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        app = serializer.save(user=request.user)
        return Response(
            ApplicationLogSerializer(app).data,
            status=status.HTTP_201_CREATED,
        )


class ApplicationLogDetailView(APIView):
    """Retrieve, update or delete a single application."""

    permission_classes = [IsAuthenticated]

    def _get_app(self, pk, user):
        try:
            return ApplicationLog.objects.get(pk=pk, user=user)
        except ApplicationLog.DoesNotExist:
            return None

    @extend_schema(
        summary="Get application details",
        responses={200: ApplicationLogSerializer, 404: OpenApiResponse},
    )
    def get(self, request, pk):
        app = self._get_app(pk, request.user)
        if not app:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(ApplicationLogSerializer(app).data)

    @extend_schema(
        summary="Update an application",
        request=ApplicationLogCreateSerializer,
        responses={200: ApplicationLogSerializer, 404: OpenApiResponse},
    )
    def patch(self, request, pk):
        app = self._get_app(pk, request.user)
        if not app:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = ApplicationLogCreateSerializer(app, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ApplicationLogSerializer(app).data)

    @extend_schema(
        summary="Delete an application",
        responses={204: OpenApiResponse, 404: OpenApiResponse},
    )
    def delete(self, request, pk):
        app = self._get_app(pk, request.user)
        if not app:
            return Response(status=status.HTTP_404_NOT_FOUND)
        app.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def application_stats_view(request):
    """Return aggregated statistics for the current user's application pipeline."""

    apps = ApplicationLog.objects.filter(user=request.user)

    total = apps.count()

    if total == 0:
        return Response({
            "total": 0,
            "by_status": {s: 0 for s, _ in ApplicationLog.STATUS_CHOICES},
            "interview_rate": 0,
            "offer_rate": 0,
            "rejection_rate": 0,
            "applications_this_week": 0,
            "applications_this_month": 0,
        })

    # Count by status
    status_counts = {
        row["status"]: row["count"]
        for row in apps.values("status").annotate(count=Count("id"))
    }
    by_status = {
        choice: status_counts.get(choice, 0)
        for choice, _ in ApplicationLog.STATUS_CHOICES
    }

    # Rate calculations
    interview_count = by_status.get("interviewed", 0)
    offer_count = by_status.get("offered", 0)
    rejected_count = by_status.get("rejected", 0)

    interview_rate = round((interview_count / total) * 100, 1)
    offer_rate = round((offer_count / total) * 100, 1)
    rejection_rate = round((rejected_count / total) * 100, 1)

    # Time windows
    now = timezone.now()
    week_ago = now - timezone.timedelta(days=7)
    month_ago = now - timezone.timedelta(days=30)

    this_week = apps.filter(applied_date__gte=week_ago).count()
    this_month = apps.filter(applied_date__gte=month_ago).count()

    return Response({
        "total": total,
        "by_status": by_status,
        "interview_rate": interview_rate,
        "offer_rate": offer_rate,
        "rejection_rate": rejection_rate,
        "applications_this_week": this_week,
        "applications_this_month": this_month,
    })
