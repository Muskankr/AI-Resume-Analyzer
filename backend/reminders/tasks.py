"""
Celery Tasks for Reminders
"""

import logging
from datetime import datetime, timedelta
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings

from .models import ResumeExpirationReminder, UserReminderPreferences
from .services import ReminderService

logger = logging.getLogger(__name__)


@shared_task
def send_expiration_reminders():
    """
    Scheduled task to send expiration reminders to eligible users.
    """
    logger.info("Starting expiration reminder task")
    
    service = ReminderService()
    eligible_users = service.find_eligible_users()
    
    sent_count = 0
    failed_count = 0
    
    for user_data in eligible_users:
        user_id = user_data['user_id']
        username = user_data['username']
        email = user_data['email']
        days_since_update = user_data.get('days_since_update', 0)
        
        # Determine reminder type based on days since update
        if days_since_update > 180:
            reminder_type = 'expired'
        elif days_since_update > 150:
            reminder_type = 'soon'
        elif days_since_update > 120:
            reminder_type = 'warning'
        else:
            reminder_type = 're_engagement'
        
        # Send reminder
        result = service.send_reminder(
            user_id=user_id,
            reminder_type=reminder_type,
            variables={
                'username': username,
                'days_since_update': days_since_update,
                'days': days_since_update,
                'refresh_link': f'{settings.BASE_URL}/resume/refresh/',
                'expiry_date': (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
            }
        )
        
        if result.get('success'):
            sent_count += 1
        else:
            failed_count += 1
    
    logger.info(f"Expiration reminder task completed: {sent_count} sent, {failed_count} failed")
    return {
        'sent': sent_count,
        'failed': failed_count,
        'total': len(eligible_users)
    }


@shared_task
def send_monthly_digest():
    """
    Send monthly digest to all opted-in users.
    """
    logger.info("Starting monthly digest task")
    
    # Implementation would go here
    # This would send a monthly digest to all users with opt-in enabled
    
    logger.info("Monthly digest task completed")
    return {'status': 'completed'}


@shared_task
def cleanup_old_reminders():
    """
    Clean up old reminder records.
    """
    logger.info("Starting reminder cleanup task")
    
    cutoff_date = datetime.now() - timedelta(days=365)
    deleted = ResumeExpirationReminder.objects.filter(
        created_at__lt=cutoff_date,
        status__in=['sent', 'failed', 'cancelled']
    ).delete()
    
    logger.info(f"Cleaned up {deleted[0]} old reminders")
    return {'deleted': deleted[0]}