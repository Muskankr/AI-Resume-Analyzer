"""
Scoring Factors for AI Resume Analyzer
Defines all scoring factors with weights, descriptions, and evaluation logic.
"""

from typing import List, Dict, Any, Optional
from backend.models.score_breakdown import WeightedFactor, FactorCategory


class ScoringFactors:
    """
    Defines all scoring factors for ATS resume scoring.
    """

    @staticmethod
    def get_all_factors() -> List[WeightedFactor]:
        """Get all scoring factors with their weights."""
        return [
            WeightedFactor(
                name="Keyword Match",
                weight=0.20,
                description="Matches between resume keywords and job description requirements",
                max_score=100,
                category=FactorCategory.KEYWORD_MATCH
            ),
            WeightedFactor(
                name="Formatting Quality",
                weight=0.10,
                description="Professional formatting, consistent styling, and readability",
                max_score=100,
                category=FactorCategory.FORMATTING
            ),
            WeightedFactor(
                name="Section Completeness",
                weight=0.10,
                description="Presence and completeness of all key resume sections",
                max_score=100,
                category=FactorCategory.SECTION_COMPLETENESS
            ),
            WeightedFactor(
                name="Experience Quality",
                weight=0.15,
                description="Quality of work experience descriptions and relevance",
                max_score=100,
                category=FactorCategory.EXPERIENCE_QUALITY
            ),
            WeightedFactor(
                name="Education",
                weight=0.08,
                description="Education level, relevance, and completeness",
                max_score=100,
                category=FactorCategory.EDUCATION
            ),
            WeightedFactor(
                name="Skills Relevance",
                weight=0.12,
                description="Relevance and depth of listed skills",
                max_score=100,
                category=FactorCategory.SKILLS
            ),
            WeightedFactor(
                name="Achievements",
                weight=0.08,
                description="Quantifiable achievements and results",
                max_score=100,
                category=FactorCategory.ACHIEVEMENTS
            ),
            WeightedFactor(
                name="Resume Length",
                weight=0.03,
                description="Optimal length (1-2 pages recommended)",
                max_score=100,
                category=FactorCategory.LENGTH
            ),
            WeightedFactor(
                name="Language Quality",
                weight=0.04,
                description="Grammar, spelling, and professional language",
                max_score=100,
                category=FactorCategory.LANGUAGE
            ),
            WeightedFactor(
                name="ATS Compatibility",
                weight=0.10,
                description="Parsing compatibility with ATS systems",
                max_score=100,
                category=FactorCategory.ATS_COMPATIBILITY
            )
        ]

    @staticmethod
    def get_factor_by_name(name: str) -> Optional[WeightedFactor]:
        """Get a factor by name."""
        for factor in ScoringFactors.get_all_factors():
            if factor.name == name:
                return factor
        return None

    @staticmethod
    def get_factors_by_category(category: FactorCategory) -> List[WeightedFactor]:
        """Get factors by category."""
        return [f for f in ScoringFactors.get_all_factors() if f.category == category]

    @staticmethod
    def get_weight_summary() -> Dict[str, Any]:
        """Get weight distribution summary."""
        factors = ScoringFactors.get_all_factors()
        total_weight = sum(f.weight for f in factors)
        
        by_category = {}
        for factor in factors:
            category = factor.category.value
            if category not in by_category:
                by_category[category] = {'weight': 0, 'count': 0, 'factors': []}
            by_category[category]['weight'] += factor.weight
            by_category[category]['count'] += 1
            by_category[category]['factors'].append(factor.name)
        
        return {
            'total_factors': len(factors),
            'total_weight': total_weight,
            'by_category': by_category,
            'factors': [{'name': f.name, 'weight': f.weight, 'category': f.category.value} for f in factors]
        }

    @staticmethod
    def get_factor_descriptions() -> Dict[str, str]:
        """Get descriptions for all factors."""
        return {
            "Keyword Match": "Matches between resume keywords and job description requirements. Higher scores indicate better alignment with role-specific keywords.",
            "Formatting Quality": "Professional formatting, consistent styling, and readability. Includes font choice, section headers, and overall layout.",
            "Section Completeness": "Presence and completeness of all key resume sections including experience, education, skills, and achievements.",
            "Experience Quality": "Quality of work experience descriptions including relevance, detail, and impact of responsibilities.",
            "Education": "Education level, relevance, and completeness. Includes degrees, institutions, and relevant coursework.",
            "Skills Relevance": "Relevance and depth of listed skills. Includes both hard skills (technical) and soft skills.",
            "Achievements": "Quantifiable achievements and results. Includes metrics, percentages, and specific outcomes.",
            "Resume Length": "Optimal length (1-2 pages recommended for most roles).",
            "Language Quality": "Grammar, spelling, and professional language. Includes tone and clarity.",
            "ATS Compatibility": "Parsing compatibility with ATS systems. Includes file format, section headers, and parsable content."
        }

    @staticmethod
    def get_scoring_criteria(factor_name: str) -> Dict[str, Any]:
        """Get scoring criteria for a specific factor."""
        criteria = {
            "Keyword Match": {
                'excellent': '90-100%: Strong keyword alignment',
                'good': '70-89%: Good keyword coverage',
                'fair': '50-69%: Moderate keyword match',
                'poor': '0-49%: Weak keyword alignment'
            },
            "Formatting Quality": {
                'excellent': '90-100%: Professional, consistent formatting',
                'good': '70-89%: Good formatting with minor issues',
                'fair': '50-69%: Some formatting issues',
                'poor': '0-49%: Significant formatting problems'
            },
            "Section Completeness": {
                'excellent': '90-100%: All sections complete',
                'good': '70-89%: Most sections present',
                'fair': '50-69%: Some sections missing',
                'poor': '0-49%: Multiple sections missing'
            },
            "Experience Quality": {
                'excellent': '90-100%: Strong, detailed experience',
                'good': '70-89%: Good experience with some detail',
                'fair': '50-69%: Basic experience description',
                'poor': '0-49%: Weak or missing experience'
            },
            "Education": {
                'excellent': '90-100%: Relevant education with details',
                'good': '70-89%: Good education information',
                'fair': '50-69%: Basic education details',
                'poor': '0-49%: Missing or incomplete education'
            },
            "Skills Relevance": {
                'excellent': '90-100%: Highly relevant skills',
                'good': '70-89%: Relevant skills with some depth',
                'fair': '50-69%: Basic skills listed',
                'poor': '0-49%: Few or irrelevant skills'
            },
            "Achievements": {
                'excellent': '90-100%: Strong, quantifiable achievements',
                'good': '70-89%: Good achievements with some metrics',
                'fair': '50-69%: Basic achievement descriptions',
                'poor': '0-49%: Few or no achievements'
            },
            "Resume Length": {
                'excellent': '90-100%: Optimal length (1-2 pages)',
                'good': '70-89%: Acceptable length',
                'fair': '50-69%: Slightly too long/short',
                'poor': '0-49%: Significantly wrong length'
            },
            "Language Quality": {
                'excellent': '90-100%: Excellent grammar and vocabulary',
                'good': '70-89%: Good language with minor issues',
                'fair': '50-69%: Some grammar/language issues',
                'poor': '0-49%: Significant language problems'
            },
            "ATS Compatibility": {
                'excellent': '90-100%: Fully ATS compatible',
                'good': '70-89%: Mostly ATS compatible',
                'fair': '50-69%: Some ATS issues',
                'poor': '0-49%: Significant ATS problems'
            }
        }
        return criteria.get(factor_name, {})