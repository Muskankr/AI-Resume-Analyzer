"""
Browser Compatibility Models for AI Resume Analyzer
Defines data structures for browser compatibility tracking.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum
from datetime import datetime
import uuid


class BrowserStatus(Enum):
    """Browser compatibility status."""
    FULLY_SUPPORTED = "fully_supported"
    PARTIALLY_SUPPORTED = "partially_supported"
    NOT_SUPPORTED = "not_supported"
    DEPRECATED = "deprecated"


class BrowserCategory(Enum):
    """Browser category."""
    DESKTOP = "desktop"
    MOBILE = "mobile"
    TABLET = "tablet"


@dataclass
class Browser:
    """Browser data class."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    version: str = ""
    category: BrowserCategory = BrowserCategory.DESKTOP
    status: BrowserStatus = BrowserStatus.FULLY_SUPPORTED
    min_version: str = ""
    recommended_version: str = ""
    test_coverage: float = 0.0
    notes: str = ""
    features: Dict[str, bool] = field(default_factory=dict)
    known_issues: List[str] = field(default_factory=list)
    last_tested: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'version': self.version,
            'category': self.category.value,
            'status': self.status.value,
            'min_version': self.min_version,
            'recommended_version': self.recommended_version,
            'test_coverage': self.test_coverage,
            'notes': self.notes,
            'features': self.features,
            'known_issues': self.known_issues,
            'last_tested': self.last_tested.isoformat() if self.last_tested else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


@dataclass
class TestResult:
    """Test result for browser compatibility."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    browser_id: str = ""
    browser_name: str = ""
    version: str = ""
    tests_passed: int = 0
    tests_failed: int = 0
    tests_skipped: int = 0
    total_tests: int = 0
    pass_rate: float = 0.0
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def get_pass_rate(self) -> float:
        return (self.tests_passed / self.total_tests * 100) if self.total_tests > 0 else 0


@dataclass
class BrowserFeature:
    """Browser feature support."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    description: str = ""
    supported_browsers: List[str] = field(default_factory=list)
    unsupported_browsers: List[str] = field(default_factory=list)
    requires_polyfill: bool = False
    polyfill_url: str = ""
    notes: str = ""


@dataclass
class CompatibilityReport:
    """Compatibility report data."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    generated_at: datetime = field(default_factory=datetime.now)
    browsers: List[Browser] = field(default_factory=list)
    test_results: List[TestResult] = field(default_factory=list)
    features: List[BrowserFeature] = field(default_factory=list)
    summary: Dict[str, Any] = field(default_factory=dict)
    version: str = "1.0"