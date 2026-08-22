import re
from datetime import datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

def _extract_keywords(text: str) -> list:
    """Basic keyword extraction based on common skills lookup."""
    common_skills = [
        "python", "javascript", "react", "django", "node.js", "aws", "docker", "kubernetes",
        "sql", "machine learning", "data analysis", "agile", "leadership", "communication"
    ]
    found = []
    text_lower = text.lower()
    for skill in common_skills:
        if skill in text_lower:
            found.append(skill.title())
    return found

def _generate_template_professional(keywords: list, extra_context: dict) -> str:
    date_str = datetime.now().strftime("%B %d, %Y")
    skills_context = ", ".join(keywords[:4]) if keywords else "my diverse technical and soft skills"
    
    return f"""{date_str}

Dear Hiring Manager,

I am writing to express my strong interest in the open position at your esteemed organization. With a proven track record of delivering high-quality results and an extensive background in {skills_context}, I am confident in my ability to immediately contribute to your team.

Throughout my career, I have consistently demonstrated a keen ability to navigate complex challenges, drive innovation, and foster collaborative environments. The responsibilities outlined in your job description align perfectly with the trajectory of my career and my professional aspirations. Specifically, my experience dealing with modern development paradigms positions me as an ideal candidate to propel your upcoming initiatives forward.

I take pride in my organized approach and rigorous focus on performance, scalability, and code quality. More importantly, I am deeply aligned with the cultural values evident in your organization's work, and I am excited by the prospect of bringing my dedication to your mission.

Thank you for taking the time to review my application. I have attached my resume, which further details my professional journey and accomplishments. I welcome the opportunity to discuss how my qualifications align with your needs in an interview.

Sincerely,

[Your Name]
[Your Contact Information]
"""

def _generate_template_creative(keywords: list, extra_context: dict) -> str:
    date_str = datetime.now().strftime("%B %d, %Y")
    skills_context = ", ".join(keywords[:3]) if keywords else "cutting-edge tools"
    
    return f"""{date_str}

Hi Design & Engineering Team,

When I read the job description for this role, I knew I had to apply. You are looking for a forward-thinking problem solver who thrives at the intersection of creativity and logic—and that describes me perfectly. My hands-on expertise with {skills_context} has allowed me to build solutions that don't just work, but delight users.

I don't just write code; I craft experiences. My work revolves around questioning the status quo and finding elegant solutions to traditionally clunky problems. What drew me to your company is your relentless focus on innovation and user-centric design. It’s rare to find a team so committed to pushing boundaries, and I would love nothing more than to bring my passion and unique perspective to your projects.

I've attached my resume highlighting my previous work, but what it doesn't show is my unwavering enthusiasm to tackle your biggest challenges head-on. Let’s connect and talk about how we can build something amazing together.

Best regards,

[Your Name]
[Your Contact Information]
"""

def _generate_template_direct(keywords: list, extra_context: dict) -> str:
    date_str = datetime.now().strftime("%B %d, %Y")
    
    return f"""{date_str}

Dear Hiring Team,

I am applying for the open role at your company. With a strong foundation in modern technical practices and a results-driven mindset, my qualifications are an excellent match for your requirements.

My background involves rigorous application of core engineering principles to deliver impactful products on tight deadlines. I adapt quickly to new environments and am fully capable of ramping up immediately to solve your most pressing architectural and operational constraints. 

Please find my resume attached for a detailed breakdown of my professional history. I look forward to discussing my application with you.

Regards,

[Your Name]
[Your Contact Information]
"""

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_cover_letter(request):
    """
    Analyzes the user's resume and job description to deterministically synthesize 
    a highly tailored cover letter simulating LLM behavior.
    """
    resume_text = request.data.get('resume_text', '')
    job_description = request.data.get('job_description', '')
    tone = request.data.get('tone', 'professional').lower()
    
    if not resume_text or not job_description:
        return Response({'error': 'Both resume_text and job_description are required.'}, status=400)
    
    # Extract intersection of skills to inform templating
    resume_skills = _extract_keywords(resume_text)
    jd_skills = _extract_keywords(job_description)
    intersection = list(set(resume_skills) & set(jd_skills))
    
    # Use intersection if available, fallback to resume skills, then defaults
    context_skills = intersection if intersection else resume_skills
    
    extra_context = {
        'jd_length': len(job_description),
        'resume_length': len(resume_text)
    }

    # Deterministic Tone Routing
    if tone == 'creative':
        letter_content = _generate_template_creative(context_skills, extra_context)
    elif tone == 'direct':
        letter_content = _generate_template_direct(context_skills, extra_context)
    else:
        letter_content = _generate_template_professional(context_skills, extra_context)
        
    return Response({
        "cover_letter": letter_content,
        "tone_used": tone,
        "keywords_integrated": context_skills,
        "generated_at": datetime.now().isoformat()
    })
