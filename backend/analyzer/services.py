import os
import pdfplumber
from django.contrib.auth import get_user_model
from .models import ResumeAnalysis

User = get_user_model()


SKILLS = [
    "python",
    "django",
    "react",
    "javascript",
    "typescript",
    "html",
    "css",
    "tailwind",
    "sql",
    "mysql",
    "postgresql",
    "mongodb",
    "git",
    "github",
    "flask",
    "docker",
    "aws",
    "machine learning",
    "data analysis",
    "excel",
    "c",
    "c++",
    "java",
]


ROLE_SKILLS = {
    "Frontend Developer": [
        "html",
        "css",
        "javascript",
        "react",
        "typescript",
        "tailwind",
        "git",
        "github",
    ],

    "Backend Developer": [
        "python",
        "django",
        "flask",
        "sql",
        "mysql",
        "git",
        "github",
        "docker",
    ],

    "Data Analyst": [
        "python",
        "sql",
        "excel",
        "machine learning",
        "data analysis",
    ],
}


def analyze_resume(file_path, target_role, file_name="resume.pdf", user_id=None):

    text = ""

    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted

    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

    text = text.lower()

    detected = [skill for skill in SKILLS if skill.lower() in text]

    matched = []
    missing = []

    required = ROLE_SKILLS.get(target_role, [])

    for skill in required:
        if skill in detected:
            matched.append(skill)
        else:
            missing.append(skill)

    score = (
        int(len(matched) / len(required) * 100)
        if required
        else min(len(detected) * 10, 100)
    )

    suggestions = [
        f"Add projects or experience with {skill.title()}"
        for skill in missing
    ]

    if user_id:
        try:
            user = User.objects.get(id=user_id)

            ResumeAnalysis.objects.create(
                user=user,
                file_name=file_name,
                score=score,
                skills_found=detected,
                suggestions=suggestions,
                matched_skills=matched,
                missing_skills=missing,
                target_role=target_role,
            )

        except User.DoesNotExist:
            pass

    return {
        "score": score,
        "skills_found": detected,
        "suggestions": suggestions,
        "matched_skills": matched,
        "missing_skills": missing,
        "target_role": target_role,
    }