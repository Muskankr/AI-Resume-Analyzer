"""
SMS Services for Notification System
"""

import logging
import re
import random
import string
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Tuple
from django.core.cache import cache
from django.db import transaction, models
from django.utils import timezone

from .models import (
    SMSLog, SMSProvider, SMSTemplate, UserSMSPreferences,
    SMSBlacklist, SMSDailyStats, SMSWebhookLog,
    DEFAULT_SMS_TEMPLATES
)

logger = logging.getLogger(__name__)


class SMSService:
    """Core SMS service for sending notifications."""
    
    def __init__(self):
        self.cache_prefix = 'sms_'
        self._ensure_default_provider()
    
    def _ensure_default_provider(self):
        """Ensure default provider exists."""
        try:
            if not SMSProvider.objects.filter(is_default=True, is_active=True).exists():
                provider, created = SMSProvider.objects.get_or_create(
                    name='Twilio',
                    defaults={
                        'provider_type': 'twilio',
                        'is_active': True,
                        'is_default': True,
                        'max_per_day': 1000,
                        'cost_per_sms': 0.0075
                    }
                )
                if created:
                    logger.info("Created default SMS provider: Twilio")
        except:
            pass
    
    def get_default_provider(self) -> Optional[SMSProvider]:
        """Get the default SMS provider."""
        try:
            return SMSProvider.objects.filter(is_active=True, is_default=True).first()
        except:
            return None
    
    def get_template(self, template_id: str) -> Optional[SMSTemplate]:
        """Get a template by ID."""
        try:
            return SMSTemplate.objects.filter(template_id=template_id, is_active=True).first()
        except:
            return None
    
    def create_default_templates(self) -> None:
        """Create default SMS templates if they don't exist."""
        for key, template_data in DEFAULT_SMS_TEMPLATES.items():
            try:
                exists = SMSTemplate.objects.filter(
                    template_id=template_data['template_id']
                ).exists()
                if not exists:
                    SMSTemplate.objects.create(**template_data)
                    logger.info(f"Created template: {template_data['name']}")
            except Exception as e:
                logger.error(f"Failed to create template {key}: {e}")
    
    def send_sms(
        self,
        phone_number: str,
        template_id: str,
        variables: Dict[str, Any] = None,
        user_id: str = None,
        scheduled_at: datetime = None
    ) -> Dict[str, Any]:
        """
        Send an SMS message.
        
        Args:
            phone_number: Recipient phone number (E.164 format)
            template_id: Template ID
            variables: Variables to fill in template
            user_id: Optional user ID for tracking
            scheduled_at: Optional schedule time
        
        Returns:
            Result dictionary with success status and message ID
        """
        variables = variables or {}
        
        # Validate phone number
        if not self._validate_phone(phone_number):
            return {
                'success': False,
                'error': 'Invalid phone number format. Use E.164 format (e.g., +1234567890)'
            }
        
        # Check blacklist
        if self._is_blacklisted(phone_number):
            return {
                'success': False,
                'error': 'Phone number is blacklisted'
            }
        
        # Check rate limits
        if user_id and not self._check_rate_limit(user_id):
            return {
                'success': False,
                'error': 'Rate limit exceeded. Daily limit reached.'
            }
        
        # Check quiet hours
        if user_id and self._is_quiet_hours(user_id):
            return {
                'success': False,
                'error': 'SMS sending is currently in quiet hours'
            }
        
        # Get template
        template = self.get_template(template_id)
        if not template:
            return {
                'success': False,
                'error': f'Template {template_id} not found'
            }
        
        # Check opt-in
        if template.requires_opt_in and user_id:
            prefs = self._get_user_preferences(user_id)
            if not prefs or not prefs.opt_in:
                return {
                    'success': False,
                    'error': 'User has not opted in to SMS notifications'
                }
        
        # Render message
        try:
            message = template.render(variables)
        except ValueError as e:
            return {
                'success': False,
                'error': str(e)
            }
        
        # Get provider
        provider = self.get_default_provider()
        if not provider:
            return {
                'success': False,
                'error': 'No SMS provider configured'
            }
        
        # Create log entry
        log = self._create_log(
            phone_number=phone_number,
            template=template,
            message=message,
            provider=provider,
            user_id=user_id,
            scheduled_at=scheduled_at
        )
        
        # If scheduled, just return
        if scheduled_at:
            return {
                'success': True,
                'message_id': str(log.id),
                'status': 'scheduled',
                'scheduled_at': scheduled_at.isoformat()
            }
        
        # Send the message
        result = self._send_to_provider(provider, phone_number, message, log.id)
        
        # Update log
        if result['success']:
            log.status = 'sent'
            log.provider_message_id = result.get('message_id', '')
            log.provider_response = result.get('response', {})
            log.sent_at = datetime.now()
            log.save()
            self._increment_rate_limit(user_id)
            self._update_daily_stats(log)
            
            # Increment template usage
            template.usage_count += 1
            template.save(update_fields=['usage_count'])
            
            # Increment provider daily count
            provider.increment_daily_count()
        else:
            log.status = 'failed'
            log.error_code = result.get('error_code', '')
            log.error_message = result.get('error', 'Unknown error')
            log.failed_at = datetime.now()
            log.save()
        
        return {
            'success': result['success'],
            'message_id': str(log.id),
            'provider_message_id': log.provider_message_id,
            'status': log.status,
            'error': log.error_message if not result['success'] else None
        }
    
    def send_bulk_sms(
        self,
        phone_numbers: List[str],
        template_id: str,
        variables: Dict[str, Any] = None,
        user_ids: List[str] = None
    ) -> Dict[str, Any]:
        """
        Send SMS to multiple recipients.
        
        Args:
            phone_numbers: List of phone numbers
            template_id: Template ID
            variables: Variables to fill in template
            user_ids: Optional user IDs
        
        Returns:
            Result dictionary with success count and failures
        """
        variables = variables or {}
        user_ids = user_ids or []
        
        results = {
            'total': len(phone_numbers),
            'success': 0,
            'failed': 0,
            'pending': 0,
            'details': []
        }
        
        for i, phone in enumerate(phone_numbers):
            user_id = user_ids[i] if i < len(user_ids) else None
            result = self.send_sms(
                phone_number=phone,
                template_id=template_id,
                variables=variables,
                user_id=user_id
            )
            
            if result['success']:
                results['success'] += 1
            else:
                results['failed'] += 1
            
            results['details'].append({
                'phone_number': phone,
                'success': result['success'],
                'error': result.get('error'),
                'message_id': result.get('message_id')
            })
        
        return results
    
    def send_notification(
        self,
        user_id: str,
        notification_type: str,
        variables: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Send a notification SMS to a user.
        
        Args:
            user_id: User ID
            notification_type: Type of notification
            variables: Variables for the template
        
        Returns:
            Result dictionary
        """
        variables = variables or {}
        
        # Get user preferences
        prefs = self._get_user_preferences(user_id)
        if not prefs:
            return {
                'success': False,
                'error': 'User SMS preferences not found'
            }
        
        # Check if user has opted in
        if not prefs.opt_in:
            return {
                'success': False,
                'error': 'User has not opted in to SMS notifications'
            }
        
        # Check if phone is verified
        if not prefs.is_verified:
            return {
                'success': False,
                'error': 'Phone number not verified'
            }
        
        # Check if notification type is enabled
        if notification_type in prefs.disabled_types:
            return {
                'success': False,
                'error': f'Notification type {notification_type} is disabled for SMS'
            }
        
        if prefs.enabled_types and notification_type not in prefs.enabled_types:
            return {
                'success': False,
                'error': f'Notification type {notification_type} is not enabled for SMS'
            }
        
        # Map notification type to template ID
        template_map = {
            'analysis_complete': 'sms_analysis_complete',
            'new_device_login': 'sms_new_device_login',
            'resume_expiring': 'sms_resume_expiring',
            'job_match': 'sms_job_match',
            'interview_reminder': 'sms_interview_reminder',
            'application_status': 'sms_application_status',
            'security_alert': 'sms_security_alert',
            'account_update': 'sms_account_update',
        }
        
        template_id = template_map.get(notification_type)
        if not template_id:
            return {
                'success': False,
                'error': f'Unknown notification type: {notification_type}'
            }
        
        return self.send_sms(
            phone_number=prefs.phone_number,
            template_id=template_id,
            variables=variables,
            user_id=user_id
        )
    
    def send_verification_code(self, phone_number: str) -> Dict[str, Any]:
        """
        Send a verification code to a phone number.
        
        Args:
            phone_number: Recipient phone number
        
        Returns:
            Result dictionary
        """
        # Generate verification code
        code = ''.join(random.choices(string.digits, k=6))
        
        # Store code in cache (expires in 10 minutes)
        cache_key = f'{self.cache_prefix}verify_{phone_number}'
        cache.set(cache_key, code, 600)
        
        # Send SMS
        result = self.send_sms(
            phone_number=phone_number,
            template_id='sms_verification',
            variables={'code': code}
        )
        
        if result['success']:
            result['code'] = code  # Only return in development/testing
        
        return result
    
    def verify_code(self, phone_number: str, code: str) -> bool:
        """
        Verify a phone number with the provided code.
        
        Args:
            phone_number: Phone number to verify
            code: Verification code
        
        Returns:
            True if verified successfully
        """
        cache_key = f'{self.cache_prefix}verify_{phone_number}'
        stored_code = cache.get(cache_key)
        
        if stored_code and stored_code == code:
            # Mark as verified in preferences
            prefs = self._get_user_preferences_by_phone(phone_number)
            if prefs:
                prefs.is_verified = True
                prefs.verified_at = datetime.now()
                prefs.verification_attempts = 0
                prefs.save()
            
            cache.delete(cache_key)
            return True
        
        return False
    
    def update_sms_status(
        self,
        message_id: str,
        status: str,
        error_code: str = None,
        error_message: str = None,
        delivered_at: datetime = None
    ) -> bool:
        """
        Update SMS delivery status.
        
        Args:
            message_id: SMS log ID or provider message ID
            status: New status
            error_code: Optional error code
            error_message: Optional error message
            delivered_at: Optional delivery time
        
        Returns:
            True if updated successfully
        """
        try:
            log = SMSLog.objects.filter(id=message_id).first()
            if not log:
                log = SMSLog.objects.filter(provider_message_id=message_id).first()
            
            if not log:
                return False
            
            old_status = log.status
            log.status = status
            
            if status == 'delivered':
                log.delivered_at = delivered_at or datetime.now()
            elif status == 'failed':
                log.failed_at = datetime.now()
                if error_code:
                    log.error_code = error_code
                if error_message:
                    log.error_message = error_message
            
            # Update status history
            if not log.status_history:
                log.status_history = []
            log.status_history.append({
                'from': old_status,
                'to': status,
                'timestamp': datetime.now().isoformat()
            })
            
            log.save()
            
            # Update daily stats if delivered
            if status == 'delivered':
                self._update_daily_stats(log)
            
            return True
        except Exception as e:
            logger.error(f"Failed to update SMS status: {e}")
            return False
    
    def get_user_sms_history(self, user_id: str, limit: int = 50) -> List[SMSLog]:
        """Get SMS history for a user."""
        try:
            return SMSLog.objects.filter(
                user_id=user_id
            ).select_related('template', 'provider').order_by('-created_at')[:limit]
        except:
            return []
    
    def get_user_preferences(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user SMS preferences."""
        prefs = self._get_user_preferences(user_id)
        if prefs:
            return {
                'phone_number': prefs.phone_number,
                'is_verified': prefs.is_verified,
                'verified_at': prefs.verified_at,
                'opt_in': prefs.opt_in,
                'opt_in_at': prefs.opt_in_at,
                'daily_limit': prefs.daily_limit,
                'monthly_limit': prefs.monthly_limit,
                'enabled_types': prefs.enabled_types,
                'disabled_types': prefs.disabled_types,
                'quiet_hours_enabled': prefs.quiet_hours_enabled,
                'quiet_hours_start': prefs.quiet_hours_start,
                'quiet_hours_end': prefs.quiet_hours_end,
                'quiet_hours_timezone': prefs.quiet_hours_timezone
            }
        return None
    
    def update_user_preferences(
        self,
        user_id: str,
        phone_number: str = None,
        opt_in: bool = None,
        daily_limit: int = None,
        monthly_limit: int = None,
        enabled_types: List[str] = None,
        disabled_types: List[str] = None,
        quiet_hours_enabled: bool = None,
        quiet_hours_start: str = None,
        quiet_hours_end: str = None,
        quiet_hours_timezone: str = None
    ) -> Dict[str, Any]:
        """Update user SMS preferences."""
        try:
            prefs = self._get_or_create_preferences(user_id)
            
            if phone_number is not None:
                if phone_number and not self._validate_phone(phone_number):
                    return {'success': False, 'error': 'Invalid phone number format'}
                prefs.phone_number = phone_number or ''
                if phone_number:
                    prefs.is_verified = False
                    prefs.verified_at = None
                    prefs.verification_attempts = 0
            
            if opt_in is not None:
                prefs.opt_in = opt_in
                if opt_in:
                    prefs.opt_in_at = datetime.now()
                else:
                    prefs.opt_out_at = datetime.now()
            
            if daily_limit is not None:
                prefs.daily_limit = daily_limit
            
            if monthly_limit is not None:
                prefs.monthly_limit = monthly_limit
            
            if enabled_types is not None:
                valid_types = [
                    'analysis_complete', 'new_device_login', 'resume_expiring',
                    'job_match', 'interview_reminder', 'application_status',
                    'security_alert', 'account_update', 'promotional', 'system'
                ]
                prefs.enabled_types = [t for t in enabled_types if t in valid_types]
            
            if disabled_types is not None:
                valid_types = [
                    'analysis_complete', 'new_device_login', 'resume_expiring',
                    'job_match', 'interview_reminder', 'application_status',
                    'security_alert', 'account_update', 'promotional', 'system'
                ]
                prefs.disabled_types = [t for t in disabled_types if t in valid_types]
            
            if quiet_hours_enabled is not None:
                prefs.quiet_hours_enabled = quiet_hours_enabled
            
            if quiet_hours_start is not None:
                prefs.quiet_hours_start = quiet_hours_start
            
            if quiet_hours_end is not None:
                prefs.quiet_hours_end = quiet_hours_end
            
            if quiet_hours_timezone is not None:
                prefs.quiet_hours_timezone = quiet_hours_timezone
            
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
    
    def _get_user_preferences(self, user_id: str) -> Optional[UserSMSPreferences]:
        try:
            return UserSMSPreferences.objects.filter(user_id=user_id).first()
        except:
            return None
    
    def _get_user_preferences_by_phone(self, phone_number: str) -> Optional[UserSMSPreferences]:
        try:
            return UserSMSPreferences.objects.filter(phone_number=phone_number).first()
        except:
            return None
    
    def _get_or_create_preferences(self, user_id: str) -> UserSMSPreferences:
        prefs = self._get_user_preferences(user_id)
        if not prefs:
            prefs = UserSMSPreferences.objects.create(
                user_id=user_id,
                phone_number='',
                enabled_types=[],
                disabled_types=[]
            )
        return prefs
    
    def _validate_phone(self, phone_number: str) -> bool:
        if not phone_number:
            return False
        return bool(re.match(r'^\+?[1-9]\d{1,14}$', phone_number))
    
    def _is_blacklisted(self, phone_number: str) -> bool:
        """Check if phone number is blacklisted."""
        try:
            blacklist = SMSBlacklist.objects.filter(phone_number=phone_number).first()
            if blacklist:
                if blacklist.is_expired():
                    blacklist.delete()
                    return False
                return True
            return False
        except:
            return False
    
    def _check_rate_limit(self, user_id: str) -> bool:
        """Check if user has exceeded rate limit."""
        if not user_id:
            return True
        
        today = datetime.now().date()
        cache_key = f'{self.cache_prefix}ratelimit_{user_id}_{today}'
        
        count = cache.get(cache_key, 0)
        prefs = self._get_user_preferences(user_id)
        limit = prefs.daily_limit if prefs else 5
        
        if count >= limit:
            return False
        
        return True
    
    def _increment_rate_limit(self, user_id: str) -> None:
        """Increment rate limit counter."""
        if not user_id:
            return
        
        today = datetime.now().date()
        cache_key = f'{self.cache_prefix}ratelimit_{user_id}_{today}'
        
        count = cache.get(cache_key, 0)
        cache.set(cache_key, count + 1, 86400)  # 24 hours
    
    def _is_quiet_hours(self, user_id: str) -> bool:
        """Check if current time is within quiet hours."""
        prefs = self._get_user_preferences(user_id)
        if not prefs or not prefs.quiet_hours_enabled:
            return False
        
        if not prefs.quiet_hours_start or not prefs.quiet_hours_end:
            return False
        
        now = datetime.now().time()
        start = prefs.quiet_hours_start
        end = prefs.quiet_hours_end
        
        if start < end:
            return start <= now <= end
        else:
            return now >= start or now <= end
    
    def _create_log(
        self,
        phone_number: str,
        template: SMSTemplate,
        message: str,
        provider: SMSProvider,
        user_id: str = None,
        scheduled_at: datetime = None
    ) -> SMSLog:
        return SMSLog.objects.create(
            phone_number=phone_number,
            template=template,
            template_id_used=template.template_id,
            message=message,
            message_length=len(message),
            provider=provider,
            user_id=user_id,
            status='queued' if scheduled_at else 'pending',
            scheduled_at=scheduled_at,
            segments=1
        )
    
    def _send_to_provider(
        self,
        provider: SMSProvider,
        phone_number: str,
        message: str,
        log_id: str
    ) -> Dict[str, Any]:
        """
        Send SMS to the configured provider.
        This is a mock implementation. In production, integrate with Twilio, AWS SNS, etc.
        """
        # Mock implementation for testing
        import uuid
        mock_message_id = str(uuid.uuid4())
        
        return {
            'success': True,
            'message_id': mock_message_id,
            'response': {
                'status': 'queued',
                'to': phone_number,
                'message_length': len(message)
            }
        }
    
    def _update_daily_stats(self, log: SMSLog) -> None:
        """Update daily statistics."""
        try:
            today = datetime.now().date()
            stats, created = SMSDailyStats.objects.get_or_create(date=today)
            
            if log.status == 'sent' or log.status == 'delivered':
                stats.total_sent += 1
                if log.template:
                    template_name = log.template.name
                    stats.by_template[template_name] = stats.by_template.get(template_name, 0) + 1
                if log.provider:
                    provider_name = log.provider.name
                    stats.by_provider[provider_name] = stats.by_provider.get(provider_name, 0) + 1
            
            if log.status == 'delivered':
                stats.total_delivered += 1
            
            if log.status == 'failed':
                stats.total_failed += 1
            
            stats.save()
        except Exception as e:
            logger.error(f"Failed to update daily stats: {e}")