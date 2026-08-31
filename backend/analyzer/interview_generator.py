"""
Advanced logic to identify missing skills and experience gaps,
then construct targeted interview questions with expected answer guidelines.
"""

import re
from typing import List, Dict, Any
from dataclasses import dataclass, field


@dataclass
class InterviewQuestion:
    category: str
    difficulty: str
    question: str
    guidelines: str
    is_practiced: bool = False
    is_saved: bool = False


class InterviewGenerator:
    """Generates tailored interview questions based on resume and JD gaps."""

    COMMON_TECHNICAL_SKILLS = [
        "python",
        "java",
        "react",
        "aws",
        "docker",
        "sql",
        "machine learning",
        "agile",
        "kubernetes",
        "graphql",
    ]
    COMMON_BEHAVIORAL_KEYWORDS = [
        "led",
        "managed",
        "collaborated",
        "resolved",
        "improved",
        "mentored",
    ]

    @classmethod
    def generate_questions(
        cls, resume_text: str, skills: List[str], job_description: str
    ) -> List[InterviewQuestion]:
        """
        Analyzes the gap between resume and JD, then generates questions.
        """
        questions = []
        jd_lower = job_description.lower()
        resume_lower = resume_text.lower()

        # 1. Gap Analysis: Identify missing technical skills
        missing_skills = []
        for skill in cls.COMMON_TECHNICAL_SKILLS:
            if skill in jd_lower and skill not in resume_lower:
                missing_skills.append(skill)

        # Fallback if no specific skills are found but JD is substantial
        if not missing_skills and len(jd_lower) > 200:
            missing_skills = ["system design", "scalability"]

        # 2. Generate Technical Questions based on gaps
        for skill in missing_skills[:2]:
            questions.append(
                InterviewQuestion(
                    category="Technical",
                    difficulty="Medium",
                    question=f"Can you explain your experience with {skill.title()} and how it relates to the requirements of this role?",
                    guidelines=f"Discuss specific projects where you used {skill.title()}. Mention challenges faced and how you overcame them. If you lack direct experience, explain how your skills in similar technologies translate to this requirement.",
                )
            )

        # 3. Generate Gap-Focused Questions
        if missing_skills:
            questions.append(
                InterviewQuestion(
                    category="Gap-Focused",
                    difficulty="Hard",
                    question=f"This role requires strong expertise in {missing_skills[0].title()}. How would you approach getting up to speed quickly if hired?",
                    guidelines="Show a proactive learning mindset. Mention specific resources (courses, documentation, open-source projects) you would use. Highlight your past ability to learn new technologies quickly with a concrete example.",
                )
            )

        # 4. Generate Behavioral Questions based on resume content
        if any(kw in resume_lower for kw in cls.COMMON_BEHAVIORAL_KEYWORDS):
            questions.append(
                InterviewQuestion(
                    category="Behavioral",
                    difficulty="Medium",
                    question="Tell me about a time you had to resolve a conflict or a critical issue within your team. What was the outcome?",
                    guidelines="Use the STAR method (Situation, Task, Action, Result). Focus on your specific actions and the positive resolution. Avoid blaming others and emphasize teamwork and communication.",
                )
            )
        else:
            questions.append(
                InterviewQuestion(
                    category="Behavioral",
                    difficulty="Easy",
                    question="Describe a project you are particularly proud of. What was your specific role and contribution?",
                    guidelines="Clearly define your specific contributions. Use metrics to quantify the impact. Explain why you are proud of it and what you learned from the experience.",
                )
            )

        # 5. Add a generic hard architectural/system question
        questions.append(
            InterviewQuestion(
                category="Technical",
                difficulty="Hard",
                question="How do you ensure the scalability, security, and maintainability of the systems you build?",
                guidelines="Discuss architectural patterns (microservices, modular design), testing strategies (TDD, CI/CD), and code review practices. Mention specific tools and methodologies you rely on.",
            )
        )

        return questions
