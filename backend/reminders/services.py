"""
Reminder Services for Resume-Expiration Re-Engagement
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.db.models import Q, Count

from .models import (
    ResumeExpirationReminder,
    ReminderLog,
    UserReminderPreferences,
    ReminderTemplate,
    DEFAULT_REMINDER_TEMPLATES
)

logger = logging.getLogger(__name__)


class ReminderService:
    """Core service for sending email reminders."""
    
    def __init__(self):
        self._ensure_default_templates()
    
    def _ensure_default_templates(self):
        """Ensure default templates exist."""
        try:
            for key, template_data in DEFAULT_REMINDER_TEMPLATES.items():
                exists = ReminderTemplate.objects.filter(
                    template_id=template_data['template_id']
                ).exists()
                if not exists:
                    ReminderTemplate.objects.create(**template_data)
        except:
            pass
    
    def get_template(self, template_id: str) -> Optional[ReminderTemplate]:
        """Get a template by ID."""
        try:
            return ReminderTemplate.objects.filter(
                template_id=template_id, is_active=True
            ).first()
        except:
            return None
    
    def get_user_preferences(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user reminder preferences."""
        try:
            prefs = UserReminderPreferences.objects.filter(user_id=user_id).first()
            if prefs:
                return {
                    'user_id': str(prefs.user_id),
                    'opt_in': prefs.opt_in,
                    'opt_in_at': prefs.opt_in_at,
                    'opt_out_at': prefs.opt_out_at,
                    'reminder_frequency_days': prefs.reminder_frequency_days,
                    'warning_days_before': prefs.warning_days_before,
                    'enabled_types': prefs.enabled_types,
                    'disabled_types': prefs.disabled_types,
                    'quiet_hours_enabled': prefs.quiet_hours_enabled,
                    'quiet_hours_start': prefs.quiet_hours_start,
                    'quiet_hours_end': prefs.quiet_hours_end,
                    'last_reminder_sent': prefs.last_reminder_sent,
                    'total_reminders_sent': prefs.total_reminders_sent
                }
            return None
        except:
            return None
    
    def _get_user_preferences(self, user_id: str):
        """Get user preferences object."""
        try:
            return UserReminderPreferences.objects.filter(user_id=user_id).first()
        except:
            return None
    
    def _get_or_create_preferences(self, user_id: str) -> UserReminderPreferences:
        """Get or create user preferences."""
        prefs = self._get_user_preferences(user_id)
        if not prefs:
            prefs = UserReminderPreferences.objects.create(
                user_id=user_id,
                opt_in=True,
                enabled_types=[],
                disabled_types=[]
            )
        return prefs
    
    def update_user_preferences(self, user_id: str, **kwargs) -> Dict[str, Any]:
        """Update user preferences."""
        try:
            prefs = self._get_or_create_preferences(user_id)
            
            if 'opt_in' in kwargs:
                prefs.opt_in = kwargs['opt_in']
                if kwargs['opt_in']:
                    prefs.opt_in_at = datetime.now()
                else:
                    prefs.opt_out_at = datetime.now()
            
            if 'reminder_frequency_days' in kwargs:
                prefs.reminder_frequency_days = kwargs['reminder_frequency_days']
            
            if 'warning_days_before' in kwargs:
                prefs.warning_days_before = kwargs['warning_days_before']
            
            if 'enabled_types' in kwargs:
                prefs.enabled_types = kwargs['enabled_types']
            
            if 'disabled_types' in kwargs:
                prefs.disabled_types = kwargs['disabled_types']
            
            if 'quiet_hours_enabled' in kwargs:
                prefs.quiet_hours_enabled = kwargs['quiet_hours_enabled']
            
            if 'quiet_hours_start' in kwargs:
                prefs.quiet_hours_start = kwargs['quiet_hours_start']
            
            if 'quiet_hours_end' in kwargs:
                prefs.quiet_hours_end = kwargs['quiet_hours_end']
            
            prefs.save()
            
            return {
                'success': True,
                'message': 'Preferences updated successfully'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def send_reminder(
        self,
        user_id: str,
        reminder_type: str,
        resume_id: str = None,
        variables: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Send a reminder email to a user.
        
        Args:
            user_id: User ID
            reminder_type: Type of reminder
            resume_id: Optional resume ID
            variables: Template variables
        
        Returns:
            Result dictionary
        """
        variables = variables or {}
        
        # Get user info
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.get(id=user_id)
            user_email = user.email
            username = user.get_full_name() or user.username
        except:
            return {
                'success': False,
                'error': 'User not found'
            }
        
        # Check preferences
        prefs = self._get_user_preferences(user_id)
        if prefs and not prefs.opt_in:
            return {
                'success': False,
                'error': 'User has opted out of reminders'
            }
        
        # Map reminder type to template ID
        template_map = {
            'warning': 'expiration_warning',
            'soon': 'expiration_soon',
            'expired': 'expired',
            're_engagement': 're_engagement',
            'refresh': 'refresh_suggestion'
        }
        
        template_id = template_map.get(reminder_type)
        if not template_id:
            return {
                'success': False,
                'error': f'Unknown reminder type: {reminder_type}'
            }
        
        # Get template
        template = self.get_template(template_id)
        if not template:
            return {
                'success': False,
                'error': f'Template {template_id} not found'
            }
        
        # Build variables
        all_variables = {
            'username': username,
            'user_email': user_email,
            'user_id': str(user_id),
            'resume_id': str(resume_id) if resume_id else 'N/A',
            'resume_name': variables.get('resume_name', 'Your Resume'),
            'days': variables.get('days', 30),
            'expiry_date': variables.get('expiry_date', 'N/A'),
            'refresh_link': variables.get('refresh_link', f'{settings.BASE_URL}/resume/refresh/'),
            'days_since_update': variables.get('days_since_update', 0),
            'suggestions': variables.get('suggestions', 'Review your work experience and skills'),
            'month': datetime.now().strftime('%B'),
            'year': datetime.now().year,
            'views': variables.get('views', 0),
            'matches': variables.get('matches', 0),
            'score': variables.get('score', 0),
            'tips': variables.get('tips', 'Keep your resume updated with latest skills')
        }
        
        # Render content
        subject = template.render_subject(all_variables)
        content = template.render_content(all_variables, html=False)
        html_content = template.render_content(all_variables, html=True)
        
        # Create reminder record
        reminder = ResumeExpirationReminder.objects.create(
            user_id=user_id,
            user_email=user_email,
            username=username,
            resume_id=resume_id,
            resume_name=all_variables['resume_name'],
            reminder_type=reminder_type,
            template=template,
            subject=subject,
            content=content,
            variables_used=all_variables,
            status='pending'
        )
        
        # Send email
        try:
            send_mail(
                subject=subject,
                message=content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user_email],
                html_message=html_content,
                fail_silently=False
            )
            
            reminder.mark_as_sent()
            self._log_reminder(user_id, user_email, reminder, 'sent')
            
            # Update preferences
            if prefs:
                prefs.last_reminder_sent = datetime.now()
                prefs.total_reminders_sent += 1
                prefs.save()
            
            return {
                'success': True,
                'message_id': str(reminder.id),
                'status': 'sent'
            }
            
        except Exception as e:
            logger.error(f"Failed to send reminder: {e}")
            reminder.mark_as_failed(str(e))
            self._log_reminder(user_id, user_email, reminder, 'failed', error=str(e))
            
            return {
                'success': False,
                'error': str(e),
                'message_id': str(reminder.id)
            }
    
    def _log_reminder(self, user_id: str, email: str, reminder: ResumeExpirationReminder, status: str, error: str = None):
        """Log reminder activity."""
        try:
            ReminderLog.objects.create(
                user_id=user_id,
                recipient_email=email,
                reminder=reminder,
                reminder_type=reminder.reminder_type,
                subject=reminder.subject,
                content_preview=reminder.content[:200],
                status=status,
                error_message=error or ''
            )
        except Exception as e:
            logger.error(f"Failed to log reminder: {e}")
    
    def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get reminder statistics for a user."""
        reminders = ResumeExpirationReminder.objects.filter(user_id=user_id)
        
        total = reminders.count()
        sent = reminders.filter(status='sent').count()
        opened = reminders.filter(opened_count__gt=0).count()
        clicked = reminders.filter(clicked_count__gt=0).count()
        
        return {
            'total_reminders': total,
            'sent': sent,
            'opened': opened,
            'clicked': clicked,
            'open_rate': (opened / sent * 100) if sent > 0 else 0,
            'click_rate': (clicked / sent * 100) if sent > 0 else 0,
            'by_type': reminders.values('reminder_type').annotate(count=Count('id')),
            'by_status': reminders.values('status').annotate(count=Count('id'))
        }
    
    def find_eligible_users(self) -> List[Dict[str, Any]]:
        """
        Find users eligible for expiration reminders.
        """
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        eligible = []
        cutoff_date = datetime.now() - timedelta(days=180)
        
        users = User.objects.filter(
            Q(last_login__lte=cutoff_date) | Q(last_login__isnull=True),
            is_active=True,
            email__isnull=False
        ).exclude(email='')
        
        for user in users:
            # Check if already sent a reminder recently
            recent_reminder = ResumeExpirationReminder.objects.filter(
                user_id=user.id,
                created_at__gte=datetime.now() - timedelta(days=90)
            ).exists()
            
            if not recent_reminder:
                # Get user's resumes and find last analysis
                # This would integrate with your resume system
                eligible.append({
                    'user_id': str(user.id),
                    'username': user.get_full_name() or user.username,
                    'email': user.email,
                    'days_since_update': (datetime.now() - user.last_login).days if user.last_login else 180
                })
        
        return eligible