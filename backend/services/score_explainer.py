"""
Score Explainer for AI Resume Analyzer
Provides detailed, explainable breakdowns of ATS scores with weighted factors.
"""

import logging
import re
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import uuid

from backend.models.score_breakdown import (
    ScoreBreakdown, ScoreFactor, ScoreExplainabilityRequest,
    FactorCategory, WeightedFactor, FactorResult
)
from backend.services.scoring_factors import ScoringFactors
from backend.services.score_explainer_utils import ScoreExplainerUtils

logger = logging.getLogger(__name__)


class ScoreExplainer:
    """
    Generates explainable score breakdowns with weighted factors.
    """

    def __init__(self):
        self.factors = ScoringFactors.get_all_factors()
        self._cache: Dict[str, ScoreBreakdown] = {}

    def explain_score(
        self,
        resume_id: str,
        resume_content: Dict[str, Any],
        job_description: Optional[Dict[str, Any]] = None,
        request: Optional[ScoreExplainabilityRequest] = None
    ) -> ScoreBreakdown:
        """
        Generate a detailed score breakdown for a resume.
        """
        if request is None:
            request = ScoreExplainabilityRequest(resume_id=resume_id)
        
        cache_key = f"{resume_id}_{id(job_description) if job_description else 'no_jd'}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        factor_results = []
        total_weighted_score = 0.0
        total_weight = 0.0
        
        for factor in self.factors:
            result = self._evaluate_factor(factor, resume_content, job_description)
            factor_results.append(result)
            
            weighted_score = result.score * factor.weight
            total_weighted_score += weighted_score
            total_weight += factor.weight
        
        overall_score = (total_weighted_score / total_weight) * 100 if total_weight > 0 else 0
        
        score_factors = []
        category_scores = {}
        
        for result in factor_results:
            score_factor = ScoreFactor(
                name=result.factor.name,
                category=result.factor.category,
                weight=result.factor.weight,
                score=result.score,
                max_score=result.factor.max_score,
                contribution=(result.score * result.factor.weight) / 100,
                confidence=result.confidence,
                feedback=result.feedback,
                suggestions=result.suggestions[:3],
                metadata=result.metadata
            )
            score_factors.append(score_factor)
            
            category = result.factor.category.value
            if category not in category_scores:
                category_scores[category] = {'total': 0, 'count': 0}
            category_scores[category]['total'] += result.score
            category_scores[category]['count'] += 1
        
        category_averages = {
            cat: data['total'] / data['count'] if data['count'] > 0 else 0
            for cat, data in category_scores.items()
        }
        
        plain_language_summary = ScoreExplainerUtils.get_summary_report(overall_score, score_factors)
        improvement_priorities = self._generate_improvement_priorities(score_factors)
        
        breakdown = ScoreBreakdown(
            resume_id=resume_id,
            resume_name=resume_content.get('filename', 'Unknown Resume'),
            overall_score=overall_score,
            factors=score_factors,
            category_scores=category_averages,
            plain_language_summary=plain_language_summary,
            improvement_priorities=improvement_priorities,
            generated_at=datetime.now()
        )
        
        self._cache[cache_key] = breakdown
        
        return breakdown

    def _evaluate_factor(
        self,
        factor: WeightedFactor,
        resume_content: Dict[str, Any],
        job_description: Optional[Dict[str, Any]] = None
    ) -> FactorResult:
        """Evaluate a single scoring factor."""
        factor_name = factor.name
        score = 0.0
        feedback = ""
        suggestions = []
        confidence = 0.8
        metadata = {}
        
        if factor_name == "Keyword Match":
            score, feedback, suggestions, confidence = self._evaluate_keyword_match(
                resume_content, job_description
            )
        elif factor_name == "Formatting Quality":
            score, feedback, suggestions, confidence = self._evaluate_formatting(
                resume_content
            )
        elif factor_name == "Section Completeness":
            score, feedback, suggestions, confidence = self._evaluate_sections(
                resume_content
            )
        elif factor_name == "Experience Quality":
            score, feedback, suggestions, confidence = self._evaluate_experience(
                resume_content
            )
        elif factor_name == "Education":
            score, feedback, suggestions, confidence = self._evaluate_education(
                resume_content
            )
        elif factor_name == "Skills Relevance":
            score, feedback, suggestions, confidence = self._evaluate_skills(
                resume_content, job_description
            )
        elif factor_name == "Achievements":
            score, feedback, suggestions, confidence = self._evaluate_achievements(
                resume_content
            )
        elif factor_name == "Resume Length":
            score, feedback, suggestions, confidence = self._evaluate_length(
                resume_content
            )
        elif factor_name == "Language Quality":
            score, feedback, suggestions, confidence = self._evaluate_language(
                resume_content
            )
        elif factor_name == "ATS Compatibility":
            score, feedback, suggestions, confidence = self._evaluate_ats(
                resume_content
            )
        else:
            score = 75.0
            feedback = "This factor is not yet evaluated."
            suggestions = ["No specific suggestions available."]
        
        return FactorResult(
            factor=factor,
            score=score,
            feedback=feedback,
            suggestions=suggestions,
            confidence=confidence,
            metadata=metadata
        )

    def _evaluate_keyword_match(
        self,
        resume_content: Dict[str, Any],
        job_description: Optional[Dict[str, Any]]
    ) -> Tuple[float, str, List[str], float]:
        """Evaluate keyword match factor."""
        if not job_description:
            return (
                70.0,
                "No job description provided for keyword analysis. Score is based on general industry keywords.",
                ["Upload a job description for more accurate keyword matching"],
                0.6
            )
        
        resume_text = " ".join(resume_content.get('sections', {}).values())
        jd_text = " ".join(job_description.get('sections', {}).values())
        
        resume_words = set(re.findall(r'\b[a-z]{3,}\b', resume_text.lower()))
        jd_words = set(re.findall(r'\b[a-z]{3,}\b', jd_text.lower()))
        
        if not jd_words:
            return 70.0, "No keywords found in job description.", [], 0.5
        
        matches = resume_words.intersection(jd_words)
        coverage = len(matches) / len(jd_words) * 100 if jd_words else 0
        
        if coverage >= 80:
            score = 95
            feedback = "Excellent keyword match! Your resume contains many of the key terms from the job description."
            suggestions = ["Consider adding any missing industry-specific terms"]
        elif coverage >= 60:
            score = 80
            feedback = "Good keyword match. Your resume aligns well with the job requirements."
            suggestions = ["Add more specific technical terms", "Include industry-specific keywords"]
        elif coverage >= 40:
            score = 60
            feedback = "Moderate keyword match. Consider adding more relevant terms from the job description."
            suggestions = ["Review the job description for key terms", "Add missing technical skills"]
        else:
            score = 40
            feedback = "Low keyword match. Your resume could better align with the job description."
            suggestions = ["Add more keywords from the job description", "Highlight relevant skills"]
        
        return score, feedback, suggestions, 0.85

    def _evaluate_formatting(self, resume_content: Dict[str, Any]) -> Tuple[float, str, List[str], float]:
        """Evaluate formatting quality factor."""
        text = resume_content.get('text', '')
        issues = []
        
        if '\n\n\n' in text:
            issues.append("Excessive blank lines found")
        
        sections = resume_content.get('sections', {})
        common_sections = ['experience', 'education', 'skills', 'summary']
        present_sections = [s for s in common_sections if s in sections]
        
        if len(present_sections) < 3:
            issues.append("Missing common resume sections")
        
        if issues:
            score = max(50, 90 - (len(issues) * 10))
            feedback = f"Formatting could be improved. Issues found: {', '.join(issues)}"
            suggestions = ["Use consistent formatting throughout", "Ensure clear section headers", "Use bullet points for readability"]
            confidence = 0.7
        else:
            score = 90
            feedback = "Good formatting! Your resume is well-structured and easy to read."
            suggestions = ["Consider using a more modern template", "Add visual elements if appropriate"]
            confidence = 0.9
        
        return score, feedback, suggestions, confidence

    def _evaluate_sections(self, resume_content: Dict[str, Any]) -> Tuple[float, str, List[str], float]:
        """Evaluate section completeness factor."""
        sections = resume_content.get('sections', {})
        required_sections = ['experience', 'education', 'skills']
        
        present = [s for s in required_sections if s in sections and sections.get(s, '').strip()]
        missing = [s for s in required_sections if s not in present]
        
        if len(present) == 3:
            score = 95
            feedback = "All essential sections are present and complete!"
            suggestions = ["Add optional sections like 'Achievements' or 'Certifications'"]
            confidence = 0.9
        elif len(present) == 2:
            score = 75
            feedback = f"Good but missing {missing[0].title()} section."
            suggestions = [f"Add a {missing[0].title()} section to your resume"]
            confidence = 0.8
        else:
            score = 50
            feedback = f"Missing multiple sections: {', '.join(missing)}"
            suggestions = ["Add all required sections", "Ensure each section has meaningful content"]
            confidence = 0.7
        
        return score, feedback, suggestions, confidence

    def _evaluate_experience(self, resume_content: Dict[str, Any]) -> Tuple[float, str, List[str], float]:
        """Evaluate experience quality factor."""
        experience = resume_content.get('sections', {}).get('experience', '')
        
        if not experience:
            return 30.0, "No experience section found.", ["Add work experience section"], 0.6
        
        has_action_verbs = any(v in experience.lower() for v in ['led', 'managed', 'created', 'developed', 'implemented'])
        has_numbers = any(c.isdigit() for c in experience)
        has_achievements = any(w in experience.lower() for w in ['achieved', 'increased', 'decreased', 'improved'])
        
        score = 50
        feedback = []
        suggestions = []
        
        if has_action_verbs:
            score += 15
            feedback.append("Good use of action verbs")
        else:
            suggestions.append("Use strong action verbs (led, managed, created, implemented)")
        
        if has_numbers:
            score += 20
            feedback.append("Includes quantifiable metrics")
        else:
            suggestions.append("Add numbers and metrics to your experience descriptions")
        
        if has_achievements:
            score += 15
            feedback.append("Highlights achievements")
        else:
            suggestions.append("Include specific achievements and results")
        
        if not feedback:
            feedback = ["Experience section needs improvement"]
        
        return min(score, 95), " ".join(feedback), suggestions[:3], 0.8

    def _evaluate_education(self, resume_content: Dict[str, Any]) -> Tuple[float, str, List[str], float]:
        """Evaluate education factor."""
        education = resume_content.get('sections', {}).get('education', '')
        
        if not education:
            return 40.0, "No education section found.", ["Add education section"], 0.6
        
        score = 70
        feedback = []
        suggestions = []
        
        if any(d in education.lower() for d in ['bachelor', 'master', 'phd', 'degree', 'certification']):
            score += 15
            feedback.append("Education includes degree information")
        else:
            suggestions.append("Include your degree and field of study")
        
        if any(i in education.lower() for i in ['university', 'college', 'institute', 'school']):
            score += 10
            feedback.append("Institution information present")
        else:
            suggestions.append("Add institution name and location")
        
        if re.search(r'19\d{2}|20\d{2}', education):
            score += 5
            feedback.append("Graduation date included")
        else:
            suggestions.append("Include your graduation year or expected graduation")
        
        if not feedback:
            feedback = ["Education section is complete"]
        
        return min(score, 95), " ".join(feedback), suggestions[:3], 0.85

    def _evaluate_skills(self, resume_content: Dict[str, Any], job_description: Optional[Dict[str, Any]] = None) -> Tuple[float, str, List[str], float]:
        """Evaluate skills relevance factor."""
        skills = resume_content.get('sections', {}).get('skills', '')
        
        if not skills:
            return 35.0, "No skills section found.", ["Add a skills section"], 0.6
        
        skills_list = [s.strip().lower() for s in skills.split(',') if s.strip()]
        score = 50
        feedback = []
        suggestions = []
        
        if len(skills_list) >= 5:
            score += 20
            feedback.append("Good number of skills listed")
        else:
            suggestions.append("List more skills (aim for 10-15)")
        
        technical = ['python', 'java', 'javascript', 'sql', 'aws', 'react', 'node', 'docker', 'kubernetes']
        soft = ['communication', 'leadership', 'teamwork', 'problem solving', 'critical thinking']
        
        tech_skills = [s for s in skills_list if any(t in s for t in technical)]
        soft_skills = [s for s in skills_list if any(t in s for t in soft)]
        
        if tech_skills:
            score += 10
            feedback.append("Technical skills identified")
        else:
            suggestions.append("Add relevant technical skills")
        
        if soft_skills:
            score += 5
            feedback.append("Soft skills included")
        else:
            suggestions.append("Include soft skills like communication and leadership")
        
        if not feedback:
            feedback = ["Skills section is present but could be enhanced"]
        
        return min(score, 90), " ".join(feedback), suggestions[:3], 0.8

    def _evaluate_achievements(self, resume_content: Dict[str, Any]) -> Tuple[float, str, List[str], float]:
        """Evaluate achievements factor."""
        text = resume_content.get('text', '')
        
        achievement_keywords = ['achieved', 'increased', 'decreased', 'improved', 'reduced', 'grew', 'led', 'managed', 'created', 'developed', 'implemented', 'launched', 'saved']
        has_achievements = any(k in text.lower() for k in achievement_keywords)
        has_numbers = bool(re.search(r'\d+%|\$\d+|\d+ employees|\d+ users|\d+ projects', text))
        
        if has_achievements and has_numbers:
            score = 90
            feedback = "Strong achievements with quantifiable results!"
            suggestions = ["Continue highlighting achievements", "Add more specific metrics"]
        elif has_achievements:
            score = 70
            feedback = "Good achievements but could include more metrics."
            suggestions = ["Add numbers and percentages to quantify your achievements"]
        else:
            score = 50
            feedback = "Few achievements identified. Consider highlighting your accomplishments more."
            suggestions = ["Use action verbs to describe achievements", "Include specific results and impact"]
        
        return score, feedback, suggestions, 0.75

    def _evaluate_length(self, resume_content: Dict[str, Any]) -> Tuple[float, str, List[str], float]:
        """Evaluate resume length factor."""
        text = resume_content.get('text', '')
        word_count = len(text.split())
        
        if 300 <= word_count <= 600:
            score = 95
            feedback = "Excellent resume length! Optimal for ATS scanning."
            suggestions = ["Keep this length for future resumes"]
        elif 250 <= word_count <= 800:
            score = 80
            feedback = "Good resume length. Slightly outside optimal range but still acceptable."
            suggestions = ["Consider trimming to 1-2 pages", "Focus on most relevant experience"]
        elif word_count < 250:
            score = 60
            feedback = "Resume is too short. Consider adding more detail to your experience and skills."
            suggestions = ["Add more details to your experience", "Include more skills and achievements"]
        else:
            score = 50
            feedback = "Resume is too long. ATS systems prefer 1-2 page resumes."
            suggestions = ["Trim to 1-2 pages", "Focus on most relevant experience", "Remove older or irrelevant positions"]
        
        return score, feedback, suggestions, 0.9

    def _evaluate_language(self, resume_content: Dict[str, Any]) -> Tuple[float, str, List[str], float]:
        """Evaluate language quality factor."""
        text = resume_content.get('text', '')
        
        issues = []
        
        common_errors = ['teh', 'recieve', 'acheive', 'definately', 'seperate']
        for error in common_errors:
            if error in text.lower():
                issues.append(error)
        
        passive_indicators = ['was', 'were', 'been', 'being', 'have been', 'has been']
        passive_count = sum(1 for p in passive_indicators if p in text.lower())
        
        casual_words = ['cool', 'awesome', 'great', 'nice', 'good']
        casual_count = sum(1 for c in casual_words if c in text.lower())
        
        if issues:
            score = 60
            feedback = f"Spelling issues found: {', '.join(issues)}"
            suggestions = ["Run spell check on your resume", "Proofread carefully"]
        elif passive_count > 10:
            score = 70
            feedback = "Some passive voice used. Active voice is preferred."
            suggestions = ["Use active voice instead of passive", "Use strong action verbs"]
        elif casual_count > 3:
            score = 75
            feedback = "Some casual language detected. Consider more professional tone."
            suggestions = ["Use professional language", "Avoid casual expressions"]
        else:
            score = 90
            feedback = "Excellent language quality! Professional and clear."
            suggestions = ["Maintain this standard", "Consider industry-specific terminology"]
        
        return score, feedback, suggestions, 0.85

    def _evaluate_ats(self, resume_content: Dict[str, Any]) -> Tuple[float, str, List[str], float]:
        """Evaluate ATS compatibility factor."""
        text = resume_content.get('text', '')
        issues = []
        
        if '\t' in text:
            issues.append("Tabs detected - may cause parsing issues")
        
        if '|' in text:
            issues.append("Tables detected - ATS may not parse correctly")
        
        common_headers = ['experience', 'education', 'skills', 'summary', 'profile']
        has_headers = any(h in text.lower() for h in common_headers)
        
        if not has_headers:
            issues.append("Missing clear section headers")
        
        has_email = bool(re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text))
        has_phone = bool(re.search(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', text))
        
        if not has_email or not has_phone:
            issues.append("Missing contact information")
        
        if issues:
            score = max(50, 90 - (len(issues) * 10))
            feedback = f"ATS compatibility issues: {', '.join(issues)}"
            suggestions = ["Use simple formatting without tables", "Add clear section headers", "Use standard file format (.docx or .pdf)"]
            confidence = 0.7
        else:
            score = 90
            feedback = "Good ATS compatibility! Your resume is parsable."
            suggestions = ["Continue using clean formatting", "Avoid complex layouts"]
            confidence = 0.85
        
        return score, feedback, suggestions, confidence

    def _generate_improvement_priorities(self, factors: List[ScoreFactor]) -> List[Dict[str, Any]]:
        """Generate improvement priorities based on factor scores."""
        sorted_factors = sorted(factors, key=lambda x: x.score)
        
        priorities = []
        for factor in sorted_factors[:5]:
            if factor.score < 70:
                priorities.append({
                    'factor': factor.name,
                    'category': factor.category.value,
                    'current_score': factor.score,
                    'max_score': factor.max_score,
                    'suggestions': factor.suggestions[:2],
                    'impact': 'high' if factor.weight > 0.1 else 'medium',
                    'estimated_improvement': f"{min(100 - factor.score, 20):.0f}%",
                    'priority': len(priorities) + 1
                })
        
        return priorities