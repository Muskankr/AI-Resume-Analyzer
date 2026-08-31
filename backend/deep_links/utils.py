"""
Deep Links Utilities
"""

import re
import json
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from typing import Dict, Any, Optional, List
import hashlib


def extract_domain(url: str) -> Optional[str]:
    """
    Extract domain from URL.
    
    Args:
        url: Full URL
    
    Returns:
        Domain string or None
    """
    try:
        parsed = urlparse(url)
        domain = parsed.netloc
        # Remove www prefix
        domain = domain.replace('www.', '')
        return domain
    except:
        return None


def normalize_url(url: str) -> str:
    """
    Normalize URL for consistent comparison.
    
    Args:
        url: URL to normalize
    
    Returns:
        Normalized URL
    """
    try:
        parsed = urlparse(url)
        
        # Lowercase scheme and netloc
        scheme = parsed.scheme.lower()
        netloc = parsed.netloc.lower()
        
        # Remove trailing slash
        path = parsed.path.rstrip('/')
        
        # Sort query parameters
        query_params = parse_qs(parsed.query, keep_blank_values=True)
        sorted_params = sorted(query_params.items())
        query = urlencode(sorted_params, doseq=True)
        
        # Rebuild URL
        normalized = urlunparse((scheme, netloc, path, parsed.params, query, parsed.fragment))
        return normalized
    except:
        return url


def generate_tracking_id(user_id: str, deep_link_id: str) -> str:
    """
    Generate a tracking ID for a click.
    
    Args:
        user_id: User ID
        deep_link_id: Deep link ID
    
    Returns:
        Tracking ID
    """
    data = f"{user_id}_{deep_link_id}_{datetime.now().isoformat()}"
    return hashlib.md5(data.encode()).hexdigest()[:16]


def get_click_analytics_data(click_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process click data for analytics.
    
    Args:
        click_data: Raw click data
    
    Returns:
        Processed analytics data
    """
    # Extract device info from user agent
    user_agent = click_data.get('user_agent', '')
    device = detect_device(user_agent)
    
    # Extract location from IP (would use a geolocation service)
    ip_address = click_data.get('ip_address', '')
    
    return {
        'device': device,
        'timestamp': click_data.get('clicked_at'),
        'referer': click_data.get('referer', ''),
        'user_id': click_data.get('user_id'),
        'consent_given': click_data.get('consent_given', False)
    }


def detect_device(user_agent: str) -> Dict[str, str]:
    """
    Detect device type from user agent.
    
    Args:
        user_agent: User agent string
    
    Returns:
        Device information
    """
    device = {
        'type': 'unknown',
        'os': 'unknown',
        'browser': 'unknown'
    }
    
    if not user_agent:
        return device
    
    user_agent = user_agent.lower()
    
    # Detect device type
    if 'mobile' in user_agent or 'android' in user_agent or 'iphone' in user_agent:
        device['type'] = 'mobile'
    elif 'tablet' in user_agent or 'ipad' in user_agent:
        device['type'] = 'tablet'
    else:
        device['type'] = 'desktop'
    
    # Detect OS
    if 'windows' in user_agent:
        device['os'] = 'windows'
    elif 'mac' in user_agent:
        device['os'] = 'macos'
    elif 'linux' in user_agent:
        device['os'] = 'linux'
    elif 'android' in user_agent:
        device['os'] = 'android'
    elif 'ios' in user_agent or 'iphone' in user_agent or 'ipad' in user_agent:
        device['os'] = 'ios'
    
    # Detect browser
    if 'chrome' in user_agent:
        device['browser'] = 'chrome'
    elif 'firefox' in user_agent:
        device['browser'] = 'firefox'
    elif 'safari' in user_agent:
        device['browser'] = 'safari'
    elif 'edge' in user_agent:
        device['browser'] = 'edge'
    elif 'opera' in user_agent:
        device['browser'] = 'opera'
    
    return device


def is_valid_url(url: str) -> bool:
    """
    Check if a URL is valid.
    
    Args:
        url: URL to validate
    
    Returns:
        True if valid
    """
    pattern = r'^https?://[^\s/$.?#].[^\s]*$'
    return bool(re.match(pattern, url))


def extract_job_id_from_url(url: str) -> Optional[str]:
    """
    Extract job ID from URL.
    
    Args:
        url: Job posting URL
    
    Returns:
        Job ID or None
    """
    # Common job ID patterns
    patterns = [
        r'/jobs/([a-zA-Z0-9_-]+)',
        r'/job/([a-zA-Z0-9_-]+)',
        r'jobId=([a-zA-Z0-9_-]+)',
        r'id=([a-zA-Z0-9_-]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None


def generate_short_code(title: str, company: str) -> str:
    """
    Generate a short code from title and company.
    
    Args:
        title: Job title
        company: Company name
    
    Returns:
        Short code
    """
    # Take first letters of title words and company
    title_parts = title.split()[:3]
    company_parts = company.split()[:2]
    
    code_parts = []
    for part in title_parts + company_parts:
        if part and len(part) > 0:
            code_parts.append(part[0].upper())
    
    code = ''.join(code_parts)
    
    # If code is too short, add some random characters
    if len(code) < 4:
        import random
        import string
        code += ''.join(random.choices(string.ascii_uppercase + string.digits, k=4-len(code)))
    
    return code[:8]


def get_utm_params(source: str = '', medium: str = 'email', campaign: str = 'job_match') -> Dict[str, str]:
    """
    Get UTM parameters for tracking.
    
    Args:
        source: UTM source
        medium: UTM medium
        campaign: UTM campaign
    
    Returns:
        UTM parameters dictionary
    """
    return {
        'utm_source': source or 'deep_link',
        'utm_medium': medium,
        'utm_campaign': campaign,
        'utm_content': 'apply_directly'
    }