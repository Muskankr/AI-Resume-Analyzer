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

PIPELINE_STAGES = [
    {"stage": "extracting", "label": "Extracting text from document", "percent": 25},
    {"stage": "matching", "label": "Detecting & matching skills", "percent": 60},
    {"stage": "scoring", "label": "Generating ATS score & recommendations", "percent": 90},
    {"stage": "done", "label": "Analysis complete", "percent": 100},
]


def analyze_resume(file_path, target_role, file_name="resume.pdf",user_id=None,job_description=None):

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

    analysis_id = None

    if user_id:
        try:
            user = User.objects.get(id=user_id)

            # Every upload is kept as its own version so users can later
            # compare "before" and "after" edits of the same resume. Using
            # update_or_create keyed on file_name/role/job_description would
            # silently overwrite the previous analysis and destroy the
            # version history the comparison feature depends on.
            analysis_record = ResumeAnalysis.objects.create(
                user=user,
                file_name=file_name,
                target_role=target_role,
                job_description=job_description,
                score=score,
                skills_found=detected,
                suggestions=suggestions,
                matched_skills=matched,
                missing_skills=missing,
                resume_text=raw_text,
            )
            analysis_id = analysis_record.id

        except User.DoesNotExist:
            pass

    progress_info = {
        "current_stage": "done",
        "percent": 100,
        "stages": PIPELINE_STAGES,
    }

    track_comparisons = {}
    for role, req_skills in ROLE_SKILLS.items():
        role_matched = [s for s in req_skills if s in detected]
        role_missing = [s for s in req_skills if s not in detected]
        role_score = (
            int(len(role_matched) / len(req_skills) * 100)
            if req_skills
            else min(len(detected) * 10, 100)
        )
        role_suggestions = [f"Add projects or experience with {s.title()}" for s in role_missing]
        
        track_comparisons[role] = {
            "score": role_score,
            "matched_skills": role_matched,
            "missing_skills": role_missing,
            "suggestions": role_suggestions,
        }

    return {
        "id": analysis_id,
        "score": score,
        "skills_found": detected,
        "suggestions": suggestions,
        "matched_skills": matched,
        "missing_skills": missing,
        "target_role": target_role,
        "resume_text": raw_text,
        "progress": progress_info,
        "pipeline_stages": PIPELINE_STAGES,
        "track_comparisons": track_comparisons,
    }