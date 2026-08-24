import logging
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from .skill_matcher import extract_skills

logger = logging.getLogger(__name__)

def calculate_jd_match(resume_text: str, jd_text: str):
    """
    Calculates a bespoke job match score by comparing the resume text
    and job description using TF-IDF cosine similarity and extracted skills.
    Returns (job_match_score, jd_missing_skills, jd_matched_skills).
    """
    if not resume_text or not jd_text:
        return 0, [], []

    # 1. Compute TF-IDF Cosine Similarity
    try:
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform([resume_text, jd_text])
        cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        cosine_sim_percentage = int(cosine_sim * 100)
    except Exception as e:
        logger.error(f"Error computing cosine similarity: {e}")
        cosine_sim_percentage = 0

    # 2. Extract Skills and compute gap analysis
    resume_skills = set(extract_skills(resume_text))
    jd_skills = set(extract_skills(jd_text))

    if not jd_skills:
        # If JD has no identifiable skills, rely purely on TF-IDF
        return cosine_sim_percentage, [], []

    matched = list(jd_skills.intersection(resume_skills))
    missing = list(jd_skills.difference(resume_skills))
    
    # 3. Combine scores
    # Weighting: 40% NLP text similarity, 60% exact skill match
    skill_match_percentage = int((len(matched) / len(jd_skills)) * 100)
    
    final_score = int((0.4 * cosine_sim_percentage) + (0.6 * skill_match_percentage))
    
    # Clamp score between 0 and 100
    final_score = max(0, min(100, final_score))
    
    return final_score, missing, matched
