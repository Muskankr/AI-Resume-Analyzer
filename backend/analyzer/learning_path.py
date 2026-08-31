"""
Resume Skill Gap Learning Path Generator.

This module identifies missing skills between the user's resume and a target
job description, then generates a curated, step-by-step learning path with
resource recommendations to bridge those gaps.
"""

import re
from typing import List, Dict, Any

# Simplified mock database of learning resources mapped to skills
LEARNING_RESOURCES = {
    "python": [
        {
            "title": "Python for Everybody",
            "type": "Course",
            "provider": "Coursera",
            "duration": "4 weeks",
            "url": "https://www.coursera.org/specializations/python",
        },
        {
            "title": "Automate the Boring Stuff with Python",
            "type": "Book",
            "provider": "No Starch Press",
            "duration": "Self-paced",
            "url": "https://automatetheboringstuff.com/",
        },
    ],
    "react": [
        {
            "title": "React - The Complete Guide",
            "type": "Course",
            "provider": "Udemy",
            "duration": "40 hours",
            "url": "https://www.udemy.com/course/react-the-complete-guide-incl-redux/",
        },
        {
            "title": "React Official Tutorial",
            "type": "Documentation",
            "provider": "React",
            "duration": "2 weeks",
            "url": "https://react.dev/learn",
        },
    ],
    "aws": [
        {
            "title": "AWS Certified Cloud Practitioner",
            "type": "Certification",
            "provider": "AWS",
            "duration": "6 weeks",
            "url": "https://aws.amazon.com/certification/",
        },
        {
            "title": "AWS Skill Builder",
            "type": "Platform",
            "provider": "Amazon",
            "duration": "Self-paced",
            "url": "https://explore.skillbuilder.aws/",
        },
    ],
    "machine learning": [
        {
            "title": "Machine Learning Specialization",
            "type": "Course",
            "provider": "DeepLearning.AI",
            "duration": "3 months",
            "url": "https://www.coursera.org/specializations/machine-learning-introduction",
        },
        {
            "title": "Hands-On Machine Learning",
            "type": "Book",
            "provider": "O'Reilly",
            "duration": "Self-paced",
            "url": "https://www.oreilly.com/library/view/hands-on-machine-learning/9781492032632/",
        },
    ],
    "sql": [
        {
            "title": "SQL for Data Science",
            "type": "Course",
            "provider": "Coursera",
            "duration": "3 weeks",
            "url": "https://www.coursera.org/learn/sql-for-data-science",
        },
        {
            "title": "SQLZoo",
            "type": "Interactive Tutorial",
            "provider": "SQLZoo",
            "duration": "1 week",
            "url": "https://sqlzoo.net/",
        },
    ],
}

# Default fallback resource for unknown skills
DEFAULT_RESOURCE = {
    "title": "General Search for {skill}",
    "type": "Search",
    "provider": "Various",
    "duration": "Varies",
    "url": "https://www.google.com/search?q=best+way+to+learn+{skill}",
}


def extract_skills(text: str) -> List[str]:
    """
    Extracts skills from text (simplified heuristic).
    """
    # In a real app, this would use a comprehensive skill dictionary or NLP model
    known_skills = [
        "python",
        "react",
        "aws",
        "machine learning",
        "sql",
        "javascript",
        "docker",
        "kubernetes",
        "java",
        "node.js",
    ]
    text_lower = text.lower()

    found_skills = []
    for skill in known_skills:
        if re.search(rf"\b{re.escape(skill)}\b", text_lower):
            found_skills.append(skill)

    return found_skills


def generate_learning_path(
    resume_text: str, job_description: str
) -> List[Dict[str, Any]]:
    """
    Identifies skill gaps and generates a learning path.

    Args:
        resume_text (str): The user's resume text.
        job_description (str): The target job description.

    Returns:
        List[Dict[str, Any]]: A list of missing skills with recommended learning resources.
    """
    resume_skills = extract_skills(resume_text)
    jd_skills = extract_skills(job_description)

    # Identify missing skills (case-insensitive)
    resume_skills_lower = [s.lower() for s in resume_skills]
    missing_skills = [s for s in jd_skills if s.lower() not in resume_skills_lower]

    learning_path = []
    for skill in missing_skills:
        # Get resources for the skill, or use default
        resources = LEARNING_RESOURCES.get(
            skill.lower(),
            [
                {
                    "title": DEFAULT_RESOURCE["title"].format(skill=skill.title()),
                    "type": DEFAULT_RESOURCE["type"],
                    "provider": DEFAULT_RESOURCE["provider"],
                    "duration": DEFAULT_RESOURCE["duration"],
                    "url": DEFAULT_RESOURCE["url"].format(
                        skill=skill.replace(" ", "+")
                    ),
                }
            ],
        )

        learning_path.append(
            {
                "skill": skill.title(),
                "priority": (
                    "High" if skill.lower() in ["python", "react", "aws"] else "Medium"
                ),
                "estimated_time": "2-4 weeks",  # Simplified estimation
                "resources": resources,
            }
        )

    # Sort by priority (High first)
    learning_path.sort(key=lambda x: 0 if x["priority"] == "High" else 1)

    return learning_path
