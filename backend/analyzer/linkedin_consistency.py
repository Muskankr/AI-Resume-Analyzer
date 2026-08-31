import logging
from typing import Dict, List, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from datetime import date
from .timeline import extract_ranges, DateRange
from .url_fetcher import fetch_with_redirect_guard, UnsafeURLError
import requests

logger = logging.getLogger(__name__)

def fetch_linkedin_public_profile(url: str) -> str:
    """
    Attempt to fetch a LinkedIn public profile URL.
    Returns the text content if successful.
    """
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/115.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
    }
    try:
        response = fetch_with_redirect_guard(url, headers=headers, timeout=10)
        if response.status_code == 200:
            text = response.text
            if "sign in" in text.lower()[:2000] or "join linkedin" in text.lower()[:2000]:
                raise ValueError("LinkedIn requested authentication. Please paste the profile text manually to respect LinkedIn's terms of service.")
            
            # Simple extraction from HTML
            import re
            text_only = re.sub(r'<[^>]+>', ' ', text)
            text_only = re.sub(r'\s+', ' ', text_only)
            return text_only
        else:
            raise ValueError(f"Failed to fetch LinkedIn profile: HTTP {response.status_code}")
    except UnsafeURLError:
        raise ValueError("Invalid or unsafe URL provided.")
    except Exception as e:
        raise ValueError(f"Could not fetch LinkedIn profile. Please paste the text manually. Error: {str(e)}")


def get_context_for_range(text: str, line_number: int) -> str:
    lines = text.splitlines()
    start = max(0, line_number - 2)
    end = min(len(lines), line_number + 2)
    return " ".join([lines[i].strip() for i in range(start, end) if lines[i].strip()])

def check_consistency(resume_text: str, linkedin_text: str) -> Dict[str, Any]:
    today = date.today()
    resume_ranges = extract_ranges(resume_text or "")
    linkedin_ranges = extract_ranges(linkedin_text or "")

    mismatches = []
    
    vectorizer = TfidfVectorizer(stop_words='english')
    
    matched_linkedin_indices = set()
    
    for r_idx, r_range in enumerate(resume_ranges):
        r_start = r_range.start_index()
        r_end = r_range.end_index(today)
        r_context = get_context_for_range(resume_text, r_range.line_number)
        
        best_match = None
        best_overlap = 0
        best_l_idx = -1
        
        for l_idx, l_range in enumerate(linkedin_ranges):
            if l_idx in matched_linkedin_indices:
                continue
            l_start = l_range.start_index()
            l_end = l_range.end_index(today)
            
            # calculate overlap in months
            overlap_start = max(r_start, l_start)
            overlap_end = min(r_end, l_end)
            overlap = max(0, overlap_end - overlap_start + 1)
            
            if overlap > best_overlap:
                best_overlap = overlap
                best_match = l_range
                best_l_idx = l_idx
                
        if best_match and best_overlap >= 3:
            matched_linkedin_indices.add(best_l_idx)
            l_context = get_context_for_range(linkedin_text, best_match.line_number)
            
            # Check text similarity
            try:
                tfidf_matrix = vectorizer.fit_transform([r_context, l_context])
                cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            except Exception:
                cosine_sim = 0
                
            if cosine_sim < 0.1:
                mismatches.append({
                    "type": "Title/Company Mismatch",
                    "resume_evidence": r_context,
                    "linkedin_evidence": l_context,
                    "message": f"Dates match ({r_range.text}) but the job title or company seems entirely different."
                })
            else:
                r_diff = abs(r_start - best_match.start_index()) + abs(r_end - best_match.end_index(today))
                if r_diff > 3:
                    mismatches.append({
                        "type": "Date Mismatch",
                        "resume_evidence": f"{r_context} ({r_range.text})",
                        "linkedin_evidence": f"{l_context} ({best_match.text})",
                        "message": f"Similar role found, but dates differ by {r_diff} months."
                    })
        else:
            mismatches.append({
                "type": "Missing from LinkedIn",
                "resume_evidence": f"{r_context} ({r_range.text})",
                "linkedin_evidence": "",
                "message": "This role appears on your resume but could not be confidently matched on LinkedIn."
            })
            
    for l_idx, l_range in enumerate(linkedin_ranges):
        if l_idx not in matched_linkedin_indices:
            l_context = get_context_for_range(linkedin_text, l_range.line_number)
            mismatches.append({
                "type": "Missing from Resume",
                "resume_evidence": "",
                "linkedin_evidence": f"{l_context} ({l_range.text})",
                "message": "This role appears on LinkedIn but could not be confidently matched on your resume."
            })

    return {
        "mismatches": mismatches,
        "resume_roles_found": len(resume_ranges),
        "linkedin_roles_found": len(linkedin_ranges),
    }
