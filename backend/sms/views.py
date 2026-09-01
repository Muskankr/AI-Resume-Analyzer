"""
SMS Views for API
"""

import logging
from datetime import datetime, timedelta
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum, Count
from django.core.cache import cache

from .models import (
    SMSLog, SMSTemplate, UserSMSPreferences,
    SMSBlacklist, SMSDailyStats, SMSWebhookLog,
    DEFAULT_SMS_TEMPLATES
)
from .serializers import (
    UserSMSPreferencesSerializer,
    SMSTemplateSerializer,
    SMSLogSerializer,
    SMSRequestSerializer,
    SMSBulkRequestSerializer,
    SMSVerifyRequestSerializer,
    SMSVerifySendSerializer,
    SMSOptInSerializer,
    SMSNotificationTypeSerializer,
    SMSQuietHoursSerializer,
    SMSStatusUpdateSerializer,
    SMSBlacklistSerializer,
    SMSDailyStatsSerializer
)
from .services import SMSService

logger = logging.getLogger(__name__)


class UserSMSPreferencesView(APIView):
    """Get user SMS preferences."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user_id = request.user.id
        service = SMSService()
        prefs = service._get_user_preferences(user_id)
        
        if prefs:
            serializer = UserSMSPreferencesSerializer(prefs)
            return Response({
                'success': True,
                'data': serializer.data
            })
        
        return Response({
            'success': True,
            'data': {
                'user_id': user_id,
                'phone_number': '',
                'is_verified': False,
                'opt_in': False,
                'daily_limit': 5,
                'monthly_limit': 50,
                'enabled_types': [],
                'disabled_types': [],
                'quiet_hours_enabled': False,
                'quiet_hours_start': None,
                'quiet_hours_end': None,
                'quiet_hours_timezone': 'UTC'
            }
        })


class UpdateSMSPreferencesView(APIView):
    """Update user SMS preferences."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user_id = request.user.id
        service = SMSService()
        
        phone_number = request.data.get('phone_number')
        opt_in = request.data.get('opt_in')
        daily_limit = request.data.get('daily_limit')
        monthly_limit = request.data.get('monthly_limit')
        enabled_types = request.data.get('enabled_types')
        disabled_types = request.data.get('disabled_types')
        quiet_hours_enabled = request.data.get('quiet_hours_enabled')
        quiet_hours_start = request.data.get('quiet_hours_start')
        quiet_hours_end = request.data.get('quiet_hours_end')
        quiet_hours_timezone = request.data.get('quiet_hours_timezone')
        
        result = service.update_user_preferences(
            user_id=user_id,
            phone_number=phone_number,
            opt_in=opt_in,
            daily_limit=daily_limit,
            monthly_limit=monthly_limit,
            enabled_types=enabled_types,
            disabled_types=disabled_types,
            quiet_hours_enabled=quiet_hours_enabled,
            quiet_hours_start=quiet_hours_start,
            quiet_hours_end=quiet_hours_end,
            quiet_hours_timezone=quiet_hours_timezone
        )
        
        if result['success']:
            return Response(result)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)


class SendVerificationCodeView(APIView):
    """Send verification code to phone."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = SMSVerifySendSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        phone_number = serializer.validated_data['phone_number']
        user_id = request.user.id
        service = SMSService()
        
        # Update user's phone number
        prefs = service._get_or_create_preferences(user_id)
        prefs.phone_number = phone_number
        prefs.verification_attempts = 0
        prefs.save()
        
        result = service.send_verification_code(phone_number)
        
        if result['success']:
            return Response({
                'success': True,
                'message': 'Verification code sent',
                'phone_number': phone_number,
                'expires_in': '10 minutes'
            })
        
        return Response({
            'success': False,
            'error': result.get('error', 'Failed to send verification code')
        }, status=status.HTTP_400_BAD_REQUEST)


class VerifyPhoneView(APIView):
    """Verify phone number with code."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = SMSVerifyRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        phone_number = serializer.validated_data['phone_number']
        code = serializer.validated_data['code']
        user_id = request.user.id
        service = SMSService()
        
        # Check attempts
        prefs = service._get_user_preferences(user_id)
        if prefs and prefs.verification_attempts >= 5:
            return Response({
                'success': False,
                'error': 'Too many verification attempts. Please request a new code.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if service.verify_code(phone_number, code):
            return Response({
                'success': True,
                'message': 'Phone number verified successfully'
            })
        
        # Increment attempts
        if prefs:
            prefs.verification_attempts += 1
            prefs.save()
        
        return Response({
            'success': False,
            'error': 'Invalid verification code',
            'attempts_remaining': 5 - (prefs.verification_attempts if prefs else 0)
        }, status=status.HTTP_400_BAD_REQUEST)


class SendSMSView(APIView):
    """Send SMS to user."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = SMSRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user_id = request.user.id
        service = SMSService()
        
        # Get user's phone number from preferences
        prefs = service._get_user_preferences(user_id)
        if not prefs or not prefs.phone_number:
            return Response({
                'success': False,
                'error': 'No phone number registered'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not prefs.opt_in:
            return Response({
                'success': False,
                'error': 'SMS notifications are disabled. Please opt-in first.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not prefs.is_verified:
            return Response({
                'success': False,
                'error': 'Phone number not verified'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        phone_number = serializer.validated_data.get('phone_number', prefs.phone_number)
        template_id = serializer.validated_data['template_id']
        variables = serializer.validated_data.get('variables', {})
        scheduled_at = serializer.validated_data.get('scheduled_at')
        
        result = service.send_sms(
            phone_number=phone_number,
            template_id=template_id,
            variables=variables,
            user_id=user_id,
            scheduled_at=scheduled_at
        )
        
        if result['success']:
            return Response(result)
        
        return Response({
            'success': False,
            'error': result.get('error', 'Failed to send SMS')
        }, status=status.HTTP_400_BAD_REQUEST)


class BulkSendSMSView(APIView):
    """Send bulk SMS."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = SMSBulkRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        phone_numbers = serializer.validated_data['phone_numbers']
        template_id = serializer.validated_data['template_id']
        variables = serializer.validated_data.get('variables', {})
        user_ids = serializer.validated_data.get('user_ids', [])
        
        service = SMSService()
        result = service.send_bulk_sms(
            phone_numbers=phone_numbers,
            template_id=template_id,
            variables=variables,
            user_ids=user_ids
        )
        
        return Response({
            'success': result['failed'] == 0,
            'data': result
        })


class ListSMSTemplatesView(APIView):
    """List all SMS templates."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        category = request.query_params.get('category')
        
        templates = SMSTemplate.objects.filter(is_active=True)
        if category:
            templates = templates.filter(category=category)
        
        serializer = SMSTemplateSerializer(templates, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data,
            'count': len(serializer.data)
        })


class SMSHistoryView(APIView):
    """Get user SMS history."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user_id = request.user.id
        limit = request.query_params.get('limit', 50)
        status_filter = request.query_params.get('status')
        
        try:
            limit = int(limit)
            if limit > 100:
                limit = 100
        except:
            limit = 50
        
        logs = SMSLog.objects.filter(user_id=user_id)
        if status_filter:
            logs = logs.filter(status=status_filter)
        
        logs = logs.order_by('-created_at')[:limit]
        serializer = SMSLogSerializer(logs, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data,
            'count': len(serializer.data)
        })


class SMSOptInView(APIView):
    """Handle SMS opt-in/opt-out."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = SMSOptInSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user_id = request.user.id
        opt_in = serializer.validated_data['opt_in']
        phone_number = serializer.validated_data.get('phone_number')
        
        service = SMSService()
        prefs = service._get_or_create_preferences(user_id)
        
        if phone_number:
            prefs.phone_number = phone_number
        
        prefs.opt_in = opt_in
        if opt_in:
            prefs.opt_in_at = datetime.now()
        else:
            prefs.opt_out_at = datetime.now()
        prefs.save()
        
        # If opted in and phone number not verified, send verification
        if opt_in and not prefs.is_verified and prefs.phone_number:
            service.send_verification_code(prefs.phone_number)
        
        return Response({
            'success': True,
            'message': f'SMS notifications {"enabled" if opt_in else "disabled"} successfully',
            'data': {
                'opt_in': prefs.opt_in,
                'is_verified': prefs.is_verified,
                'phone_number': prefs.phone_number
            }
        })


class SMSStatusWebhookView(APIView):
    """Webhook for SMS delivery status updates."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = SMSStatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'status': 'error'}, status=status.HTTP_400_BAD_REQUEST)
        
        message_id = serializer.validated_data['message_id']
        status = serializer.validated_data['status']
        error_code = serializer.validated_data.get('error_code')
        error_message = serializer.validated_data.get('error_message')
        delivered_at = serializer.validated_data.get('delivered_at')
        
        # Log webhook
        SMSWebhookLog.objects.create(
            message_id=message_id,
            status=status,
            payload=request.data
        )
        
        service = SMSService()
        success = service.update_sms_status(
            message_id=message_id,
            status=status,
            error_code=error_code,
            error_message=error_message,
            delivered_at=delivered_at
        )
        
        if success:
            return Response({'status': 'ok'})
        
        return Response({'status': 'error'}, status=status.HTTP_400_BAD_REQUEST)


class SMSStatisticsView(APIView):
    """Get SMS statistics."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user_id = request.user.id
        
        # Today's stats
        today = datetime.now().date()
        today_stats = SMSLog.objects.filter(
            user_id=user_id,
            created_at__date=today
        )
        
        total_sent = today_stats.filter(status__in=['sent', 'delivered']).count()
        total_failed = today_stats.filter(status='failed').count()
        total_pending = today_stats.filter(status='pending').count()
        
        # Month stats
        month_start = today.replace(day=1)
        month_stats = SMSLog.objects.filter(
            user_id=user_id,
            created_at__date__gte=month_start
        )
        month_sent = month_stats.filter(status__in=['sent', 'delivered']).count()
        
        # Get prefs for limits
        prefs = UserSMSPreferences.objects.filter(user_id=user_id).first()
        
        return Response({
            'success': True,
            'data': {
                'today': {
                    'sent': total_sent,
                    'failed': total_failed,
                    'pending': total_pending,
                    'limit': prefs.daily_limit if prefs else 5,
                    'remaining': (prefs.daily_limit if prefs else 5) - total_sent
                },
                'this_month': {
                    'sent': month_sent,
                    'limit': prefs.monthly_limit if prefs else 50,
                    'remaining': (prefs.monthly_limit if prefs else 50) - month_sent
                },
                'total_sms': SMSLog.objects.filter(user_id=user_id).count()
            }
        })


class SMSHealthCheckView(APIView):
    """Health check for SMS service."""
    permission_classes = [AllowAny]
    
    def get(self, request):
        service = SMSService()
        provider = service.get_default_provider()
        
        if provider and provider.is_active and provider.is_healthy:
            return Response({
                'status': 'healthy',
                'provider': provider.name,
                'daily_sent': provider.daily_sent,
                'daily_limit': provider.max_per_day
            })
        
        return Response({
            'status': 'unhealthy',
            'message': 'No active SMS provider configured'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)