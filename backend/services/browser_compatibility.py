"""
Browser Compatibility Service for AI Resume Analyzer
Manages browser compatibility data, testing, and reporting.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json

from backend.models.browser_compatibility import (
    Browser, BrowserStatus, BrowserCategory, TestResult,
    BrowserFeature, CompatibilityReport
)
from backend.utils.browser_detector import BrowserDetector

logger = logging.getLogger(__name__)


class BrowserCompatibilityService:
    """
    Service for managing browser compatibility.
    """

    def __init__(self):
        self._browsers: Dict[str, Browser] = {}
        self._test_results: List[TestResult] = []
        self._features: List[BrowserFeature] = []
        self._initialize_default_data()

    def _initialize_default_data(self):
        """Initialize default browser compatibility data."""
        # Default browsers
        default_browsers = [
            Browser(
                name="Google Chrome",
                version="122",
                category=BrowserCategory.DESKTOP,
                status=BrowserStatus.FULLY_SUPPORTED,
                min_version="90",
                recommended_version="122",
                test_coverage=100.0,
                notes="Best performance and compatibility",
                features={
                    'upload': True,
                    'pdf_preview': True,
                    'ats_scoring': True,
                    'real_time': True,
                    'drag_drop': True,
                    'keyboard_shortcuts': True,
                    'offline_mode': True,
                    'push_notifications': True
                },
                known_issues=[],
                last_tested=datetime.now()
            ),
            Browser(
                name="Mozilla Firefox",
                version="122",
                category=BrowserCategory.DESKTOP,
                status=BrowserStatus.FULLY_SUPPORTED,
                min_version="88",
                recommended_version="122",
                test_coverage=98.0,
                notes="Good performance with minor UI differences",
                features={
                    'upload': True,
                    'pdf_preview': True,
                    'ats_scoring': True,
                    'real_time': True,
                    'drag_drop': True,
                    'keyboard_shortcuts': True,
                    'offline_mode': True,
                    'push_notifications': False
                },
                known_issues=["Minor delay in drag-and-drop upload"],
                last_tested=datetime.now()
            ),
            Browser(
                name="Microsoft Edge",
                version="122",
                category=BrowserCategory.DESKTOP,
                status=BrowserStatus.FULLY_SUPPORTED,
                min_version="90",
                recommended_version="122",
                test_coverage=97.0,
                notes="Chromium-based, good compatibility",
                features={
                    'upload': True,
                    'pdf_preview': True,
                    'ats_scoring': True,
                    'real_time': True,
                    'drag_drop': True,
                    'keyboard_shortcuts': True,
                    'offline_mode': True,
                    'push_notifications': True
                },
                known_issues=["Font rendering differs slightly"],
                last_tested=datetime.now()
            ),
            Browser(
                name="Apple Safari",
                version="17",
                category=BrowserCategory.DESKTOP,
                status=BrowserStatus.PARTIALLY_SUPPORTED,
                min_version="14",
                recommended_version="17",
                test_coverage=85.0,
                notes="Some CSS limitations",
                features={
                    'upload': True,
                    'pdf_preview': False,
                    'ats_scoring': True,
                    'real_time': True,
                    'drag_drop': False,
                    'keyboard_shortcuts': True,
                    'offline_mode': False,
                    'push_notifications': False
                },
                known_issues=[
                    "PDF preview may not render correctly",
                    "Drag-and-drop upload not supported",
                    "Offline mode limited"
                ],
                last_tested=datetime.now()
            ),
            Browser(
                name="Opera",
                version="106",
                category=BrowserCategory.DESKTOP,
                status=BrowserStatus.PARTIALLY_SUPPORTED,
                min_version="76",
                recommended_version="106",
                test_coverage=80.0,
                notes="Minor UI issues",
                features={
                    'upload': True,
                    'pdf_preview': True,
                    'ats_scoring': True,
                    'real_time': True,
                    'drag_drop': True,
                    'keyboard_shortcuts': False,
                    'offline_mode': True,
                    'push_notifications': True
                },
                known_issues=["Keyboard shortcuts conflict with browser"],
                last_tested=datetime.now()
            ),
            Browser(
                name="Brave",
                version="1.20",
                category=BrowserCategory.DESKTOP,
                status=BrowserStatus.FULLY_SUPPORTED,
                min_version="1.20",
                recommended_version="1.20",
                test_coverage=95.0,
                notes="Chromium-based, good compatibility",
                features={
                    'upload': True,
                    'pdf_preview': True,
                    'ats_scoring': True,
                    'real_time': True,
                    'drag_drop': True,
                    'keyboard_shortcuts': True,
                    'offline_mode': True,
                    'push_notifications': True
                },
                known_issues=[],
                last_tested=datetime.now()
            )
        ]

        for browser in default_browsers:
            self._browsers[browser.id] = browser

        # Default test results
        default_test_results = [
            TestResult(
                browser_id=list(self._browsers.keys())[0],
                browser_name="Google Chrome",
                version="122",
                tests_passed=245,
                tests_failed=0,
                tests_skipped=5,
                total_tests=250,
                timestamp=datetime.now()
            ),
            TestResult(
                browser_id=list(self._browsers.keys())[1],
                browser_name="Mozilla Firefox",
                version="122",
                tests_passed=240,
                tests_failed=0,
                tests_skipped=10,
                total_tests=250,
                timestamp=datetime.now()
            ),
            TestResult(
                browser_id=list(self._browsers.keys())[2],
                browser_name="Microsoft Edge",
                version="122",
                tests_passed=238,
                tests_failed=0,
                tests_skipped=12,
                total_tests=250,
                timestamp=datetime.now()
            ),
            TestResult(
                browser_id=list(self._browsers.keys())[3],
                browser_name="Apple Safari",
                version="17",
                tests_passed=208,
                tests_failed=8,
                tests_skipped=34,
                total_tests=250,
                timestamp=datetime.now()
            ),
            TestResult(
                browser_id=list(self._browsers.keys())[4],
                browser_name="Opera",
                version="106",
                tests_passed=196,
                tests_failed=12,
                tests_skipped=42,
                total_tests=250,
                timestamp=datetime.now()
            )
        ]

        self._test_results.extend(default_test_results)

    def get_all_browsers(self) -> List[Browser]:
        """Get all browsers."""
        return list(self._browsers.values())

    def get_browser_by_id(self, browser_id: str) -> Optional[Browser]:
        """Get browser by ID."""
        return self._browsers.get(browser_id)

    def get_browser_by_name(self, name: str) -> Optional[Browser]:
        """Get browser by name."""
        for browser in self._browsers.values():
            if browser.name == name:
                return browser
        return None

    def get_supported_browsers(self) -> List[Browser]:
        """Get all supported browsers."""
        return [b for b in self._browsers.values() 
                if b.status in [BrowserStatus.FULLY_SUPPORTED, BrowserStatus.PARTIALLY_SUPPORTED]]

    def get_fully_supported_browsers(self) -> List[Browser]:
        """Get fully supported browsers."""
        return [b for b in self._browsers.values() if b.status == BrowserStatus.FULLY_SUPPORTED]

    def get_test_results(self) -> List[TestResult]:
        """Get all test results."""
        return self._test_results

    def get_latest_test_results(self) -> List[TestResult]:
        """Get latest test results for each browser."""
        latest = {}
        for result in self._test_results:
            key = result.browser_name
            if key not in latest or result.timestamp > latest[key].timestamp:
                latest[key] = result
        return list(latest.values())

    def get_compatibility_summary(self) -> Dict[str, Any]:
        """Get compatibility summary."""
        browsers = self.get_all_browsers()
        test_results = self.get_latest_test_results()

        total = len(browsers)
        fully_supported = len([b for b in browsers if b.status == BrowserStatus.FULLY_SUPPORTED])
        partially_supported = len([b for b in browsers if b.status == BrowserStatus.PARTIALLY_SUPPORTED])

        return {
            'total_browsers': total,
            'fully_supported': fully_supported,
            'partially_supported': partially_supported,
            'not_supported': total - fully_supported - partially_supported,
            'compatibility_rate': (fully_supported / total * 100) if total > 0 else 0,
            'test_results': [
                {
                    'browser': r.browser_name,
                    'version': r.version,
                    'pass_rate': r.get_pass_rate(),
                    'tests_passed': r.tests_passed,
                    'tests_failed': r.tests_failed,
                    'tests_skipped': r.tests_skipped,
                    'total_tests': r.total_tests,
                    'timestamp': r.timestamp.isoformat()
                }
                for r in test_results
            ]
        }

    def get_browser_comparison(self) -> Dict[str, Any]:
        """Get browser comparison data."""
        browsers = self.get_all_browsers()
        
        comparison = {}
        for browser in browsers:
            comparison[browser.name] = {
                'version': browser.version,
                'status': browser.status.value,
                'test_coverage': browser.test_coverage,
                'features': browser.features,
                'known_issues': browser.known_issues
            }
        
        return comparison

    def get_feature_support(self, feature_name: str) -> Dict[str, bool]:
        """Get feature support across browsers."""
        support = {}
        for browser in self._browsers.values():
            support[browser.name] = browser.features.get(feature_name, False)
        return support

    def detect_browser_compatibility(self, user_agent: str) -> Dict[str, Any]:
        """Detect browser compatibility from user agent."""
        browser_info = BrowserDetector.detect_browser(user_agent)
        
        if browser_info['is_bot']:
            return {
                'is_bot': True,
                'compatible': True,
                'message': 'Bot detected'
            }

        browser_name = browser_info['name']
        version = browser_info['version']

        # Find browser in our list
        browser = self.get_browser_by_name(browser_name)
        
        if not browser:
            return {
                'browser': browser_name,
                'version': version,
                'compatible': False,
                'status': 'not_supported',
                'message': f'Browser {browser_name} is not officially supported',
                'recommended_browsers': ['Google Chrome', 'Mozilla Firefox', 'Microsoft Edge']
            }

        # Check version
        try:
            current_version = float(version) if version else 0
            min_version = float(browser.min_version) if browser.min_version else 0
            
            if current_version >= min_version:
                status = browser.status.value
                compatible = browser.status in [BrowserStatus.FULLY_SUPPORTED, BrowserStatus.PARTIALLY_SUPPORTED]
            else:
                compatible = False
                status = 'version_outdated'
        except:
            compatible = False
            status = 'unknown'

        return {
            'browser': browser_name,
            'version': version,
            'compatible': compatible,
            'status': status,
            'min_version': browser.min_version,
            'recommended_version': browser.recommended_version,
            'test_coverage': browser.test_coverage,
            'known_issues': browser.known_issues,
            'message': self._get_compatibility_message(browser_name, compatible, status)
        }

    def _get_compatibility_message(self, browser: str, compatible: bool, status: str) -> str:
        """Get compatibility message."""
        if compatible:
            return f'✅ {browser} is compatible with the application'
        elif status == 'version_outdated':
            return f'⚠️ Your {browser} version is outdated. Please update to the latest version.'
        else:
            return f'❌ {browser} is not officially supported. Please use Chrome, Firefox, or Edge.'