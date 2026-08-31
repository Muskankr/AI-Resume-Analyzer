"""
AI-Powered Mock Interview Chatbot Simulator.

This module generates role-specific interview questions based on the user's
resume and target job description, and evaluates user-submitted answers
for relevance, clarity, and keyword usage.
"""

import re
from typing import List, Dict, Any, Optional

# Simplified mock database of interview questions by category
INTERVIEW_QUESTION_BANK = {
    "technical": [
        "Can you describe a challenging technical problem you solved recently and your approach?",
        "How do you ensure the code you write is maintainable and scalable?",
        "Explain a time when you had to learn a new technology quickly to complete a project.",
    ],
    "behavioral": [
        "Tell me about a time you had a disagreement with a team member. How did you resolve it?",
        "Describe a situation where you had to manage multiple tight deadlines.",
        "Give an example of a time you took initiative on a project without being asked.",
    ],
    "role_specific": [
        "How does your experience with {skill} align with the requirements of this {role} position?",
        "Can you walk me through a project where you utilized {skill} to drive measurable results?",
        "What do you consider your strongest technical asset for this {role} role, and why?",
    ],
}

# Keywords to look for in good answers (simplified heuristic)
POSITIVE_INDICATORS = [
    r"\bI led\b",
    r"\bI architected\b",
    r"\bwe collaborated\b",
    r"\bresulted in\b",
    r"\bimproved by\b",
    r"\breduced by\b",
    r"\bSTAR method\b",
    r"\bspecific example\b",
]

NEGATIVE_INDICATORS = [
    r"\bI think\b",
    r"\bI guess\b",
    r"\bmaybe\b",
    r"\bkind of\b",
    r"\bsort of\b",
    r"\bI don't know\b",
    r"\bnot sure\b",
]


def generate_interview_questions(
    resume_text: str, job_description: str, role: str
) -> List[Dict[str, Any]]:
    """
    Generates a set of mock interview questions tailored to the resume and job description.

    Args:
        resume_text (str): The user's resume text.
        job_description (str): The target job description.
        role (str): The target job role.

    Returns:
        List[Dict[str, Any]]: A list of questions with their category.
    """
    questions = []

    # Extract a few key skills from the job description (simplified)
    # In a real app, this would use NLP skill extraction
    jd_lower = job_description.lower()
    skills = ["Python", "React", "AWS", "Leadership", "Agile"]  # Mock extraction
    matched_skills = [skill for skill in skills if skill.lower() in jd_lower]
    primary_skill = matched_skills[0] if matched_skills else "core technologies"

    # Select 1 technical, 1 behavioral, and 1 role-specific question
    questions.append(
        {
            "id": "q1",
            "category": "technical",
            "question": INTERVIEW_QUESTION_BANK["technical"][0],
        }
    )
    questions.append(
        {
            "id": "q2",
            "category": "behavioral",
            "question": INTERVIEW_QUESTION_BANK["behavioral"][0],
        }
    )

    # Customize role-specific question
    role_question = INTERVIEW_QUESTION_BANK["role_specific"][0].format(
        skill=primary_skill, role=role
    )
    questions.append(
        {"id": "q3", "category": "role_specific", "question": role_question}
    )

    return questions


def evaluate_answer(question: str, answer: str) -> Dict[str, Any]:
    """
    Evaluates a user's answer to an interview question.

    Args:
        question (str): The interview question.
        answer (str): The user's submitted answer.

    Returns:
        Dict[str, Any]: Evaluation results including score, feedback, and keyword usage.
    """
    if not answer or len(answer.strip()) < 20:
        return {
            "score": 0,
            "feedback": "Your answer is too brief. Try to provide a specific example using the STAR method (Situation, Task, Action, Result).",
            "strengths": [],
            "areas_for_improvement": ["Provide more detail and specific examples."],
        }

    answer_lower = answer.lower()
    score = 50  # Base score

    strengths = []
    improvements = []

    # Check for positive indicators
    positive_matches = [
        indicator
        for indicator in POSITIVE_INDICATORS
        if re.search(indicator, answer_lower)
    ]
    if positive_matches:
        score += len(positive_matches) * 15
        strengths.append("Used strong, action-oriented language.")
        if any("resulted in" in p or "improved by" in p for p in positive_matches):
            strengths.append("Included quantifiable results or outcomes.")

    # Check for negative indicators
    negative_matches = [
        indicator
        for indicator in NEGATIVE_INDICATORS
        if re.search(indicator, answer_lower)
    ]
    if negative_matches:
        score -= len(negative_matches) * 10
        improvements.append(
            "Avoid uncertain language like 'I think' or 'maybe'. Be more confident and direct."
        )

    # Check for length and structure
    word_count = len(answer.split())
    if word_count < 50:
        improvements.append(
            "The answer is a bit short. Aim for 2-3 detailed paragraphs explaining the situation and your specific actions."
        )
    elif word_count > 300:
        improvements.append(
            "The answer is quite long. Try to be more concise and focus on the most impactful actions and results."
        )

    # Check for STAR method elements (simplified)
    if re.search(r"\b(situation|context|background)\b", answer_lower) and re.search(
        r"\b(action|step|implemented)\b", answer_lower
    ):
        strengths.append("Good structure, touching on both context and action.")
    else:
        improvements.append(
            "Consider structuring your answer using the STAR method (Situation, Task, Action, Result) for clarity."
        )

    # Cap score between 0 and 100
    final_score = max(0, min(100, score))

    return {
        "score": final_score,
        "feedback": "Overall, "
        + (
            "great job!"
            if final_score >= 80
            else "good start, but there's room for improvement."
        ),
        "strengths": (
            strengths if strengths else ["Answer was relevant to the question."]
        ),
        "areas_for_improvement": (
            improvements if improvements else ["Keep up the good work!"]
        ),
    }
