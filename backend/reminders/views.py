"""
Reminder Views for API
"""

import logging
from datetime import datetime, timedelta
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q, Count, Sum
from django.shortcuts import get_object_or_404

from .models import (
    ResumeExpirationReminder,
    ReminderLog,
    UserReminderPreferences,
    ReminderTemplate
)
from .serializers import (
    ResumeExpirationReminderSerializer,
    ReminderLogSerializer,
    UserReminderPreferencesSerializer,
    ReminderTemplateSerializer,
    ReminderRequestSerializer,
    ReminderBulkRequestSerializer,
    ReminderPreferencesUpdateSerializer,
    ReminderStatsSerializer
)
from .services import ReminderService

logger = logging.getLogger(__name__)


class UserReminderPreferencesView(APIView):
    """Get user reminder preferences."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user_id = request.user.id
        service = ReminderService()
        prefs = service.get_user_preferences(user_id)
        
        if prefs:
            return Response({
                'success': True,
                'data': prefs
            })
        
        return Response({
            'success': True,
            'data': {
                'user_id': user_id,
                'opt_in': True,
                'reminder_frequency_days': 90,
                'warning_days_before': 30,
                'enabled_types': [],
                'disabled_types': [],
                'quiet_hours_enabled': False
            }
        })


class UpdateReminderPreferencesView(APIView):
    """Update user reminder preferences."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ReminderPreferencesUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user_id = request.user.id
        service = ReminderService()
        
        result = service.update_user_preferences(
            user_id=user_id,
            **serializer.validated_data
        )
        
        if result['success']:
            return Response(result)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)


class ListRemindersView(APIView):
    """List user's reminders."""
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
        
        reminders = ResumeExpirationReminder.objects.filter(user_id=user_id)
        if status_filter:
            reminders = reminders.filter(status=status_filter)
        
        reminders = reminders.order_by('-created_at')[:limit]
        serializer = ResumeExpirationReminderSerializer(reminders, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data,
            'count': len(serializer.data)
        })


class SendReminderView(APIView):
    """Send a reminder manually."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ReminderRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user_id = serializer.validated_data['user_id']
        reminder_type = serializer.validated_data['reminder_type']
        resume_id = serializer.validated_data.get('resume_id')
        variables = serializer.validated_data.get('variables', {})
        
        # Check if user has opted in
        service = ReminderService()
        prefs = service._get_user_preferences(user_id)
        if prefs and not prefs.opt_in:
            return Response({
                'success': False,
                'error': 'User has opted out of reminders'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        result = service.send_reminder(
            user_id=user_id,
            reminder_type=reminder_type,
            resume_id=resume_id,
            variables=variables
        )
        
        if result['success']:
            return Response(result)
        
        return Response({
            'success': False,
            'error': result.get('error', 'Failed to send reminder')
        }, status=status.HTTP_400_BAD_REQUEST)


class SendBulkRemindersView(APIView):
    """Send reminders to multiple users."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ReminderBulkRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user_ids = serializer.validated_data['user_ids']
        reminder_type = serializer.validated_data['reminder_type']
        variables = serializer.validated_data.get('variables', {})
        
        service = ReminderService()
        results = []
        
        for user_id in user_ids:
            result = service.send_reminder(
                user_id=user_id,
                reminder_type=reminder_type,
                variables=variables
            )
            results.append({
                'user_id': user_id,
                'success': result['success'],
                'error': result.get('error')
            })
        
        return Response({
            'success': True,
            'data': results,
            'total': len(results),
            'success_count': sum(1 for r in results if r['success'])
        })


class ReminderStatsView(APIView):
    """Get reminder statistics."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user_id = request.user.id
        service = ReminderService()
        stats = service.get_user_stats(user_id)
        
        return Response({
            'success': True,
            'data': stats
        })


class ReminderTemplateListView(APIView):
    """List all reminder templates."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        template_type = request.query_params.get('type')
        
        templates = ReminderTemplate.objects.filter(is_active=True)
        if template_type:
            templates = templates.filter(template_type=template_type)
        
        serializer = ReminderTemplateSerializer(templates, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data,
            'count': len(serializer.data)
        })


class ReminderEngagementView(APIView):
    """Track reminder engagement (open/click)."""
    permission_classes = [AllowAny]
    
    def get(self, request, reminder_id):
        action = request.query_params.get('action', 'open')
        
        try:
            reminder = ResumeExpirationReminder.objects.get(id=reminder_id)
        except:
            return Response({'status': 'error'}, status=status.HTTP_404_NOT_FOUND)
        
        if action == 'open':
            reminder.mark_as_opened()
        elif action == 'click':
            reminder.mark_as_clicked()
        
        return Response({'status': 'ok'})