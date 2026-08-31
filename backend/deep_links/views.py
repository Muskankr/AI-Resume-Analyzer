"""
Deep Links Views for API
"""

import logging
from datetime import datetime, timedelta
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import redirect, get_object_or_404
from django.http import HttpResponseRedirect
from django.db.models import Q, Count, Sum, Avg

from .models import (
    DeepLink,
    DeepLinkClick,
    JobPosting,
    JobMatch,
    DeepLinkAnalytics,
    DeepLinkDomain
)
from .serializers import (
    DeepLinkSerializer,
    DeepLinkClickSerializer,
    JobPostingSerializer,
    JobMatchSerializer,
    DeepLinkAnalyticsSerializer,
    DeepLinkRequestSerializer,
    DeepLinkClickRequestSerializer,
    JobMatchRequestSerializer,
    DeepLinkStatsSerializer
)
from .services import DeepLinkService

logger = logging.getLogger(__name__)


class DeepLinkRedirectView(APIView):
    """Redirect to the original URL via deep link."""
    permission_classes = [AllowAny]
    
    def get(self, request, short_code):
        service = DeepLinkService()
        
        # Track the click
        result = service.track_click(
            short_code=short_code,
            user_id=request.user.id if request.user.is_authenticated else None,
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            consent_given=request.GET.get('consent') == 'true',
            referer=request.META.get('HTTP_REFERER', ''),
            session_id=request.session.session_key
        )
        
        if not result['success']:
            return Response({
                'error': result.get('error', 'Deep link not found')
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get the deep link
        deep_link = result['deep_link']
        
        # Update match as viewed if user is authenticated
        if request.user.is_authenticated:
            JobMatch.objects.filter(
                user_id=request.user.id,
                deep_link=deep_link
            ).update(is_viewed=True, viewed_at=datetime.now())
        
        # Redirect to original URL
        return HttpResponseRedirect(deep_link.original_url)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class DeepLinkCreateView(APIView):
    """Create a new deep link."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = DeepLinkRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        service = DeepLinkService()
        result = service.create_deep_link(
            title=serializer.validated_data['title'],
            company=serializer.validated_data['company'],
            original_url=serializer.validated_data['original_url'],
            location=serializer.validated_data.get('location', ''),
            source=serializer.validated_data.get('source', ''),
            job_id=serializer.validated_data.get('job_id', ''),
            match_score=serializer.validated_data.get('match_score', 0),
            created_by=request.user.id
        )
        
        if result['success']:
            return Response({
                'success': True,
                'data': result['data'],
                'message': 'Deep link created successfully'
            })
        
        return Response({
            'success': False,
            'error': result.get('error', 'Failed to create deep link')
        }, status=status.HTTP_400_BAD_REQUEST)


class DeepLinkListView(APIView):
    """List all deep links."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        limit = request.query_params.get('limit', 50)
        search = request.query_params.get('search', '')
        
        try:
            limit = int(limit)
            if limit > 100:
                limit = 100
        except:
            limit = 50
        
        deep_links = DeepLink.objects.filter(is_active=True)
        
        if search:
            deep_links = deep_links.filter(
                Q(title__icontains=search) |
                Q(company__icontains=search) |
                Q(location__icontains=search)
            )
        
        deep_links = deep_links.order_by('-created_at')[:limit]
        serializer = DeepLinkSerializer(deep_links, many=True, context={'request': request})
        
        return Response({
            'success': True,
            'data': serializer.data,
            'count': len(serializer.data)
        })


class JobMatchView(APIView):
    """Get job matches for a user."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user_id = request.user.id
        limit = request.query_params.get('limit', 20)
        min_score = request.query_params.get('min_score', 0)
        
        try:
            limit = int(limit)
            min_score = float(min_score)
        except:
            limit = 20
            min_score = 0
        
        matches = JobMatch.objects.filter(
            user_id=user_id,
            match_score__gte=min_score
        ).select_related('job_posting', 'deep_link').order_by('-match_score')[:limit]
        
        serializer = JobMatchSerializer(matches, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data,
            'count': len(serializer.data)
        })
    
    def post(self, request):
        """Create a job match."""
        serializer = JobMatchRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user_id = request.user.id
        
        # Check if job posting exists, if not create one
        job_posting_id = serializer.validated_data.get('job_posting_id')
        title = serializer.validated_data.get('title')
        company = serializer.validated_data.get('company')
        original_url = serializer.validated_data.get('original_url')
        
        service = DeepLinkService()
        
        if job_posting_id:
            result = service.create_job_match(
                user_id=user_id,
                job_posting_id=job_posting_id
            )
        else:
            result = service.create_job_posting_match(
                user_id=user_id,
                title=title,
                company=company,
                original_url=original_url,
                location=serializer.validated_data.get('location', '')
            )
        
        if result['success']:
            return Response({
                'success': True,
                'data': result['data'],
                'message': 'Job match created successfully'
            })
        
        return Response({
            'success': False,
            'error': result.get('error', 'Failed to create job match')
        }, status=status.HTTP_400_BAD_REQUEST)


class JobMatchApplyView(APIView):
    """Mark a job match as applied."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, match_id):
        user_id = request.user.id
        
        try:
            match = JobMatch.objects.get(id=match_id, user_id=user_id)
        except JobMatch.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Job match not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        match.mark_as_applied()
        
        return Response({
            'success': True,
            'message': 'Applied successfully'
        })


class DeepLinkStatsView(APIView):
    """Get deep link statistics."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user_id = request.user.id
        
        # Only admins can see all stats
        if not request.user.is_staff and not request.user.is_superuser:
            # Regular users see their own stats
            matches = JobMatch.objects.filter(user_id=user_id)
            
            return Response({
                'success': True,
                'data': {
                    'total_matches': matches.count(),
                    'applied': matches.filter(is_applied=True).count(),
                    'viewed': matches.filter(is_viewed=True).count(),
                    'average_match_score': matches.aggregate(avg=Avg('match_score'))['avg'] or 0
                }
            })
        
        # Admin stats
        service = DeepLinkService()
        stats = service.get_stats()
        
        return Response({
            'success': True,
            'data': stats
        })


class DeepLinkEngagementView(APIView):
    """Track deep link engagement."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = DeepLinkClickRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        service = DeepLinkService()
        result = service.track_engagement(
            deep_link_id=serializer.validated_data['deep_link_id'],
            user_id=request.user.id if request.user.is_authenticated else None,
            consent_given=serializer.validated_data.get('consent_given', False),
            time_on_page=serializer.validated_data.get('time_on_page', 0),
            scrolled=serializer.validated_data.get('scrolled', False),
            interacted=serializer.validated_data.get('interacted', False)
        )
        
        if result['success']:
            return Response({
                'success': True,
                'message': 'Engagement tracked'
            })
        
        return Response({
            'success': False,
            'error': result.get('error', 'Failed to track engagement')
        }, status=status.HTTP_400_BAD_REQUEST)


class DeepLinkDomainView(APIView):
    """Manage trusted domains."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if not request.user.is_staff and not request.user.is_superuser:
            return Response({
                'success': False,
                'error': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        domains = DeepLinkDomain.objects.filter(is_active=True)
        serializer = DeepLinkDomainSerializer(domains, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    def post(self, request):
        if not request.user.is_staff and not request.user.is_superuser:
            return Response({
                'success': False,
                'error': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        domain = request.data.get('domain')
        is_trusted = request.data.get('is_trusted', True)
        
        if not domain:
            return Response({
                'success': False,
                'error': 'Domain is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        obj, created = DeepLinkDomain.objects.get_or_create(
            domain=domain,
            defaults={'is_trusted': is_trusted}
        )
        
        return Response({
            'success': True,
            'data': DeepLinkDomainSerializer(obj).data,
            'created': created
        })