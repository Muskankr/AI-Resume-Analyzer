from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import re
from collections import Counter
from datetime import datetime

# MOCK: In a real system, use SpaCy or NLTK
STOP_WORDS = {"the", "and", "a", "to", "of", "in", "i", "is", "that", "it", "on", "you", "this", "for", "but", "with", "are", "have", "be", "at", "or", "as", "was", "so", "if", "out", "not", "we", "my", "your", "can", "an"}

def extract_keywords(text):
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    return [w for w in words if w not in STOP_WORDS]

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_ats_density(request):
    data = request.data
    resume_text = data.get('resume_text', '')
    job_description = data.get('job_description', '')
    
    if not resume_text or not job_description:
        return Response({"error": "Missing resume or job description text."}, status=400)
    
    # 1. Extract Keywords
    resume_keywords = extract_keywords(resume_text)
    jd_keywords = extract_keywords(job_description)
    
    # 2. Compute Frequencies
    resume_counts = Counter(resume_keywords)
    jd_counts = Counter(jd_keywords)
    
    # 3. Identify Top Target Keywords from Job Description
    target_top = jd_counts.most_common(20)
    
    # 4. Compare
    analysis_results = []
    total_match = 0
    total_weight = sum([count for _, count in target_top])
    
    for word, target_freq in target_top:
        actual_freq = resume_counts.get(word, 0)
        match_score = min(1.0, actual_freq / (target_freq + 0.001))
        
        analysis_results.append({
            "keyword": word,
            "target_frequency": target_freq,
            "actual_frequency": actual_freq,
            "match_percentage": round(match_score * 100)
        })
        
        total_match += match_score * target_freq
        
    overall_match = min(100, round((total_match / total_weight) * 100)) if total_weight > 0 else 0
    
    return Response({
        "overall_score": overall_match,
        "keywords": analysis_results,
        "analyzed_at": datetime.now().isoformat()
    })
