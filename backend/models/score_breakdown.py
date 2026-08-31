"""
Score Breakdown Models for AI Resume Analyzer
Provides explainable breakdown of ATS scores with weighted factors.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum
from datetime import datetime
import uuid


class FactorCategory(Enum):
    """Categories of scoring factors."""
    KEYWORD_MATCH = "keyword_match"
    FORMATTING = "formatting"
    SECTION_COMPLETENESS = "section_completeness"
    EXPERIENCE_QUALITY = "experience_quality"
    EDUCATION = "education"
    SKILLS = "skills"
    ACHIEVEMENTS = "achievements"
    LENGTH = "length"
    LANGUAGE = "language"
    ATS_COMPATIBILITY = "ats_compatibility"
    ACTION_VERBS = "action_verbs"
    QUANTIFICATION = "quantification"


@dataclass
class ScoreFactor:
    """Individual scoring factor."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    category: FactorCategory = FactorCategory.KEYWORD_MATCH
    weight: float = 0.0
    score: float = 0.0
    max_score: float = 100.0
    contribution: float = 0.0
    confidence: float = 0.0
    feedback: str = ""
    suggestions: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def get_percentage(self) -> float:
        """Get score as percentage."""
        return (self.score / self.max_score) * 100 if self.max_score > 0 else 0

    def get_contribution_percentage(self) -> float:
        """Get contribution as percentage of total."""
        return self.contribution * 100


@dataclass
class ScoreBreakdown:
    """Complete score breakdown for a resume."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    resume_id: str = ""
    resume_name: str = ""
    overall_score: float = 0.0
    factors: List[ScoreFactor] = field(default_factory=list)
    category_scores: Dict[str, float] = field(default_factory=dict)
    plain_language_summary: str = ""
    improvement_priorities: List[Dict[str, Any]] = field(default_factory=list)
    generated_at: datetime = field(default_factory=datetime.now)
    analysis_version: str = "1.0"

    def get_factor_by_category(self, category: FactorCategory) -> List[ScoreFactor]:
        """Get factors by category."""
        return [f for f in self.factors if f.category == category]

    def get_categories_with_scores(self) -> Dict[str, Dict[str, Any]]:
        """Get scores grouped by category."""
        result = {}
        for category in FactorCategory:
            factors = self.get_factor_by_category(category)
            if factors:
                avg_score = sum(f.score for f in factors) / len(factors) if factors else 0
                avg_contribution = sum(f.contribution for f in factors) if factors else 0
                result[category.value] = {
                    'name': category.value.replace('_', ' ').title(),
                    'score': avg_score,
                    'max_score': max(f.max_score for f in factors) if factors else 100,
                    'contribution': avg_contribution,
                    'factor_count': len(factors),
                    'top_factor': max(factors, key=lambda x: x.contribution) if factors else None
                }
        return result

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'id': self.id,
            'resume_id': self.resume_id,
            'resume_name': self.resume_name,
            'overall_score': self.overall_score,
            'factors': [
                {
                    'id': f.id,
                    'name': f.name,
                    'category': f.category.value,
                    'weight': f.weight,
                    'score': f.score,
                    'max_score': f.max_score,
                    'contribution': f.contribution,
                    'confidence': f.confidence,
                    'feedback': f.feedback,
                    'suggestions': f.suggestions
                }
                for f in self.factors
            ],
            'category_scores': self.category_scores,
            'plain_language_summary': self.plain_language_summary,
            'improvement_priorities': self.improvement_priorities,
            'generated_at': self.generated_at.isoformat(),
            'analysis_version': self.analysis_version
        }


@dataclass
class ScoreExplainabilityRequest:
    """Request for score explainability."""
    resume_id: str = ""
    include_suggestions: bool = True
    language: str = "plain_english"
    max_suggestions_per_factor: int = 3


@dataclass
class ScoreExplainabilityResponse:
    """Response for score explainability."""
    success: bool = False
    message: str = ""
    breakdown: Optional[ScoreBreakdown] = None
    error: Optional[str] = None


@dataclass
class WeightedFactor:
    """Weighted factor for scoring."""
    name: str
    weight: float
    description: str
    max_score: float = 100.0
    category: FactorCategory = FactorCategory.KEYWORD_MATCH


@dataclass
class FactorResult:
    """Result of a factor evaluation."""
    factor: WeightedFactor
    score: float
    feedback: str
    suggestions: List[str]
    confidence: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ScoringConfig:
    """Configuration for scoring system."""
    version: str = "1.0"
    factors: List[WeightedFactor] = field(default_factory=list)
    min_confidence: float = 0.5
    max_suggestions: int = 5
    plain_language: bool = True