from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import ResumeAnalysis, CoverLetter
import json
import datetime

def generate_mock_cover_letter(skills, role, tone, user_name="Applicant", company_name="the company"):
    """
    Generates a localized, highly specific cover letter utilizing the parsed skills 
    to make the generation realistic and mock an AI generation output.
    """
    date_str = datetime.datetime.now().strftime("%B %d, %Y")
    top_skills = ", ".join(skills[:3]) if skills else "my varied technical background"
    
    if tone == 'enthusiastic':
        opening = f"I am incredibly thrilled to apply for the {role} position at {company_name}!"
        closing = f"I would be absolutely delighted to discuss how my passion for {top_skills} can help {company_name} achieve its goals. Thank you so much for your time and consideration."
    elif tone == 'confident':
        opening = f"I am writing to express my strong interest in the {role} role at {company_name}. My proven track record makes me an ideal candidate for this position."
        closing = f"I am confident that my expertise in {top_skills} will deliver immediate value to {company_name}. I look forward to discussing my qualifications with you."
    elif tone == 'casual':
        opening = f"Hi there! I saw the {role} opening at {company_name} and knew I had to apply."
        closing = f"I'd love to chat more about how my background in {top_skills} is a great match for your team. Thanks for checking out my application!"
    else: # professional
        opening = f"Please accept this letter as an expression of my interest in the {role} position at {company_name}."
        closing = f"I would welcome the opportunity to discuss how my background in {top_skills} aligns with the needs of {company_name}. Thank you for your time and consideration."
        
    body = (
        f"{date_str}\n\n"
        f"Dear Hiring Manager,\n\n"
        f"{opening}\n\n"
        f"Throughout my career, I have developed a strong proficiency in {top_skills}. "
        f"I have consistently sought out opportunities to leverage these abilities to solve complex problems and drive results. "
        f"My recent experiences have not only sharpened my technical acumen in {skills[0] if skills else 'my core areas'}, "
        f"but have also taught me the importance of collaboration, adaptability, and continuous learning.\n\n"
        f"When reviewing the requirements for the {role} role, I was struck by how well my background aligns with your needs. "
        f"I am particularly drawn to {company_name}'s mission and the innovative work your engineering teams are doing.\n\n"
        f"{closing}\n\n"
        f"Sincerely,\n"
        f"{user_name}\n"
    )
    
    return body

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_cover_letter(request):
    """
    API endpoint to generate a personalized cover letter.
    Expects JSON payload with:
    - analysis_id: (Optional) ID of previous ResumeAnalysis to use skills from
    - target_role: The job title to apply for
    - company_name: (Optional) Company name
    - tone: professional | enthusiastic | confident | casual
    - job_description: (Optional) 
    """
    user = request.user
    data = request.data
    
    target_role = data.get('target_role', 'Software Engineer')
    company_name = data.get('company_name', 'your company')
    tone = data.get('tone', 'professional')
    job_desc = data.get('job_description', '')
    analysis_id = data.get('analysis_id')
    
    # Try to find user's skills
    skills_to_use = []
    analysis_obj = None
    
    if analysis_id:
        try:
            analysis_obj = ResumeAnalysis.objects.get(id=analysis_id, user=user)
            skills_to_use = analysis_obj.skills_found
        except ResumeAnalysis.DoesNotExist:
            pass
            
    if not skills_to_use:
        # Fallback to the latest analysis
        analysis_obj = ResumeAnalysis.objects.filter(user=user).order_by('-created_at').first()
        if analysis_obj:
            skills_to_use = analysis_obj.skills_found
            
    if not skills_to_use:
        skills_to_use = ['Python', 'React', 'Problem Solving', 'Data Analysis'] # Fallback default
        
    full_name = f"{user.first_name} {user.last_name}".strip()
    if not full_name:
        full_name = user.username
        
    generated_text = generate_mock_cover_letter(
        skills=skills_to_use,
        role=target_role,
        tone=tone,
        user_name=full_name,
        company_name=company_name
    )
    
    # Save the generated cover letter
    cover_letter = CoverLetter.objects.create(
        user=user,
        analysis=analysis_obj,
        target_role=target_role,
        job_description=job_desc,
        tone=tone,
        generated_content=generated_text
    )
    
    return Response({
        "cover_letter_id": cover_letter.id,
        "content": cover_letter.generated_content,
        "tone": cover_letter.tone,
        "target_role": cover_letter.target_role,
        "created_at": cover_letter.created_at
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_cover_letters(request):
    letters = CoverLetter.objects.filter(user=request.user).order_by('-created_at')
    
    results = []
    for l in letters:
        results.append({
            "id": l.id,
            "target_role": l.target_role,
            "tone": l.tone,
            "snippet": l.generated_content[:150] + "...",
            "created_at": l.created_at
        })
        
    return Response({"cover_letters": results})
