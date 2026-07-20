import os
import pdfplumber
from django.contrib.auth import get_user_model
from .models import ResumeAnalysis
from .skill_matcher import extract_skills


def _extract_text_from_file(file_path):
    if not file_path:
        return ""

    if file_path.lower().endswith(".pdf"):
        try:
            text = ""
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted
            return text
        except (FileNotFoundError, OSError, ValueError):
            return ""

    if not os.path.exists(file_path):
        return ""

    with open(file_path, "r", encoding="utf-8", errors="ignore") as handle:
        return handle.read()

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


def analyze_resume(
    file_path,
    target_role,
    file_name="resume.pdf",
    user_id=None,
    job_description=None,
    job_description_file_path=None,
):

    text = ""

    try:
        text = _extract_text_from_file(file_path)

    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

    raw_text = text
    detected = extract_skills(text)

    job_description_text = job_description or ""
    if job_description_file_path:
        job_description_text = _extract_text_from_file(job_description_file_path)

    jd_skills_found = extract_skills(job_description_text)
    jd_matching_skills = [skill for skill in jd_skills_found if skill in detected]
    jd_missing_skills = [skill for skill in jd_skills_found if skill not in detected]
    if not jd_matching_skills and jd_skills_found:
        jd_matching_skills = [skill for skill in detected if skill in jd_skills_found]
        jd_missing_skills = [skill for skill in jd_skills_found if skill not in detected]
    jd_score = round((len(jd_matching_skills) / len(jd_skills_found) * 100) if jd_skills_found else 0)
    jd_suggestions = [
        f"Add evidence of {skill.lower()} to better align with the job description."
        for skill in jd_missing_skills
    ]

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

    if job_description_file_path and os.path.exists(job_description_file_path):
        os.remove(job_description_file_path)

    return {
        "id": analysis_id,
        "score": score,
        "skills_found": detected,
        "suggestions": suggestions,
        "matched_skills": matched,
        "missing_skills": missing,
        "target_role": target_role,
        "resume_text": raw_text,
        "job_description_match_score": jd_score,
        "jd_matching_skills": jd_matching_skills,
        "jd_missing_skills": jd_missing_skills,
        "jd_skills_found": jd_skills_found,
        "ats_keyword_coverage": f"{jd_score}%",
        "jd_suggestions": jd_suggestions,
    }