from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import ResumeAnalysis, InterviewSession, InterviewQuestion
import json
import random
from django.utils import timezone

# Mock question banks for demo purposes. In a real app, this might call an LLM (like Gemini or OpenAI).
TECHNICAL_POOL = {
    "python": [
        "Explain the difference between a list and a tuple in Python.",
        "How does Python handle memory management?",
        "What are decorators in Python and how do you use them?",
        "Explain the concept of list comprehensions with an example.",
        "What is the Global Interpreter Lock (GIL) in Python?"
    ],
    "react": [
        "What is the Virtual DOM and how does React use it?",
        "Explain the difference between useEffect and useLayoutEffect.",
        "How do you manage state in a large React application?",
        "Describe the component lifecycle in a class component versus hooks.",
        "What are React hooks, and what are their rules?"
    ],
    "django": [
        "Explain the Django MVT architecture.",
        "What is middleware in Django and how does it work?",
        "How do you handle migrations in a production Django environment?",
        "Explain the select_related and prefetch_related methods in Django ORM.",
        "How does Django protect against Cross-Site Request Forgery (CSRF)?"
    ],
    "javascript": [
        "Explain closures in JavaScript.",
        "What is the event loop and how does it handle asynchronous operations?",
        "Differentiate between let, const, and var.",
        "Explain the concept of 'hoisting' in JavaScript.",
        "What are Promises and how do they compare to callbacks?"
    ],
    "docker": [
        "What is the difference between a Docker image and a container?",
        "Explain the purpose of a Dockerfile.",
        "How do you share data between Docker containers?",
        "What is docker-compose and when would you use it?",
        "How do you reduce the size of a Docker image?"
    ]
}

BEHAVIORAL_POOL = [
    "Tell me about a time you had to work with a difficult team member. How did you handle it?",
    "Describe a situation where you had to learn a new technology quickly.",
    "Tell me about a project you're particularly proud of.",
    "Describe a time when you missed a deadline or failed to meet an expectation. What did you learn?",
    "How do you prioritize tasks when you have multiple deadlines approaching?",
    "Tell me about a time you disagreed with a manager or senior engineer's technical decision.",
    "How do you handle receiving critical feedback on your code reviews?"
]

SITUATIONAL_POOL = [
    "You discover a critical bug in production on a Friday afternoon. What steps do you take?",
    "You're tasked with building a feature that you have never done before and lack documentation. What do you do?",
    "Your current project is falling behind schedule. How do you communicate this to stakeholders?",
    "A team member is constantly pushing code without running tests first, breaking the build. How do you address this?",
    "You have to choose between two different technologies for a new microservice. How do you decide?"
]

def generate_questions_for_skills(skills):
    questions = []
    # Identify skills we have specific questions for
    known_skills = [s.lower() for s in skills if s.lower() in TECHNICAL_POOL]
    
    for skill in known_skills:
        # Pick 1-2 random questions per found skill
        selected_qs = random.sample(TECHNICAL_POOL[skill], min(2, len(TECHNICAL_POOL[skill])))
        for q in selected_qs:
            questions.append({
                "type": "technical",
                "text": q,
                "skill": skill,
                "suggestions": [f"Demonstrate understanding of {skill} core concepts.", "Provide a concise technical example.", "Mention edge cases if applicable."]
            })
            
    # Add some generic technical questions if we didn't find enough
    while len(questions) < 3 and known_skills:
        random_skill = random.choice(known_skills)
        questions.append({
            "type": "technical",
            "text": f"How would you architect a basic application using {random_skill}?",
            "skill": random_skill,
            "suggestions": ["Break down the system into components.", "Discuss data flow.", "Mention scalability."]
        })

    return questions

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_interview(request):
    """
    Generates a new interview session based on the user's latest resume analysis
    or provided role/skills in the body.
    """
    user = request.user
    
    # Get latest analysis for context
    analysis = ResumeAnalysis.objects.filter(user=user).order_by('-created_at').first()
    
    target_role = request.data.get('target_role') or (analysis.target_role if analysis else 'Software Engineer')
    skills = request.data.get('skills')
    
    if skills is None:
        skills = analysis.skills_found if analysis else ['javascript', 'python', 'react']
        
    session_count = InterviewSession.objects.filter(user=user).count()

    session = InterviewSession.objects.create(
        user=user,
        analysis=analysis,
        target_role=target_role
    )
    
    # 1. Generate Technical Questions
    tech_qs = generate_questions_for_skills(skills)
    
    # 2. Pick Behavioral Questions (2-3)
    beh_qs = random.sample(BEHAVIORAL_POOL, 3)
    beh_dicts = [{"type": "behavioral", "text": q, "skill": None, "suggestions": ["Use the STAR method (Situation, Task, Action, Result).", "Focus on your specific contributions.", "Highlight soft skills."]} for q in beh_qs]
    
    # 3. Pick Situational Questions (1-2)
    sit_qs = random.sample(SITUATIONAL_POOL, 2)
    sit_dicts = [{"type": "situational", "text": q, "skill": None, "suggestions": ["Think out loud.", "Clarify assumptions before proposing solutions.", "Consider tradeoffs."]} for q in sit_qs]
    
    all_qs = tech_qs[:5] + beh_dicts + sit_dicts
    random.shuffle(all_qs) # Mix them up
    
    # Ensure max 8 questions per session
    all_qs = all_qs[:8]
    
    # Save to db
    db_questions = []
    for q_data in all_qs:
        db_qs = InterviewQuestion.objects.create(
            session=session,
            question_text=q_data['text'],
            question_type=q_data['type'],
            related_skill=q_data['skill'],
            suggested_answer_points=q_data['suggestions']
        )
        db_questions.append(db_qs)
        
    response_data = {
        "session_id": session.id,
        "target_role": session.target_role,
        "created_at": session.created_at,
        "questions": [
            {
                "id": q.id,
                "text": q.question_text,
                "type": q.question_type,
                "skill": q.related_skill,
                "suggestions": q.suggested_answer_points
            } for q in db_questions
        ]
    }
    
    return Response(response_data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_interview_results(request, session_id):
    """
    Saves the user's confidence ratings for an interview session.
    Expected body:
    {
      "results": [
         {"question_id": 1, "confidence": 8},
         ...
      ]
    }
    """
    try:
        session = InterviewSession.objects.get(id=session_id, user=request.user)
    except InterviewSession.DoesNotExist:
        return Response({"error": "Session not found"}, status=404)
        
    results = request.data.get('results', [])
    if not results:
        return Response({"error": "No results provided"}, status=400)
        
    total_confidence = 0
    count = 0
    
    for item in results:
        q_id = item.get('question_id')
        confidence = item.get('confidence')
        
        try:
            question = InterviewQuestion.objects.get(id=q_id, session=session)
            question.user_confidence_rating = confidence
            question.save()
            total_confidence += confidence
            count += 1
        except InterviewQuestion.DoesNotExist:
            continue
            
    if count > 0:
        session.overall_confidence_score = total_confidence // count
        session.completed_at = timezone.now()
        session.save()
        
    return Response({"message": "Results saved successfully", "overall_score": session.overall_confidence_score})
