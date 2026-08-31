"""
Core comparison logic for job offers
"""

import re
from typing import Dict, List, Set, Any
from collections import Counter

class JobOfferComparer:
    """Compares two job offers side by side"""
    
    # Common skill keywords for extraction
    SKILL_KEYWORDS = {
        'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'ruby', 'go', 'rust',
        'react', 'angular', 'vue', 'django', 'flask', 'spring', 'node', 'express',
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins',
        'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
        'git', 'github', 'ci/cd', 'agile', 'scrum', 'kanban',
        'machine learning', 'ai', 'data science', 'analytics', 'deep learning',
        'html', 'css', 'sass', 'tailwind', 'bootstrap',
        'leadership', 'management', 'communication', 'problem solving'
    }
    
    # Experience level indicators
    SENIORITY_KEYWORDS = {
        'junior': ['junior', 'entry', 'associate', '0-2', '0-3'],
        'mid': ['mid', 'intermediate', '3-5', '2-5', 'senior associate'],
        'senior': ['senior', 'lead', 'staff', 'principal', '5+', '5-10', '7+'],
        'lead': ['lead', 'manager', 'director', 'head', 'architect', '10+']
    }
    
    @classmethod
    def compare(cls, jd1: str, jd2: str) -> Dict[str, Any]:
        """
        Compare two job descriptions side by side
        
        Args:
            jd1: First job description text
            jd2: Second job description text
            
        Returns:
            Dictionary with comparison results
        """
        # Extract skills from both JDs
        skills1 = cls._extract_skills(jd1)
        skills2 = cls._extract_skills(jd2)
        
        # Extract experience levels
        exp1 = cls._extract_experience_level(jd1)
        exp2 = cls._extract_experience_level(jd2)
        
        # Find overlaps and differences
        common_skills = skills1 & skills2
        unique_to_jd1 = skills1 - skills2
        unique_to_jd2 = skills2 - skills1
        
        # Calculate match scores
        total_skills = len(skills1 | skills2)
        match_score = round((len(common_skills) / total_skills * 100)) if total_skills > 0 else 0
        
        # Get missing skills for each
        missing_in_jd1 = unique_to_jd2
        missing_in_jd2 = unique_to_jd1
        
        # Extract seniority expectations
        seniority1 = cls._get_seniority_level(exp1)
        seniority2 = cls._get_seniority_level(exp2)
        
        # Get additional insights
        insights = cls._generate_insights(jd1, jd2, skills1, skills2, exp1, exp2)
        
        return {
            'job1': {
                'skills': sorted(list(skills1)),
                'experience_level': exp1,
                'seniority': seniority1,
                'skill_count': len(skills1),
                'missing_skills': sorted(list(missing_in_jd1))
            },
            'job2': {
                'skills': sorted(list(skills2)),
                'experience_level': exp2,
                'seniority': seniority2,
                'skill_count': len(skills2),
                'missing_skills': sorted(list(missing_in_jd2))
            },
            'comparison': {
                'common_skills': sorted(list(common_skills)),
                'unique_to_job1': sorted(list(unique_to_jd1)),
                'unique_to_job2': sorted(list(unique_to_jd2)),
                'match_score': match_score,
                'overlap_percentage': round((len(common_skills) / max(len(skills1), len(skills2)) * 100)) if max(len(skills1), len(skills2)) > 0 else 0,
                'total_skills_combined': total_skills
            },
            'insights': insights,
            'seniority_comparison': {
                'job1_level': seniority1,
                'job2_level': seniority2,
                'is_same': seniority1 == seniority2
            }
        }
    
    @classmethod
    def _extract_skills(cls, text: str) -> Set[str]:
        """Extract skills from job description text"""
        text_lower = text.lower()
        skills = set()
        
        # Check for each skill keyword
        for skill in cls.SKILL_KEYWORDS:
            # Use word boundaries for accurate matching
            pattern = r'\b' + re.escape(skill) + r'\b'
            if re.search(pattern, text_lower):
                skills.add(skill)
        
        return skills
    
    @classmethod
    def _extract_experience_level(cls, text: str) -> str:
        """Extract experience level from job description"""
        text_lower = text.lower()
        
        # Look for years of experience
        year_patterns = [
            r'(\d+)\+?\s*(?:-?\s*\d+)?\s*(?:years?|yrs?)',
            r'(\d+)\s*-\s*(\d+)\s*(?:years?|yrs?)',
            r'(\d+)\s*(?:years?|yrs?)\s*(?:of)?\s*experience'
        ]
        
        years_found = []
        for pattern in year_patterns:
            matches = re.findall(pattern, text_lower)
            for match in matches:
                if isinstance(match, tuple):
                    # Handle range like "3-5 years"
                    try:
                        years_found.append(int(match[0]))
                        if len(match) > 1 and match[1]:
                            years_found.append(int(match[1]))
                    except (ValueError, TypeError):
                        pass
                else:
                    try:
                        years_found.append(int(match))
                    except (ValueError, TypeError):
                        pass
        
        # If years found, determine level
        if years_found:
            avg_years = sum(years_found) / len(years_found)
            if avg_years <= 2:
                return "entry-level (0-2 years)"
            elif avg_years <= 5:
                return "mid-level (3-5 years)"
            elif avg_years <= 10:
                return "senior-level (5-10 years)"
            else:
                return "lead/executive (10+ years)"
        
        # Check for seniority keywords
        if any(word in text_lower for word in ['senior', 'lead', 'principal', 'staff', 'manager', 'director', 'architect']):
            if 'senior' in text_lower and 'lead' in text_lower:
                return "senior/lead"
            elif 'director' in text_lower or 'manager' in text_lower:
                return "management/leadership"
            return "senior-level"
        
        return "not specified"
    
    @classmethod
    def _get_seniority_level(cls, exp_text: str) -> str:
        """Get seniority level from experience text"""
        exp_lower = exp_text.lower()
        
        for level, keywords in cls.SENIORITY_KEYWORDS.items():
            if any(kw in exp_lower for kw in keywords):
                return level
        
        return "not specified"
    
    @classmethod
    def _generate_insights(cls, jd1: str, jd2: str, skills1: Set[str], skills2: Set[str], exp1: str, exp2: str) -> List[str]:
        """Generate comparison insights"""
        insights = []
        
        # Skill insights
        common = skills1 & skills2
        if len(common) >= 5:
            insights.append(f"Both roles share {len(common)} common skills: {', '.join(sorted(list(common))[:5])}{'...' if len(common) > 5 else ''}")
        elif len(common) > 0:
            insights.append(f"Both roles share {len(common)} common skill(s): {', '.join(sorted(list(common)))}")
        else:
            insights.append("These roles have no overlapping skills - they require completely different expertise")
        
        # Skill gap insights
        unique1 = skills1 - skills2
        unique2 = skills2 - skills1
        
        if unique1:
            insights.append(f"Job 1 uniquely requires: {', '.join(sorted(list(unique1))[:5])}{'...' if len(unique1) > 5 else ''}")
        if unique2:
            insights.append(f"Job 2 uniquely requires: {', '.join(sorted(list(unique2))[:5])}{'...' if len(unique2) > 5 else ''}")
        
        # Experience insights
        if exp1 != "not specified" and exp2 != "not specified":
            if "entry" in exp1 and "senior" in exp2:
                insights.append("Job 1 is entry-level while Job 2 expects senior experience - consider your career stage")
            elif "senior" in exp1 and "entry" in exp2:
                insights.append("Job 1 expects senior experience while Job 2 is entry-level")
            elif exp1 == exp2:
                insights.append(f"Both roles have similar experience expectations: {exp1}")
            else:
                insights.append(f"Experience expectations differ: Job 1 ({exp1}) vs Job 2 ({exp2})")
        
        # Count insights
        skill_diff = len(unique1) + len(unique2)
        if skill_diff > 10:
            insights.append(f"Significant skill difference ({skill_diff} unique skills total) - these are very different roles")
        elif skill_diff > 5:
            insights.append(f"Moderate skill difference ({skill_diff} unique skills total)")
        else:
            insights.append(f"Small skill difference ({skill_diff} unique skills total) - these roles are quite similar")
        
        # Seniority insight
        seniority1 = cls._get_seniority_level(exp1)
        seniority2 = cls._get_seniority_level(exp2)
        if seniority1 != "not specified" and seniority2 != "not specified" and seniority1 != seniority2:
            insights.append(f"Seniority differs: Job 1 is {seniority1}, Job 2 is {seniority2}")
        
        # Job title detection (simple)
        title_patterns = [
            r'job title[:\s]+([^\n.]+)',
            r'position[:\s]+([^\n.]+)',
            r'title[:\s]+([^\n.]+)',
            r'([A-Z][a-z]+ [A-Z][a-z]+) engineer',
            r'([A-Z][a-z]+) developer'
        ]
        
        titles1 = []
        titles2 = []
        for pattern in title_patterns:
            match1 = re.search(pattern, jd1, re.IGNORECASE)
            match2 = re.search(pattern, jd2, re.IGNORECASE)
            if match1:
                titles1.append(match1.group(1).strip())
            if match2:
                titles2.append(match2.group(1).strip())
        
        if titles1 and titles2:
            if titles1[0].lower() != titles2[0].lower():
                insights.append(f"Job titles differ: '{titles1[0]}' vs '{titles2[0]}'")
        
        return insights[:8]  # Limit to 8 insights