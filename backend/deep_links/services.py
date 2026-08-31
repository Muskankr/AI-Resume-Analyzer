"""
Deep Links Services for "Apply Directly" Feature
"""

import logging
import re
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from urllib.parse import urlparse
from django.db import transaction
from django.contrib.auth import get_user_model

from .models import (
    DeepLink,
    DeepLinkClick,
    JobPosting,
    JobMatch,
    DeepLinkAnalytics,
    DeepLinkDomain
)

logger = logging.getLogger(__name__)

User = get_user_model()


class DeepLinkService:
    """Core service for deep link management."""
    
    def __init__(self):
        pass
    
    def create_deep_link(
        self,
        title: str,
        company: str,
        original_url: str,
        location: str = '',
        source: str = '',
        job_id: str = '',
        match_score: float = 0,
        created_by: str = None
    ) -> Dict[str, Any]:
        """
        Create a new deep link.
        
        Args:
            title: Job title
            company: Company name
            original_url: Original job posting URL
            location: Job location
            source: Source of the job
            job_id: External job ID
            match_score: Match score
            created_by: User ID
        
        Returns:
            Result dictionary
        """
        # Validate domain
        domain_check = self._validate_domain(original_url)
        if not domain_check['valid']:
            return {
                'success': False,
                'error': domain_check['message']
            }
        
        try:
            # Check if deep link already exists for this URL
            existing = DeepLink.objects.filter(
                original_url=original_url,
                is_active=True
            ).first()
            
            if existing:
                return {
                    'success': True,
                    'data': {
                        'id': str(existing.id),
                        'short_code': existing.short_code,
                        'redirect_url': existing.redirect_url,
                        'original_url': existing.original_url
                    },
                    'message': 'Deep link already exists'
                }
            
            # Create deep link
            deep_link = DeepLink.objects.create(
                title=title,
                company=company,
                location=location,
                original_url=original_url,
                source=source,
                job_id=job_id,
                match_score=match_score
            )
            
            # Create job posting
            job_posting = JobPosting.objects.create(
                title=title,
                company=company,
                location=location,
                external_url=original_url,
                source='manual' if not source else source,
                deep_link=deep_link,
                external_id=job_id
            )
            
            logger.info(f"Created deep link for {title} at {company}")
            
            return {
                'success': True,
                'data': {
                    'id': str(deep_link.id),
                    'short_code': deep_link.short_code,
                    'redirect_url': deep_link.redirect_url,
                    'original_url': deep_link.original_url,
                    'job_posting_id': str(job_posting.id)
                },
                'message': 'Deep link created successfully'
            }
            
        except Exception as e:
            logger.error(f"Failed to create deep link: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def track_click(
        self,
        short_code: str,
        user_id: str = None,
        ip_address: str = None,
        user_agent: str = '',
        consent_given: bool = False,
        referer: str = '',
        session_id: str = ''
    ) -> Dict[str, Any]:
        """
        Track a deep link click.
        
        Args:
            short_code: Deep link short code
            user_id: User ID
            ip_address: IP address
            user_agent: User agent string
            consent_given: Whether user gave consent
            referer: Referer URL
            session_id: Session ID
        
        Returns:
            Result dictionary
        """
        try:
            deep_link = DeepLink.objects.get(short_code=short_code, is_active=True)
        except DeepLink.DoesNotExist:
            return {
                'success': False,
                'error': 'Deep link not found'
            }
        
        # Check if expired
        if deep_link.is_expired():
            return {
                'success': False,
                'error': 'Deep link has expired'
            }
        
        try:
            with transaction.atomic():
                # Create click record
                click = DeepLinkClick.objects.create(
                    deep_link=deep_link,
                    user_id=user_id,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    referer=referer,
                    consent_given=consent_given,
                    session_id=session_id
                )
                
                # Increment click count
                deep_link.increment_click(user_id, ip_address)
                
                # Update analytics
                self._update_analytics(deep_link)
                
                logger.info(f"Tracked click for deep link {short_code}")
                
                return {
                    'success': True,
                    'deep_link': deep_link,
                    'click_id': str(click.id)
                }
                
        except Exception as e:
            logger.error(f"Failed to track click: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def track_engagement(
        self,
        deep_link_id: str,
        user_id: str = None,
        consent_given: bool = False,
        time_on_page: int = 0,
        scrolled: bool = False,
        interacted: bool = False
    ) -> Dict[str, Any]:
        """
        Track engagement with a deep link.
        
        Args:
            deep_link_id: Deep link ID
            user_id: User ID
            consent_given: Whether user gave consent
            time_on_page: Time spent on page in seconds
            scrolled: Whether user scrolled
            interacted: Whether user interacted
        
        Returns:
            Result dictionary
        """
        try:
            # Find the most recent click for this user and deep link
            click = DeepLinkClick.objects.filter(
                deep_link_id=deep_link_id,
                user_id=user_id if user_id else None
            ).order_by('-clicked_at').first()
            
            if not click:
                return {
                    'success': False,
                    'error': 'No click found for this user'
                }
            
            # Update engagement metrics
            click.time_on_page = time_on_page
            click.scrolled = scrolled
            click.interacted = interacted
            click.save(update_fields=['time_on_page', 'scrolled', 'interacted'])
            
            # Update analytics
            deep_link = DeepLink.objects.get(id=deep_link_id)
            self._update_analytics(deep_link)
            
            return {
                'success': True,
                'message': 'Engagement tracked successfully'
            }
            
        except Exception as e:
            logger.error(f"Failed to track engagement: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_job_match(
        self,
        user_id: str,
        job_posting_id: str,
        match_score: float = 0,
        matched_skills: List[str] = None,
        missing_skills: List[str] = None
    ) -> Dict[str, Any]:
        """
        Create a job match for a user.
        
        Args:
            user_id: User ID
            job_posting_id: Job posting ID
            match_score: Match score
            matched_skills: List of matched skills
            missing_skills: List of missing skills
        
        Returns:
            Result dictionary
        """
        try:
            job_posting = JobPosting.objects.get(id=job_posting_id)
        except JobPosting.DoesNotExist:
            return {
                'success': False,
                'error': 'Job posting not found'
            }
        
        try:
            match, created = JobMatch.objects.get_or_create(
                user_id=user_id,
                job_posting=job_posting,
                defaults={
                    'match_score': match_score,
                    'matched_skills': matched_skills or [],
                    'missing_skills': missing_skills or [],
                    'deep_link': job_posting.deep_link
                }
            )
            
            if not created:
                # Update existing match
                match.match_score = match_score
                match.matched_skills = matched_skills or []
                match.missing_skills = missing_skills or []
                match.save(update_fields=['match_score', 'matched_skills', 'missing_skills'])
            
            return {
                'success': True,
                'data': {
                    'match_id': str(match.id),
                    'created': created,
                    'deep_link': DeepLinkSerializer(job_posting.deep_link).data if job_posting.deep_link else None
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to create job match: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_job_posting_match(
        self,
        user_id: str,
        title: str,
        company: str,
        original_url: str,
        location: str = '',
        match_score: float = 0,
        matched_skills: List[str] = None,
        missing_skills: List[str] = None
    ) -> Dict[str, Any]:
        """
        Create a job posting and match.
        
        Args:
            user_id: User ID
            title: Job title
            company: Company name
            original_url: Original URL
            location: Location
            match_score: Match score
            matched_skills: Matched skills
            missing_skills: Missing skills
        
        Returns:
            Result dictionary
        """
        # Create deep link first
        link_result = self.create_deep_link(
            title=title,
            company=company,
            original_url=original_url,
            location=location
        )
        
        if not link_result['success']:
            return link_result
        
        job_posting = JobPosting.objects.filter(
            deep_link_id=link_result['data']['id']
        ).first()
        
        if not job_posting:
            return {
                'success': False,
                'error': 'Job posting not found'
            }
        
        return self.create_job_match(
            user_id=user_id,
            job_posting_id=job_posting.id,
            match_score=match_score,
            matched_skills=matched_skills,
            missing_skills=missing_skills
        )
    
    def get_stats(self) -> Dict[str, Any]:
        """Get overall deep link statistics."""
        total_links = DeepLink.objects.count()
        total_clicks = DeepLinkClick.objects.count()
        unique_clicks = DeepLinkClick.objects.values('user_id').distinct().count()
        
        # Top performing links
        top_links = DeepLink.objects.filter(
            is_active=True
        ).order_by('-click_count')[:10]
        
        return {
            'total_links': total_links,
            'total_clicks': total_clicks,
            'unique_clicks': unique_clicks,
            'click_through_rate': (total_clicks / total_links * 100) if total_links > 0 else 0,
            'top_performing': [
                {
                    'title': link.title,
                    'company': link.company,
                    'clicks': link.click_count,
                    'short_code': link.short_code
                }
                for link in top_links
            ],
            'by_source': self._get_stats_by_source(),
            'by_date': self._get_stats_by_date()
        }
    
    def _get_stats_by_source(self) -> Dict[str, int]:
        """Get statistics by source."""
        return DeepLink.objects.values('source').annotate(
            count=Count('id'),
            clicks=Sum('click_count')
        )
    
    def _get_stats_by_date(self) -> Dict[str, int]:
        """Get statistics by date."""
        last_7_days = datetime.now() - timedelta(days=7)
        clicks = DeepLinkClick.objects.filter(
            clicked_at__gte=last_7_days
        ).extra({'date': "date(clicked_at)"}).values('date').annotate(
            count=Count('id')
        )
        return {str(item['date']): item['count'] for item in clicks}
    
    def _validate_domain(self, url: str) -> Dict[str, Any]:
        """Validate the domain of a URL."""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc
            
            if not domain:
                return {
                    'valid': False,
                    'message': 'Invalid URL - no domain found'
                }
            
            # Remove www prefix for comparison
            clean_domain = domain.replace('www.', '')
            
            # Check if domain is trusted
            trusted = DeepLinkDomain.objects.filter(
                domain__iexact=clean_domain,
                is_trusted=True,
                is_active=True
            ).exists()
            
            if not trusted:
                return {
                    'valid': False,
                    'message': f'Domain "{domain}" is not trusted. Please use an approved domain.'
                }
            
            return {
                'valid': True,
                'domain': domain
            }
            
        except Exception as e:
            return {
                'valid': False,
                'message': f'Invalid URL: {str(e)}'
            }
    
    def _update_analytics(self, deep_link: DeepLink) -> None:
        """Update analytics for a deep link."""
        today = datetime.now().date()
        
        analytics, created = DeepLinkAnalytics.objects.get_or_create(
            deep_link=deep_link,
            date=today
        )
        
        # Update counts
        analytics.total_clicks = DeepLinkClick.objects.filter(
            deep_link=deep_link,
            clicked_at__date=today
        ).count()
        
        analytics.unique_clicks = DeepLinkClick.objects.filter(
            deep_link=deep_link,
            clicked_at__date=today
        ).values('user_id').distinct().count()
        
        analytics.click_rate = (analytics.total_clicks / analytics.unique_clicks * 100) if analytics.unique_clicks > 0 else 0
        
        # Update engagement
        clicks = DeepLinkClick.objects.filter(
            deep_link=deep_link,
            clicked_at__date=today
        )
        
        if clicks.exists():
            analytics.avg_time_on_page = clicks.aggregate(avg=models.Avg('time_on_page'))['avg'] or 0
            analytics.interaction_rate = (clicks.filter(interacted=True).count() / clicks.count() * 100) if clicks.count() > 0 else 0
        
        analytics.save()
    
    def get_user_matches(self, user_id: str) -> List[Dict[str, Any]]:
        """Get job matches for a user."""
        matches = JobMatch.objects.filter(
            user_id=user_id
        ).select_related('job_posting', 'deep_link').order_by('-match_score')
        
        return [
            {
                'id': str(match.id),
                'job_title': match.job_posting.title,
                'company': match.job_posting.company,
                'location': match.job_posting.location,
                'match_score': match.match_score,
                'matched_skills': match.matched_skills,
                'missing_skills': match.missing_skills,
                'deep_link': {
                    'short_code': match.deep_link.short_code,
                    'url': match.deep_link.redirect_url,
                    'original_url': match.deep_link.original_url
                } if match.deep_link else None,
                'is_applied': match.is_applied,
                'is_viewed': match.is_viewed,
                'created_at': match.created_at.isoformat()
            }
            for match in matches
        ]