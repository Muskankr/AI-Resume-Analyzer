"""
Report Services for Anonymized Aggregate Reporting
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
import uuid
import hashlib

from django.db import transaction
from django.conf import settings

from .models import (
    ReportExport,
    ReportSchedule,
    ReportTemplate,
    ReportAuditLog,
    ReportCache
)
from .exporters import ReportExporter
from .aggregators import ReportAggregator

logger = logging.getLogger(__name__)


class ReportService:
    """Core service for report management."""
    
    def __init__(self):
        self.aggregator = ReportAggregator()
        self.exporter = ReportExporter()
    
    def create_report_export(
        self,
        organization_id: str,
        created_by: str,
        report_type: str,
        report_name: str,
        format: str = 'csv',
        date_range_start: datetime = None,
        date_range_end: datetime = None,
        filters: Dict = None,
        include_metrics: List = None,
        include_charts: List = None,
        include_summary: bool = True
    ) -> Dict[str, Any]:
        """
        Create a new report export.
        
        Args:
            organization_id: Organization ID
            created_by: User ID
            report_type: Type of report
            report_name: Name of the report
            format: Export format (csv, excel, json, pdf)
            date_range_start: Start date
            date_range_end: End date
            filters: Additional filters
            include_metrics: Metrics to include
            include_charts: Charts to include
            include_summary: Include summary
        
        Returns:
            Result dictionary
        """
        try:
            # Create report record
            report = ReportExport.objects.create(
                organization_id=organization_id,
                created_by=created_by,
                report_type=report_type,
                report_name=report_name,
                format=format,
                date_range_start=date_range_start,
                date_range_end=date_range_end,
                filters=filters or {},
                include_metrics=include_metrics or [],
                include_charts=include_charts or [],
                include_summary=include_summary,
                status='processing'
            )
            
            # Process report asynchronously
            self._process_report_async(report.id)
            
            return {
                'success': True,
                'data': {
                    'report_id': str(report.id),
                    'status': 'processing'
                },
                'message': 'Report processing started'
            }
            
        except Exception as e:
            logger.error(f"Failed to create report export: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _process_report_async(self, report_id: str):
        """
        Process report asynchronously (simplified - in production, use Celery).
        """
        try:
            report = ReportExport.objects.get(id=report_id)
            report.mark_as_processing()
            
            # Get data
            data = self.aggregator.aggregate_report_data(
                organization_id=report.organization_id,
                report_type=report.report_type,
                date_range_start=report.date_range_start,
                date_range_end=report.date_range_end,
                filters=report.filters
            )
            
            if not data:
                report.mark_as_failed('No data available for the selected criteria')
                return
            
            report.update_progress(50)
            
            # Export
            export_result = self.exporter.export(
                data=data,
                format=report.format,
                report_name=report.report_name,
                include_summary=report.include_summary
            )
            
            if not export_result['success']:
                report.mark_as_failed(export_result.get('error', 'Export failed'))
                return
            
            # Update report
            report.mark_as_completed(
                file_url=export_result.get('file_url', ''),
                file_size=export_result.get('file_size', 0),
                record_count=export_result.get('record_count', 0),
                data_summary=export_result.get('summary', {})
            )
            
            # Log audit
            ReportAuditLog.objects.create(
                organization_id=report.organization_id,
                user_id=report.created_by,
                report_id=report.id,
                action='completed',
                details={
                    'record_count': export_result.get('record_count', 0),
                    'file_size': export_result.get('file_size', 0)
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to process report {report_id}: {e}")
            try:
                report = ReportExport.objects.get(id=report_id)
                report.mark_as_failed(str(e))
            except:
                pass
    
    def create_report_schedule(
        self,
        organization_id: str,
        created_by: str,
        report_type: str,
        report_name: str,
        frequency: str,
        format: str = 'csv',
        filters: Dict = None,
        include_metrics: List = None,
        recipients: List = None,
        send_to_admins: bool = True
    ) -> Dict[str, Any]:
        """
        Create a recurring report schedule.
        
        Args:
            organization_id: Organization ID
            created_by: User ID
            report_type: Type of report
            report_name: Name of the report
            frequency: Schedule frequency
            format: Export format
            filters: Additional filters
            include_metrics: Metrics to include
            recipients: Email recipients
            send_to_admins: Send to admins
        
        Returns:
            Result dictionary
        """
        try:
            # Calculate next run
            now = datetime.now()
            if frequency == 'daily':
                next_run = now + timedelta(days=1)
            elif frequency == 'weekly':
                next_run = now + timedelta(days=7)
            elif frequency == 'biweekly':
                next_run = now + timedelta(days=14)
            elif frequency == 'monthly':
                next_run = now + timedelta(days=30)
            elif frequency == 'quarterly':
                next_run = now + timedelta(days=90)
            else:
                next_run = now + timedelta(days=7)
            
            # Create schedule
            schedule = ReportSchedule.objects.create(
                organization_id=organization_id,
                created_by=created_by,
                report_type=report_type,
                report_name=report_name,
                frequency=frequency,
                format=format,
                filters=filters or {},
                include_metrics=include_metrics or [],
                recipients=recipients or [],
                send_to_admins=send_to_admins,
                next_run=next_run,
                is_active=True
            )
            
            # Log audit
            ReportAuditLog.objects.create(
                organization_id=organization_id,
                user_id=created_by,
                action='schedule',
                details={
                    'schedule_id': str(schedule.id),
                    'frequency': frequency,
                    'report_type': report_type
                }
            )
            
            return {
                'success': True,
                'data': {
                    'schedule_id': str(schedule.id),
                    'next_run': next_run.isoformat()
                },
                'message': 'Report schedule created successfully'
            }
            
        except Exception as e:
            logger.error(f"Failed to create report schedule: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_report_stats(self, organization_id: str) -> Dict[str, Any]:
        """Get report statistics for an organization."""
        try:
            reports = ReportExport.objects.filter(organization_id=organization_id)
            
            total = reports.count()
            completed = reports.filter(status='completed').count()
            pending = reports.filter(status__in=['queued', 'processing']).count()
            failed = reports.filter(status='failed').count()
            
            return {
                'total_reports': total,
                'completed': completed,
                'pending': pending,
                'failed': failed,
                'by_type': reports.values('report_type').annotate(count=Count('id')),
                'by_status': reports.values('status').annotate(count=Count('id')),
                'by_format': reports.values('format').annotate(count=Count('id')),
                'storage_used': reports.aggregate(total=Sum('file_size'))['total'] or 0,
                'completion_rate': (completed / total * 100) if total > 0 else 0
            }
        except Exception as e:
            logger.error(f"Failed to get report stats: {e}")
            return {}
    
    def find_expiring_reports(self) -> List[Dict[str, Any]]:
        """Find reports that will expire soon."""
        now = datetime.now()
        cutoff = now + timedelta(days=7)
        
        expiring = ReportExport.objects.filter(
            expires_at__lte=cutoff,
            expires_at__gte=now,
            status='completed'
        )
        
        result = []
        for report in expiring:
            result.append({
                'report_id': str(report.id),
                'report_name': report.report_name,
                'expires_at': report.expires_at.isoformat(),
                'organization_id': str(report.organization_id)
            })
        
        return result
    
    def cleanup_expired_reports(self) -> int:
        """Delete expired reports."""
        now = datetime.now()
        deleted_count = ReportExport.objects.filter(
            expires_at__lte=now,
            status='completed'
        ).delete()[0]
        
        return deleted_count
    
    def get_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Get a report template by ID."""
        try:
            template = ReportTemplate.objects.get(template_id=template_id, is_active=True)
            return {
                'id': str(template.id),
                'name': template.name,
                'template_id': template.template_id,
                'template_type': template.template_type,
                'description': template.description,
                'default_filters': template.default_filters,
                'default_metrics': template.default_metrics,
                'default_charts': template.default_charts,
                'sections': template.sections
            }
        except:
            return None
    
    def apply_template(self, template_id: str, organization_id: str) -> Dict[str, Any]:
        """
        Apply a template to create a report configuration.
        
        Args:
            template_id: Template ID
            organization_id: Organization ID
        
        Returns:
            Report configuration dictionary
        """
        template = self.get_template(template_id)
        if not template:
            return {
                'success': False,
                'error': f'Template {template_id} not found'
            }
        
        # Get organization data
        # This would fetch organization-specific data to populate the report
        
        return {
            'success': True,
            'data': {
                'template': template,
                'report_name': f"{template['name']} - {datetime.now().strftime('%Y-%m-%d')}",
                'metrics': template['default_metrics'],
                'filters': template['default_filters']
            }
        }