from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
import pdfplumber

skills_list = [
    "python","django","react","javascript","sql",
    "html","css","git","github","flask",
    "machine learning","data analysis",
    "excel","microsoft office","ms office",
    "c","c++","java"
]

# Acceptance Criteria: Predefined skill sets for at least 3 roles
ROLE_SKILL_MATRICES = {
    "Frontend Developer": ["html", "css", "javascript", "react", "git", "github"],
    "Backend Developer": ["python", "django", "flask", "sql", "git", "github"],
    "Data Analyst": ["python", "excel", "sql", "data analysis", "machine learning"]
}

@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def upload_resume(request):
    file = request.FILES.get("file")
    # Acceptance Criteria: Endpoint accepts a target role parameter
    target_role = request.data.get("role", None)

    text = ""
    with pdfplumber.open(file) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text

    text = text.lower()
    print(text)   # debug

    detected_skills = []
    for skill in skills_list:
        if skill.lower() in text:
            detected_skills.append(skill)

    score = len(detected_skills) * 10
    if score > 100:
        score = 100

    suggestions = []
    if "python" not in detected_skills:
        suggestions.append("Add Python projects")
    if "django" not in detected_skills:
        suggestions.append("Mention Django experience")
    if "react" not in detected_skills:
        suggestions.append("Add frontend skills like React")


    # TEMPORARY TESTING BLOCK FOR ISSUE #6
    # Overwrites detected_skills with 50 fake items to verify UI layout boundaries
    detected_skills = [f"Skill-{i}" for i in range(1, 51)]
    # --- NEW SKILL GAP ANALYSIS LOGIC ---
    matched_skills = []
    missing_skills = []

    if target_role in ROLE_SKILL_MATRICES:
        required_skills = ROLE_SKILL_MATRICES[target_role]
        for skill in required_skills:
            if skill in detected_skills:
                matched_skills.append(skill)
            else:
                missing_skills.append(skill)

    return Response({
        "score": score,
        "skills_found": detected_skills,
        "suggestions": suggestions,
        "target_role": target_role,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills
    })
    