"""
Score Explainer Utilities for AI Resume Analyzer
Simple plain language explanations for score breakdowns.
"""

from typing import Dict, Any, List, Optional
from backend.models.score_breakdown import ScoreFactor, FactorCategory


class ScoreExplainerUtils:
    """
    Simple utility for generating plain language explanations.
    """

    @staticmethod
    def get_score_feedback(score: float) -> Dict[str, str]:
        """Get feedback based on score."""
        if score >= 85:
            return {
                'rating': 'Excellent',
                'emoji': '🌟',
                'feedback': 'Your resume is outstanding! It\'s well-structured and optimized for ATS.'
            }
        elif score >= 70:
            return {
                'rating': 'Good',
                'emoji': '👍',
                'feedback': 'Your resume is strong! Small improvements can make it even better.'
            }
        elif score >= 50:
            return {
                'rating': 'Fair',
                'emoji': '📝',
                'feedback': 'Your resume is decent but needs work on keyword optimization.'
            }
        else:
            return {
                'rating': 'Needs Improvement',
                'emoji': '🔧',
                'feedback': 'Your resume needs significant improvement in several areas.'
            }

    @staticmethod
    def get_factor_feedback(factor_name: str, score: float) -> str:
        """Get feedback for a specific factor."""
        if score >= 80:
            feedbacks = {
                'Keyword Match': 'Strong keyword alignment with job requirements.',
                'Formatting Quality': 'Professional formatting with consistent styling.',
                'Section Completeness': 'All essential sections are present.',
                'Experience Quality': 'Strong experience descriptions with action verbs.',
                'Education': 'Complete education section with relevant details.',
                'Skills Relevance': 'Relevant and well-organized skills.',
                'Achievements': 'Excellent quantifiable achievements.',
                'Resume Length': 'Optimal length for ATS scanning.',
                'Language Quality': 'Professional language and grammar.',
                'ATS Compatibility': 'Well-optimized for ATS systems.'
            }
        elif score >= 60:
            feedbacks = {
                'Keyword Match': 'Good keyword coverage. Add more specific terms.',
                'Formatting Quality': 'Good formatting with minor improvements needed.',
                'Section Completeness': 'Most sections present. Add more detail.',
                'Experience Quality': 'Good experience descriptions. Add more impact.',
                'Education': 'Education present. Add more details.',
                'Skills Relevance': 'Skills present. Could be more targeted.',
                'Achievements': 'Some achievements present. Add metrics.',
                'Resume Length': 'Acceptable length. Could be optimized.',
                'Language Quality': 'Good language. Could be more polished.',
                'ATS Compatibility': 'Mostly ATS compatible. Minor issues.'
            }
        else:
            feedbacks = {
                'Keyword Match': 'Weak keyword alignment. Add more relevant terms.',
                'Formatting Quality': 'Formatting issues need attention.',
                'Section Completeness': 'Missing important sections.',
                'Experience Quality': 'Experience section needs improvement.',
                'Education': 'Education section needs more information.',
                'Skills Relevance': 'Skills section needs expansion.',
                'Achievements': 'Few or no achievements identified.',
                'Resume Length': 'Length needs adjustment.',
                'Language Quality': 'Language issues need attention.',
                'ATS Compatibility': 'Significant ATS compatibility issues.'
            }
        return feedbacks.get(factor_name, f"{factor_name}: {score:.0f}%")

    @staticmethod
    def get_factor_suggestions(factor_name: str, score: float) -> List[str]:
        """Get suggestions for a specific factor."""
        if factor_name == 'Keyword Match':
            return [
                "Add more keywords from the job description",
                "Include industry-specific terminology",
                "Use keywords naturally throughout your resume"
            ]
        elif factor_name == 'Formatting Quality':
            return [
                "Use consistent formatting throughout",
                "Ensure clear section headers",
                "Use bullet points for readability"
            ]
        elif factor_name == 'Section Completeness':
            return [
                "Add a professional summary section",
                "Include an achievements section",
                "Add a skills section if missing"
            ]
        elif factor_name == 'Experience Quality':
            return [
                "Use strong action verbs (led, managed, created)",
                "Quantify achievements with numbers",
                "Focus on impact and results"
            ]
        elif factor_name == 'Education':
            return [
                "Add degree, institution, and graduation date",
                "Include relevant coursework",
                "List relevant certifications"
            ]
        elif factor_name == 'Skills Relevance':
            return [
                "Add more technical skills relevant to your field",
                "Include soft skills like communication",
                "Group skills by category"
            ]
        elif factor_name == 'Achievements':
            return [
                "Highlight quantifiable results",
                "Use action verbs that demonstrate impact",
                "Include awards and recognitions"
            ]
        elif factor_name == 'Resume Length':
            return [
                "Aim for 1-2 pages",
                "Remove older or less relevant experience",
                "Focus on the most impactful content"
            ]
        elif factor_name == 'Language Quality':
            return [
                "Use professional, business-appropriate language",
                "Avoid casual expressions",
                "Proofread carefully"
            ]
        elif factor_name == 'ATS Compatibility':
            return [
                "Use standard file formats (.docx or .pdf)",
                "Avoid tables and complex formatting",
                "Use clear section headers"
            ]
        else:
            return ["No specific suggestions available."]

    @staticmethod
    def get_summary_report(overall_score: float, factors: List[ScoreFactor]) -> str:
        """Generate a simple summary report."""
        feedback = ScoreExplainerUtils.get_score_feedback(overall_score)
        
        report = f"""
        ========================================
        {feedback['emoji']} YOUR RESUME SCORE REPORT
        ========================================
        
        Overall Score: {overall_score:.0f}%
        Rating: {feedback['rating']}
        
        {feedback['feedback']}
        
        ========================================
        SCORE FACTORS BREAKDOWN
        ========================================
        """
        
        # Sort factors by score (highest first)
        sorted_factors = sorted(factors, key=lambda x: x.score, reverse=True)
        
        for factor in sorted_factors:
            report += f"\n{factor.name}: {factor.score:.0f}%"
            report += f"\n   {ScoreExplainerUtils.get_factor_feedback(factor.name, factor.score)}"
            
            if factor.score < 70:
                report += "\n   Suggestions:"
                for suggestion in ScoreExplainerUtils.get_factor_suggestions(factor.name, factor.score)[:2]:
                    report += f"\n   - {suggestion}"
            
            report += "\n"
        
        # Quick tips section
        report += f"""
        ========================================
        QUICK TIPS TO IMPROVE
        ========================================
        """
        
        low_factors = [f for f in factors if f.score < 70]
        if low_factors:
            report += "\nFocus on improving these areas first:\n"
            for factor in low_factors[:3]:
                report += f"\n• {factor.name} ({factor.score:.0f}%)"
                suggestions = ScoreExplainerUtils.get_factor_suggestions(factor.name, factor.score)
                for suggestion in suggestions[:1]:
                    report += f"\n  - {suggestion}"
        else:
            report += "\nYour resume is in good shape! Keep maintaining it."
        
        return report