"""
Report Exporters for Anonymized Aggregate Reporting
"""

import csv
import json
import io
from datetime import datetime
from typing import Dict, Any, List, Optional
import pandas as pd
from django.http import HttpResponse
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)


class ReportExporter:
    """
    Exports report data in various formats.
    """
    
    def __init__(self):
        self.supported_formats = ['csv', 'excel', 'json', 'pdf']
    
    def export(
        self,
        data: Dict[str, Any],
        format: str = 'csv',
        report_name: str = 'report',
        include_summary: bool = True
    ) -> Dict[str, Any]:
        """
        Export report data to specified format.
        
        Args:
            data: Report data
            format: Export format
            report_name: Name of the report
            include_summary: Include summary section
        
        Returns:
            Export result dictionary
        """
        if format not in self.supported_formats:
            return {
                'success': False,
                'error': f'Unsupported format: {format}'
            }
        
        exporter_method = getattr(self, f'_export_{format}', None)
        if not exporter_method:
            return {
                'success': False,
                'error': f'Export method not found for {format}'
            }
        
        try:
            return exporter_method(data, report_name, include_summary)
        except Exception as e:
            logger.error(f"Export failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _export_csv(
        self,
        data: Dict[str, Any],
        report_name: str,
        include_summary: bool
    ) -> Dict[str, Any]:
        """Export to CSV format."""
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write report header
        writer.writerow(['=' * 80])
        writer.writerow([f'Report: {report_name}'])
        writer.writerow([f'Generated: {datetime.now().isoformat()}'])
        writer.writerow([f'Report Type: {data.get("report_type", "N/A")}'])
        writer.writerow(['=' * 80])
        writer.writerow([])
        
        # Write summary if included
        if include_summary and 'summary' in data:
            writer.writerow(['SUMMARY'])
            writer.writerow(['-' * 80])
            for key, value in data['summary'].items():
                writer.writerow([key, value])
            writer.writerow([])
        
        # Write metrics
        if 'metrics' in data:
            writer.writerow(['METRICS'])
            writer.writerow(['-' * 80])
            for key, value in data['metrics'].items():
                if isinstance(value, dict):
                    writer.writerow([key])
                    for sub_key, sub_value in value.items():
                        writer.writerow([f'  {sub_key}', sub_value])
                else:
                    writer.writerow([key, value])
            writer.writerow([])
        
        # Write breakdowns
        if 'breakdowns' in data:
            writer.writerow(['BREAKDOWNS'])
            writer.writerow(['-' * 80])
            for category, breakdown in data['breakdowns'].items():
                writer.writerow([category])
                for key, value in breakdown.items():
                    if isinstance(value, dict):
                        writer.writerow([f'  {key}'])
                        for sub_key, sub_value in value.items():
                            writer.writerow([f'    {sub_key}', sub_value])
                    else:
                        writer.writerow([f'  {key}', value])
            writer.writerow([])
        
        # Write anonymization notice
        writer.writerow(['*' * 80])
        writer.writerow(['ANONYMIZATION NOTICE'])
        writer.writerow(['-' * 80])
        writer.writerow(['This report contains only aggregated, anonymized data.'])
        writer.writerow(['No individual user data is included.'])
        writer.writerow(['*' * 80])
        
        content = output.getvalue()
        file_size = len(content.encode('utf-8'))
        
        return {
            'success': True,
            'content': content.encode('utf-8'),
            'content_type': 'text/csv',
            'filename': f'{report_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv',
            'file_size': file_size,
            'record_count': 0,
            'summary': data.get('summary', {})
        }
    
    def _export_excel(
        self,
        data: Dict[str, Any],
        report_name: str,
        include_summary: bool
    ) -> Dict[str, Any]:
        """Export to Excel format."""
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Write summary sheet
            if include_summary and 'summary' in data:
                summary_df = pd.DataFrame([data['summary']])
                summary_df.to_excel(writer, sheet_name='Summary', index=False)
            
            # Write metrics sheet
            if 'metrics' in data:
                metrics_data = []
                for key, value in data['metrics'].items():
                    if isinstance(value, dict):
                        for sub_key, sub_value in value.items():
                            metrics_data.append({'Metric': f'{key}_{sub_key}', 'Value': sub_value})
                    else:
                        metrics_data.append({'Metric': key, 'Value': value})
                metrics_df = pd.DataFrame(metrics_data)
                metrics_df.to_excel(writer, sheet_name='Metrics', index=False)
            
            # Write breakdowns
            if 'breakdowns' in data:
                for category, breakdown in data['breakdowns'].items():
                    if breakdown:
                        df = pd.DataFrame([breakdown]) if isinstance(breakdown, dict) else pd.DataFrame(breakdown)
                        sheet_name = category[:31]  # Excel sheet name limit
                        df.to_excel(writer, sheet_name=sheet_name, index=False)
        
        output.seek(0)
        content = output.getvalue()
        file_size = len(content)
        
        return {
            'success': True,
            'content': content,
            'content_type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'filename': f'{report_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx',
            'file_size': file_size,
            'record_count': 0,
            'summary': data.get('summary', {})
        }
    
    def _export_json(
        self,
        data: Dict[str, Any],
        report_name: str,
        include_summary: bool
    ) -> Dict[str, Any]:
        """Export to JSON format."""
        export_data = {
            'report_name': report_name,
            'generated_at': datetime.now().isoformat(),
            'anonymization': {
                'enabled': True,
                'method': 'aggregation',
                'individual_data_removed': True
            },
            'data': data
        }
        
        json_str = json.dumps(export_data, indent=2, default=str)
        content = json_str.encode('utf-8')
        file_size = len(content)
        
        return {
            'success': True,
            'content': content,
            'content_type': 'application/json',
            'filename': f'{report_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json',
            'file_size': file_size,
            'record_count': 0,
            'summary': data.get('summary', {})
        }
    
    def _export_pdf(
        self,
        data: Dict[str, Any],
        report_name: str,
        include_summary: bool
    ) -> Dict[str, Any]:
        """Export to PDF format."""
        # This is a placeholder - in production, use ReportLab or WeasyPrint
        html_content = self._generate_pdf_html(data, report_name, include_summary)
        
        # In production, convert HTML to PDF using a library
        # For now, return the HTML as a placeholder
        content = html_content.encode('utf-8')
        file_size = len(content)
        
        return {
            'success': True,
            'content': content,
            'content_type': 'text/html',
            'filename': f'{report_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.html',
            'file_size': file_size,
            'record_count': 0,
            'summary': data.get('summary', {}),
            'warning': 'PDF export is in preview mode. HTML version provided.'
        }
    
    def _generate_pdf_html(
        self,
        data: Dict[str, Any],
        report_name: str,
        include_summary: bool
    ) -> str:
        """Generate HTML for PDF export."""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>{report_name}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                h1 {{ color: #4F46E5; }}
                .header {{ border-bottom: 2px solid #4F46E5; padding-bottom: 10px; margin-bottom: 20px; }}
                .section {{ margin-bottom: 30px; }}
                .section-title {{ background: #F3F4F6; padding: 8px 12px; border-left: 4px solid #4F46E5; }}
                .anonymization-notice {{ background: #FEF3C7; padding: 15px; border-radius: 5px; margin: 20px 0; }}
                table {{ width: 100%; border-collapse: collapse; }}
                th, td {{ padding: 8px 12px; text-align: left; border: 1px solid #E5E7EB; }}
                th {{ background: #F3F4F6; font-weight: 600; }}
                .footer {{ margin-top: 40px; text-align: center; font-size: 12px; color: #6B7280; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>{report_name}</h1>
                <p>Generated: {datetime.now().isoformat()}</p>
                <p>Report Type: {data.get('report_type', 'N/A')}</p>
            </div>
            
            <div class="anonymization-notice">
                <strong>🔒 Anonymized Report</strong>
                <p>This report contains only aggregated, anonymized data. No individual user data is included.</p>
            </div>
        """
        
        if include_summary and 'summary' in data:
            html += """
            <div class="section">
                <h2 class="section-title">Summary</h2>
                <table>
            """
            for key, value in data['summary'].items():
                html += f"<tr><td>{key}</td><td>{value}</td></tr>"
            html += "</table></div>"
        
        if 'metrics' in data:
            html += """
            <div class="section">
                <h2 class="section-title">Metrics</h2>
                <table>
            """
            for key, value in data['metrics'].items():
                if isinstance(value, dict):
                    html += f"<tr><td colspan='2'><strong>{key}</strong></td></tr>"
                    for sub_key, sub_value in value.items():
                        html += f"<tr><td style='padding-left:20px;'>{sub_key}</td><td>{sub_value}</td></tr>"
                else:
                    html += f"<tr><td>{key}</td><td>{value}</td></tr>"
            html += "</table></div>"
        
        html += """
            <div class="footer">
                <p>This report is automatically generated and may contain aggregated data only.</p>
                <p>© AI Resume Analyzer - Confidential</p>
            </div>
        </body>
        </html>
        """
        
        return html