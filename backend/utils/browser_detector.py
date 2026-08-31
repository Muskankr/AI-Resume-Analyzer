"""
Browser Detector for AI Resume Analyzer
Detects browser information from user agent strings.
"""

import re
from typing import Dict, Any, Optional, Tuple
from datetime import datetime


class BrowserDetector:
    """
    Detects browser information from user agent strings.
    """

    # Browser patterns
    BROWSER_PATTERNS = {
        'Chrome': r'Chrome/(\d+)\.',
        'Firefox': r'Firefox/(\d+)\.',
        'Safari': r'Safari/(\d+)\.',
        'Edge': r'Edg/(\d+)\.',
        'Opera': r'OPR/(\d+)\.',
        'Brave': r'Brave/(\d+)\.',
        'Vivaldi': r'Vivaldi/(\d+)\.',
        'Samsung Internet': r'SamsungBrowser/(\d+)\.',
        'UC Browser': r'UCBrowser/(\d+)\.',
        'Baidu': r'Baidu/(\d+)\.',
        'QQ Browser': r'QQBrowser/(\d+)\.',
        'Silk': r'Silk/(\d+)\.',
        'Yandex': r'YaBrowser/(\d+)\.',
        'Maxthon': r'Maxthon/(\d+)\.',
        'Puffin': r'Puffin/(\d+)\.',
    }

    # OS patterns
    OS_PATTERNS = {
        'Windows': r'Windows NT (\d+\.\d+)',
        'macOS': r'Mac OS X (\d+[_\d]+)',
        'Linux': r'Linux',
        'Android': r'Android (\d+\.\d+)',
        'iOS': r'iPhone OS (\d+[_\d]+)',
        'iPadOS': r'iPad; CPU OS (\d+[_\d]+)',
        'Chrome OS': r'CrOS',
    }

    @classmethod
    def detect_browser(cls, user_agent: str) -> Dict[str, Any]:
        """
        Detect browser from user agent string.
        
        Args:
            user_agent: User agent string
        
        Returns:
            Dictionary with browser information
        """
        if not user_agent:
            return {'name': 'Unknown', 'version': '0', 'raw': ''}

        result = {
            'name': 'Unknown',
            'version': '0',
            'raw': user_agent,
            'os': 'Unknown',
            'os_version': '0',
            'is_mobile': False,
            'is_tablet': False,
            'is_bot': False,
            'engine': 'Unknown'
        }

        # Check if it's a bot
        if cls._is_bot(user_agent):
            result['is_bot'] = True
            result['name'] = 'Bot'
            return result

        # Detect browser
        for browser, pattern in cls.BROWSER_PATTERNS.items():
            match = re.search(pattern, user_agent)
            if match:
                result['name'] = browser
                result['version'] = match.group(1)
                break

        # Detect browser engine
        if 'AppleWebKit' in user_agent:
            result['engine'] = 'WebKit'
        elif 'Gecko' in user_agent:
            result['engine'] = 'Gecko'
        elif 'Trident' in user_agent:
            result['engine'] = 'Trident'
        elif 'Blink' in user_agent:
            result['engine'] = 'Blink'

        # Detect OS
        for os_name, pattern in cls.OS_PATTERNS.items():
            match = re.search(pattern, user_agent)
            if match:
                result['os'] = os_name
                if len(match.groups()) > 0:
                    result['os_version'] = match.group(1).replace('_', '.')
                break

        # Detect mobile
        if 'Mobile' in user_agent or 'Android' in user_agent and 'Mobile' in user_agent:
            result['is_mobile'] = True
        if 'Tablet' in user_agent or 'iPad' in user_agent:
            result['is_tablet'] = True

        return result

    @classmethod
    def _is_bot(cls, user_agent: str) -> bool:
        """Check if user agent is a bot."""
        bot_patterns = [
            r'bot',
            r'crawler',
            r'spider',
            r'scanner',
            r'headless',
            r'Googlebot',
            r'Bingbot',
            r'Slurp',
            r'DuckDuckBot',
            r'Baiduspider',
            r'YandexBot',
            r'Sogou',
            r'Exabot',
            r'Facebot',
            r'Twitterbot',
            r'Applebot',
            r'WhatsApp',
            r'TelegramBot',
            r'Slackbot',
        ]
        user_agent_lower = user_agent.lower()
        return any(re.search(pattern, user_agent_lower) for pattern in bot_patterns)

    @classmethod
    def get_browser_category(cls, browser: str) -> str:
        """Get browser category."""
        mobile_browsers = ['Chrome Mobile', 'Safari Mobile', 'Samsung Internet', 'UC Browser', 'Opera Mobile']
        if browser in mobile_browsers:
            return 'mobile'
        return 'desktop'

    @classmethod
    def get_supported_status(cls, browser: str, version: str) -> Dict[str, Any]:
        """Get supported status for a browser."""
        # Define minimum versions
        min_versions = {
            'Chrome': '90',
            'Firefox': '88',
            'Safari': '14',
            'Edge': '90',
            'Opera': '76',
            'Brave': '1.20',
            'Vivaldi': '4.0',
            'Samsung Internet': '15',
            'UC Browser': '12',
        }

        min_version = min_versions.get(browser, '0')
        
        try:
            version_num = float(version) if version else 0
            min_num = float(min_version) if min_version else 0
            
            if version_num >= min_num:
                return {
                    'status': 'fully_supported',
                    'min_version': min_version,
                    'recommended': True
                }
            else:
                return {
                    'status': 'partially_supported',
                    'min_version': min_version,
                    'recommended': False
                }
        except:
            return {
                'status': 'unknown',
                'min_version': min_version,
                'recommended': False
            }

    @classmethod
    def get_compatibility_summary(cls, user_agents: List[str]) -> Dict[str, Any]:
        """Get compatibility summary for multiple user agents."""
        browsers = {}
        
        for ua in user_agents:
            browser_info = cls.detect_browser(ua)
            key = f"{browser_info['name']}_{browser_info['version']}"
            
            if key not in browsers:
                browsers[key] = {
                    'name': browser_info['name'],
                    'version': browser_info['version'],
                    'os': browser_info['os'],
                    'count': 0,
                    'is_mobile': browser_info['is_mobile']
                }
            browsers[key]['count'] += 1

        return {
            'total_requests': len(user_agents),
            'unique_browsers': len(browsers),
            'browsers': list(browsers.values()),
            'generated_at': datetime.now().isoformat()
        }