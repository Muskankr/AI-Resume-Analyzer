"""
Report Views for API
"""

import logging
from datetime import datetime, timedelta
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count, Sum, Avg
from django.http import HttpResponse
from django.core.files.base import ContentFile
from django.conf import settings

from .models import (
    ReportExport,
    ReportSchedule,
    ReportTemplate,
    ReportAuditLog,
    ReportCache
)
from .serializers import (
    ReportExportSerializer,
    ReportScheduleSerializer,
    ReportTemplateSerializer,
    ReportAuditLogSerializer,
    ReportRequestSerializer,
    ReportScheduleRequestSerializer,
    ReportStatsSerializer
)
from .services import ReportService
from .exporters import ReportExporter
from .aggregators import ReportAggregator

logger = logging.getLogger(__name__)


class ReportRequestView(APIView):
    """Request a new report export."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ReportRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user_id = request.user.id
        organization_id = getattr(request.user, 'organization_id', None)
        
        if not organization_id:
            return Response({
                'success': False,
                'error': 'User is not associated with an organization'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user is admin
        if not request.user.is_staff and not request.user.is_superuser:
            return Response({
                'success': False,
                'error': 'Only admins can export reports'
            }, status=status.HTTP_403_FORBIDDEN)
        
        service = ReportService()
        result = service.create_report_export(
            organization_id=organization_id,
            created_by=user_id,
            **serializer.validated_data
        )
        
        if result['success']:
            return Response({
                'success': True,
                'data': result['data'],
                'message': 'Report export created successfully'
            })
        
        return Response({
            'success': False,
            'error': result.get('error', 'Failed to create report')
        }, status=status.HTTP_400_BAD_REQUEST)


class ReportStatusView(APIView):
    """Check report export status."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, report_id):
        user_id = request.user.id
        organization_id = getattr(request.user, 'organization_id', None)
        
        try:
            report = ReportExport.objects.get(id=report_id)
        except ReportExport.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Report not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check authorization
        if report.organization_id != organization_id and not request.user.is_superuser:
            return Response({
                'success': False,
                'error': 'Not authorized to view this report'
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = ReportExportSerializer(report)
        
        return Response({
            'success': True,
            'data': serializer.data
        })


class ReportDownloadView(APIView):
    """Download a completed report."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, report_id):
        user_id = request.user.id
        organization_id = getattr(request.user, 'organization_id', None)
        
        try:
            report = ReportExport.objects.get(id=report_id)
        except ReportExport.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Report not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check authorization
        if report.organization_id != organization_id and not request.user.is_superuser:
            return Response({
                'success': False,
                'error': 'Not authorized to download this report'
            }, status=status.HTTP_403_FORBIDDEN)
        
        if report.status != 'completed':
            return Response({
                'success': False,
                'error': f'Report is not ready for download (status: {report.status})'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not report.file_url:
            return Response({
                'success': False,
                'error': 'Report file not available'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Log download
        ReportAuditLog.objects.create(
            organization_id=organization_id,
            user_id=user_id,
            report_id=report_id,
            action='download',
            details={'report_name': report.report_name, 'format': report.format},
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        # Return file download
        return Response({
            'success': True,
            'download_url': report.file_url
        })
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class ReportListView(APIView):
    """List all reports for an organization."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        organization_id = getattr(request.user, 'organization_id', None)
        
        if not organization_id:
            return Response({
                'success': False,
                'error': 'User is not associated with an organization'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        limit = request.query_params.get('limit', 50)
        status_filter = request.query_params.get('status')
        report_type = request.query_params.get('type')
        
        try:
            limit = int(limit)
            if limit > 100:
                limit = 100
        except:
            limit = 50
        
        reports = ReportExport.objects.filter(organization_id=organization_id)
        
        if status_filter:
            reports = reports.filter(status=status_filter)
        if report_type:
            reports = reports.filter(report_type=report_type)
        
        reports = reports.order_by('-created_at')[:limit]
        serializer = ReportExportSerializer(reports, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data,
            'count': len(serializer.data)
        })


class ReportScheduleView(APIView):
    """Schedule a recurring report."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ReportScheduleRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user_id = request.user.id
        organization_id = getattr(request.user, 'organization_id', None)
        
        if not organization_id:
            return Response({
                'success': False,
                'error': 'User is not associated with an organization'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not request.user.is_staff and not request.user.is_superuser:
            return Response({
                'success': False,
                'error': 'Only admins can schedule reports'
            }, status=status.HTTP_403_FORBIDDEN)
        
        service = ReportService()
        result = service.create_report_schedule(
            organization_id=organization_id,
            created_by=user_id,
            **serializer.validated_data
        )
        
        if result['success']:
            return Response({
                'success': True,
                'data': result['data'],
                'message': 'Report schedule created successfully'
            })
        
        return Response({
            'success': False,
            'error': result.get('error', 'Failed to create schedule')
        }, status=status.HTTP_400_BAD_REQUEST)


class ReportScheduleListView(APIView):
    """List all report schedules."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        organization_id = getattr(request.user, 'organization_id', None)
        
        if not organization_id:
            return Response({
                'success': False,
                'error': 'User is not associated with an organization'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        schedules = ReportSchedule.objects.filter(
            organization_id=organization_id,
            is_active=True
        ).order_by('next_run')
        
        serializer = ReportScheduleSerializer(schedules, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data,
            'count': len(serializer.data)
        })


class ReportTemplateListView(APIView):
    """List all report templates."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        template_type = request.query_params.get('type')
        
        templates = ReportTemplate.objects.filter(is_active=True)
        if template_type:
            templates = templates.filter(template_type=template_type)
        
        serializer = ReportTemplateSerializer(templates, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data,
            'count': len(serializer.data)
        })


class ReportStatsView(APIView):
    """Get report statistics."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        organization_id = getattr(request.user, 'organization_id', None)
        
        if not organization_id:
            return Response({
                'success': False,
                'error': 'User is not associated with an organization'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        service = ReportService()
        stats = service.get_report_stats(organization_id)
        
        return Response({
            'success': True,
            'data': stats
        })


class ReportCancelView(APIView):
    """Cancel a queued or processing report."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, report_id):
        user_id = request.user.id
        organization_id = getattr(request.user, 'organization_id', None)
        
        try:
            report = ReportExport.objects.get(id=report_id)
        except ReportExport.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Report not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if report.organization_id != organization_id and not request.user.is_superuser:
            return Response({
                'success': False,
                'error': 'Not authorized to cancel this report'
            }, status=status.HTTP_403_FORBIDDEN)
        
        if report.status not in ['queued', 'processing']:
            return Response({
                'success': False,
                'error': f'Cannot cancel report with status: {report.status}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        report.status = 'cancelled'
        report.save(update_fields=['status'])
        
        ReportAuditLog.objects.create(
            organization_id=organization_id,
            user_id=user_id,
            report_id=report_id,
            action='cancel',
            details={'reason': 'User cancelled'},
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({
            'success': True,
            'message': 'Report cancelled successfully'
        })
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class ReportExportView(APIView):
    """Export report data directly."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ReportRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user_id = request.user.id
        organization_id = getattr(request.user, 'organization_id', None)
        
        if not organization_id:
            return Response({
                'success': False,
                'error': 'User is not associated with an organization'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not request.user.is_staff and not request.user.is_superuser:
            return Response({
                'success': False,
                'error': 'Only admins can export reports'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Generate report directly
        aggregator = ReportAggregator()
        exporter = ReportExporter()
        
        # Get data
        data = aggregator.aggregate_report_data(
            organization_id=organization_id,
            report_type=serializer.validated_data['report_type'],
            date_range_start=serializer.validated_data.get('date_range_start'),
            date_range_end=serializer.validated_data.get('date_range_end'),
            filters=serializer.validated_data.get('filters', {})
        )
        
        if not data:
            return Response({
                'success': False,
                'error': 'No data available for the selected criteria'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Export
        format = serializer.validated_data.get('format', 'csv')
        export_result = exporter.export(
            data=data,
            format=format,
            report_name=serializer.validated_data['report_name'],
            include_summary=serializer.validated_data.get('include_summary', True)
        )
        
        if not export_result['success']:
            return Response({
                'success': False,
                'error': export_result.get('error', 'Failed to export report')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Log export
        ReportAuditLog.objects.create(
            organization_id=organization_id,
            user_id=user_id,
            action='download',
            details={
                'report_name': serializer.validated_data['report_name'],
                'format': format,
                'record_count': export_result.get('record_count', 0)
            },
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        # Return file
        response = HttpResponse(
            export_result['content'],
            content_type=export_result['content_type']
        )
        response['Content-Disposition'] = f'attachment; filename="{export_result["filename"]}"'
        return response
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip