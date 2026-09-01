"""
Browser Compatibility API for AI Resume Analyzer
Provides endpoints for browser compatibility information.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import Optional, List, Dict, Any
from datetime import datetime

from backend.services.browser_compatibility import BrowserCompatibilityService
from backend.utils.browser_detector import BrowserDetector
from backend.models.browser_compatibility import BrowserStatus

router = APIRouter(prefix="/api/browser-compatibility", tags=["browser-compatibility"])

# Initialize service
_service = BrowserCompatibilityService()


@router.get("/browsers")
async def get_all_browsers() -> Dict[str, Any]:
    """
    Get all browsers with compatibility status.
    """
    try:
        browsers = _service.get_all_browsers()
        return {
            'success': True,
            'data': {
                'browsers': [b.to_dict() for b in browsers],
                'total': len(browsers),
                'supported': len([b for b in browsers if b.status in [BrowserStatus.FULLY_SUPPORTED, BrowserStatus.PARTIALLY_SUPPORTED]])
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/browsers/supported")
async def get_supported_browsers() -> Dict[str, Any]:
    """
    Get only supported browsers.
    """
    try:
        browsers = _service.get_supported_browsers()
        return {
            'success': True,
            'data': {
                'browsers': [b.to_dict() for b in browsers],
                'total': len(browsers)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/browsers/{browser_id}")
async def get_browser_by_id(browser_id: str) -> Dict[str, Any]:
    """
    Get browser by ID.
    """
    try:
        browser = _service.get_browser_by_id(browser_id)
        if not browser:
            raise HTTPException(status_code=404, detail="Browser not found")
        return {
            'success': True,
            'data': browser.to_dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test-results")
async def get_test_results(latest: bool = Query(True)) -> Dict[str, Any]:
    """
    Get test results for all browsers.
    """
    try:
        if latest:
            results = _service.get_latest_test_results()
        else:
            results = _service.get_test_results()
        
        return {
            'success': True,
            'data': {
                'results': [
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
                    for r in results
                ],
                'total': len(results)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def get_compatibility_summary() -> Dict[str, Any]:
    """
    Get compatibility summary.
    """
    try:
        summary = _service.get_compatibility_summary()
        return {
            'success': True,
            'data': summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/comparison")
async def get_browser_comparison() -> Dict[str, Any]:
    """
    Get browser comparison data.
    """
    try:
        comparison = _service.get_browser_comparison()
        return {
            'success': True,
            'data': comparison
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/feature/{feature_name}")
async def get_feature_support(feature_name: str) -> Dict[str, Any]:
    """
    Get feature support across browsers.
    """
    try:
        support = _service.get_feature_support(feature_name)
        return {
            'success': True,
            'data': {
                'feature': feature_name,
                'support': support
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/detect")
async def detect_browser_compatibility(request: Request) -> Dict[str, Any]:
    """
    Detect browser compatibility from user agent.
    """
    try:
        user_agent = request.headers.get('user-agent', '')
        if not user_agent:
            return {
                'success': False,
                'error': 'User-Agent header is required'
            }
        
        result = _service.detect_browser_compatibility(user_agent)
        return {
            'success': True,
            'data': result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/detect-bulk")
async def detect_bulk_compatibility(user_agents: List[str]) -> Dict[str, Any]:
    """
    Detect compatibility for multiple user agents.
    """
    try:
        results = []
        for ua in user_agents:
            result = _service.detect_browser_compatibility(ua)
            results.append(result)
        
        return {
            'success': True,
            'data': {
                'results': results,
                'total': len(results),
                'compatible': sum(1 for r in results if r.get('compatible', False))
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics")
async def get_compatibility_statistics() -> Dict[str, Any]:
    """
    Get compatibility statistics.
    """
    try:
        browsers = _service.get_all_browsers()
        test_results = _service.get_latest_test_results()
        
        total = len(browsers)
        fully_supported = len([b for b in browsers if b.status == BrowserStatus.FULLY_SUPPORTED])
        partially_supported = len([b for b in browsers if b.status == BrowserStatus.PARTIALLY_SUPPORTED])
        
        avg_coverage = sum(b.test_coverage for b in browsers) / total if total > 0 else 0
        avg_pass_rate = sum(r.get_pass_rate() for r in test_results) / len(test_results) if test_results else 0
        
        return {
            'success': True,
            'data': {
                'total_browsers': total,
                'fully_supported': fully_supported,
                'partially_supported': partially_supported,
                'compatibility_rate': (fully_supported / total * 100) if total > 0 else 0,
                'average_test_coverage': round(avg_coverage, 1),
                'average_pass_rate': round(avg_pass_rate, 1),
                'last_updated': datetime.now().isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/report")
async def get_compatibility_report() -> Dict[str, Any]:
    """
    Get full compatibility report.
    """
    try:
        browsers = _service.get_all_browsers()
        test_results = _service.get_latest_test_results()
        summary = _service.get_compatibility_summary()
        
        report = {
            'generated_at': datetime.now().isoformat(),
            'version': '1.0',
            'browsers': [b.to_dict() for b in browsers],
            'test_results': [
                {
                    'browser': r.browser_name,
                    'version': r.version,
                    'pass_rate': r.get_pass_rate(),
                    'tests_passed': r.tests_passed,
                    'tests_failed': r.tests_failed,
                    'tests_skipped': r.tests_skipped,
                    'total_tests': r.total_tests
                }
                for r in test_results
            ],
            'summary': summary
        }
        
        return {
            'success': True,
            'data': report
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))