import os
import pdfplumber
from django.contrib.auth import get_user_model
from .models import ResumeAnalysis
from .skill_matcher import extract_skills

User = get_user_model()

ROLE_SKILLS = {
    "Frontend Developer": [
        "html", "css", "javascript", "typescript", "react",
        "next.js", "tailwind", "git", "github", "webpack",
    ],

    "Backend Developer": [
        "python", "django", "flask", "fastapi", "node.js", "express.js",
        "sql", "mysql", "postgresql", "mongodb", "docker", "git", "github",
    ],

    "Data Analyst": [
        "python", "sql", "excel", "machine learning", "deep learning",
        "data analysis", "pandas", "numpy", "matplotlib", "tensorflow",
        "scikit-learn", "jupyter",
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

    raw_text = text
    detected = extract_skills(text)

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

            analysis_record, created = ResumeAnalysis.objects.update_or_create(
                user=user,
                file_name=file_name,          
                target_role=target_role,
                defaults={
                    'score': score,
                    'skills_found': detected,
                    'suggestions': suggestions,
                    'matched_skills': matched,
                    'missing_skills': missing,
                }
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
        "resume_text": raw_text,
    }