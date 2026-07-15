from rest_framework.decorators import api_view, parser_classes, permission_classes, throttle_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework import status
import pdfplumber
from django.conf import settings

from .models import ResumeAnalysis
from .serializers import SignupSerializer, ResumeAnalysisSerializer


class UploadRateThrottle(SimpleRateThrottle):
    scope = "upload"

    def get_rate(self):
        return getattr(settings, "RESUME_UPLOAD_RATE", "10/hour")

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)  # client IP
        return self.cache_format % {"scope": self.scope, "ident": ident}

skills_list = [
    "python", "django", "react", "javascript", "sql",
    "html", "css", "git", "github", "flask",
    "machine learning", "data analysis",
    "excel", "microsoft office", "ms office",
    "c", "c++", "java"
]

ROLE_SKILL_MATRICES = {
    "Frontend Developer": ["html", "css", "javascript", "react", "git", "github"],
    "Backend Developer": ["python", "django", "flask", "sql", "git", "github"],
    "Data Analyst": ["python", "excel", "sql", "data analysis", "machine learning"]
}


@api_view(["POST"])
@permission_classes([AllowAny])
def signup(request):
    serializer = SignupSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({"detail": "Account created."}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([AllowAny])
@throttle_classes([UploadRateThrottle])
def upload_resume(request):
    file = request.FILES.get("file")
    target_role = request.data.get("role", None)
    file_name = file.name if file else "unknown"

    text = ""
    with pdfplumber.open(file) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text

    text = text.lower()

    detected_skills = [s for s in skills_list if s.lower() in text]

    matched_skills = []
    missing_skills = []

    if target_role in ROLE_SKILL_MATRICES:
        required_skills = ROLE_SKILL_MATRICES[target_role]

        for skill in required_skills:
            if skill in detected_skills:
                matched_skills.append(skill)
            else:
                missing_skills.append(skill)

        # Dynamic role-based score
        score = int((len(matched_skills) / len(required_skills)) * 100) if required_skills else 100

        # Dynamic suggestions
        suggestions = [
            f"Add experience or projects with {skill.upper() if skill in ['html', 'css', 'sql', 'git'] else skill.capitalize()}"
            for skill in missing_skills
        ]
    else:
        score = min(len(detected_skills) * 10, 100)

        suggestions = []
        if "python" not in detected_skills:
            suggestions.append("Add Python projects")
        if "django" not in detected_skills:
            suggestions.append("Mention Django experience")
        if "react" not in detected_skills:
            suggestions.append("Add frontend skills like React")

    # Save to DB only for authenticated users
    if request.user and request.user.is_authenticated:
        ResumeAnalysis.objects.create(
            user=request.user,
            file_name=file_name,
            score=score,
            skills_found=detected_skills,
            suggestions=suggestions,
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            target_role=target_role or "",
        )

    return Response({
        "score": score,
        "skills_found": detected_skills,
        "suggestions": suggestions,
        "target_role": target_role,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def analysis_history(request):
    analyses = ResumeAnalysis.objects.filter(user=request.user)
    serializer = ResumeAnalysisSerializer(analyses, many=True)
    return Response(serializer.data)
