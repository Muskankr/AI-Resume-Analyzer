"""
Score Explainability API for AI Resume Analyzer
Provides endpoints for detailed score breakdowns and explanations.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, Dict, Any, List
from datetime import datetime

from backend.models.score_breakdown import (
    ScoreBreakdown, ScoreExplainabilityRequest, ScoreExplainabilityResponse,
    ScoreFactor, FactorCategory
)
from backend.services.score_explainer import ScoreExplainer
from backend.services.score_explainer_utils import ScoreExplainerUtils
from backend.services.scoring_factors import ScoringFactors

router = APIRouter(prefix="/api/score-explainability", tags=["score-explainability"])


@router.get("/factors")
async def get_scoring_factors() -> Dict[str, Any]:
    """
    Get all scoring factors with weights and descriptions.
    """
    try:
        summary = ScoringFactors.get_weight_summary()
        descriptions = ScoringFactors.get_factor_descriptions()
        
        return {
            'success': True,
            'data': {
                'factors': summary['factors'],
                'total_factors': summary['total_factors'],
                'total_weight': summary['total_weight'],
                'by_category': summary['by_category'],
                'descriptions': descriptions
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/explain/{resume_id}")
async def explain_score(
    resume_id: str,
    request: Optional[ScoreExplainabilityRequest] = None
) -> ScoreExplainabilityResponse:
    """
    Get a detailed score breakdown for a resume.
    """
    try:
        mock_resume_content = {
            'filename': 'Software_Engineer_Resume.docx',
            'text': 'Experienced software engineer with 5+ years of experience...',
            'sections': {
                'experience': 'Led development of microservices...',
                'education': 'BS Computer Science...',
                'skills': 'Python, Java, AWS, React...'
            }
        }
        
        if request is None:
            request = ScoreExplainabilityRequest(resume_id=resume_id)
        
        explainer = ScoreExplainer()
        breakdown = explainer.explain_score(
            resume_id=resume_id,
            resume_content=mock_resume_content,
            request=request
        )
        
        return ScoreExplainabilityResponse(
            success=True,
            message="Score breakdown generated successfully",
            breakdown=breakdown
        )
    except Exception as e:
        return ScoreExplainabilityResponse(
            success=False,
            message="Failed to generate score breakdown",
            error=str(e)
        )


@router.get("/breakdown/{resume_id}")
async def get_score_breakdown(
    resume_id: str,
    include_suggestions: bool = Query(True),
    language: str = Query("plain_english")
) -> Dict[str, Any]:
    """
    Get a formatted score breakdown for display.
    """
    try:
        explainer = ScoreExplainer()
        
        request = ScoreExplainabilityRequest(
            resume_id=resume_id,
            include_suggestions=include_suggestions,
            language=language
        )
        
        mock_resume_content = {
            'filename': 'Software_Engineer_Resume.docx',
            'text': 'Experienced software engineer with 5+ years of experience...',
            'sections': {
                'experience': 'Led development of microservices...',
                'education': 'BS Computer Science...',
                'skills': 'Python, Java, AWS, React...'
            }
        }
        
        breakdown = explainer.explain_score(
            resume_id=resume_id,
            resume_content=mock_resume_content,
            request=request
        )
        
        report = ScoreExplainerUtils.get_summary_report(
            breakdown.overall_score,
            breakdown.factors
        )
        
        return {
            'success': True,
            'data': {
                'score': breakdown.overall_score,
                'rating': breakdown.overall_score,
                'factors': [
                    {
                        'name': f.name,
                        'score': f.score,
                        'weight': f.weight,
                        'contribution': f.contribution,
                        'feedback': f.feedback,
                        'suggestions': f.suggestions if include_suggestions else [],
                        'category': f.category.value
                    }
                    for f in breakdown.factors
                ],
                'category_scores': breakdown.category_scores,
                'summary': report,
                'generated_at': breakdown.generated_at.isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/factor-details/{factor_name}")
async def get_factor_details(factor_name: str) -> Dict[str, Any]:
    """
    Get detailed information about a specific scoring factor.
    """
    try:
        factor = ScoringFactors.get_factor_by_name(factor_name)
        if not factor:
            raise HTTPException(status_code=404, detail=f"Factor '{factor_name}' not found")
        
        descriptions = ScoringFactors.get_factor_descriptions()
        criteria = ScoringFactors.get_scoring_criteria(factor_name)
        
        return {
            'success': True,
            'data': {
                'name': factor.name,
                'weight': factor.weight,
                'category': factor.category.value,
                'max_score': factor.max_score,
                'description': descriptions.get(factor_name, ''),
                'criteria': criteria,
                'suggestions': ScoreExplainerUtils.get_factor_suggestions(factor_name, 50)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/comparison/{resume_id}")
async def get_score_comparison(
    resume_id: str,
    industry: Optional[str] = None
) -> Dict[str, Any]:
    """
    Compare a resume score with industry averages.
    """
    try:
        mock_breakdown = {
            'overall_score': 78,
            'factors': [
                {'name': 'Keyword Match', 'score': 82},
                {'name': 'Formatting Quality', 'score': 90},
                {'name': 'Section Completeness', 'score': 75},
                {'name': 'Experience Quality', 'score': 70},
                {'name': 'Education', 'score': 85},
                {'name': 'Skills Relevance', 'score': 65},
                {'name': 'Achievements', 'score': 55},
                {'name': 'Resume Length', 'score': 95},
                {'name': 'Language Quality', 'score': 88},
                {'name': 'ATS Compatibility', 'score': 80}
            ]
        }
        
        industry_averages = {
            'software_engineering': 72,
            'data_science': 70,
            'product_management': 68,
            'marketing': 65,
            'finance': 67,
            'consulting': 75,
            'healthcare': 66,
            'education': 62
        }
        
        avg_score = industry_averages.get(industry or 'software_engineering', 70)
        difference = mock_breakdown['overall_score'] - avg_score
        
        return {
            'success': True,
            'data': {
                'your_score': mock_breakdown['overall_score'],
                'industry_average': avg_score,
                'difference': difference,
                'percentile': 'top 25%' if difference > 10 else 'top 50%' if difference > 0 else 'bottom 50%',
                'comparison_text': f"Your score is {'above' if difference > 0 else 'below'} the industry average by {abs(difference):.0f} points.",
                'factors': mock_breakdown['factors']
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{resume_id}")
async def get_score_history(resume_id: str) -> Dict[str, Any]:
    """
    Get score history for a resume over time.
    """
    try:
        history = [
            {'date': '2024-01-15', 'score': 65},
            {'date': '2024-01-22', 'score': 68},
            {'date': '2024-01-29', 'score': 72},
            {'date': '2024-02-05', 'score': 78},
            {'date': '2024-02-12', 'score': 82}
        ]
        
        return {
            'success': True,
            'data': {
                'resume_id': resume_id,
                'history': history,
                'trend': 'improving',
                'improvement_rate': f"{((history[-1]['score'] - history[0]['score']) / history[0]['score'] * 100):.1f}%",
                'best_score': max(h['score'] for h in history),
                'average_score': sum(h['score'] for h in history) / len(history)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions/{resume_id}")
async def get_improvement_suggestions(
    resume_id: str,
    limit: int = Query(5, ge=1, le=10)
) -> Dict[str, Any]:
    """
    Get personalized improvement suggestions for a resume.
    """
    try:
        mock_resume_content = {
            'filename': 'Software_Engineer_Resume.docx',
            'text': 'Experienced software engineer with 5+ years of experience...',
            'sections': {
                'experience': 'Led development of microservices...',
                'education': 'BS Computer Science...',
                'skills': 'Python, Java, AWS, React...'
            }
        }
        
        explainer = ScoreExplainer()
        breakdown = explainer.explain_score(
            resume_id=resume_id,
            resume_content=mock_resume_content
        )
        
        suggestions = []
        for factor in breakdown.factors:
            if factor.score < 70:
                suggestions.append({
                    'factor': factor.name,
                    'current_score': factor.score,
                    'suggestions': factor.suggestions[:2],
                    'priority': 'high' if factor.weight > 0.1 else 'medium'
                })
        
        suggestions = sorted(suggestions, key=lambda x: 0 if x['priority'] == 'high' else 1)[:limit]
        
        return {
            'success': True,
            'data': {
                'resume_id': resume_id,
                'suggestions': suggestions,
                'total_suggestions': len(suggestions),
                'generated_at': datetime.now().isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))