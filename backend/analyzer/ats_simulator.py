import re
from typing import Dict, List, Any
from .section_headings import find_headings, SECTIONS
from .timeline import extract_ranges

class ATSProfile:
    id = ""
    name = ""
    description = ""
    
    def simulate(self, text: str, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

def extract_contact_info(text: str) -> Dict[str, bool]:
    has_email = bool(re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text))
    has_phone = bool(re.search(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text))
    return {"email": has_email, "phone": has_phone}

class WorkdaySimulator(ATSProfile):
    id = "workday"
    name = "Workday (Simulated)"
    description = "Approximates Workday's strict parsing. Relies heavily on exact chronological dates and standard headings. Known to struggle with ambiguous section names."
    
    def simulate(self, text: str, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        score = 100
        warnings = []
        recommendations = []
        detected_sections = []
        
        headings = find_headings(text)
        found_keys = {h.key for h in headings}
        
        # Check standard sections
        if "experience" not in found_keys:
            score -= 25
            warnings.append("Failed to detect an explicit 'Experience' section.")
            recommendations.append("Use standard headings like 'Work Experience' instead of creative variants.")
        else:
            detected_sections.append("Work Experience")
            
        if "education" not in found_keys:
            score -= 20
            warnings.append("Failed to detect an explicit 'Education' section.")
            recommendations.append("Ensure your education block is clearly labeled 'Education'.")
        else:
            detected_sections.append("Education")

        # Check dates
        dates = extract_ranges(text)
        if len(dates) < 2 and "experience" in found_keys:
            score -= 15
            warnings.append("Workday parser may fail to map employment dates accurately.")
            recommendations.append("Use standard date formats (e.g., MM/YYYY - MM/YYYY) for all roles.")
        
        # Contact
        contact = extract_contact_info(text)
        if not contact["email"] or not contact["phone"]:
            score -= 10
            warnings.append("Missing standard email or phone number formats.")
            
        return {
            "platform": self.name,
            "description": self.description,
            "compatibility_score": max(0, score),
            "detected_sections": detected_sections,
            "warnings": warnings,
            "recommendations": recommendations,
            "is_approximation": True
        }

class GreenhouseSimulator(ATSProfile):
    id = "greenhouse"
    name = "Greenhouse (Simulated)"
    description = "Approximates Greenhouse's modern parsing. Highly effective at extracting unstructured text and skills, but strictly requires easily identifiable contact information blocks."
    
    def simulate(self, text: str, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        score = 100
        warnings = []
        recommendations = []
        detected_sections = []
        
        # Contact is critical for Greenhouse
        contact = extract_contact_info(text)
        if not contact["email"]:
            score -= 30
            warnings.append("Critical: Email address not found. Greenhouse will fail to create a candidate profile properly.")
            recommendations.append("Place a standard email address at the very top of your resume.")
        if not contact["phone"]:
            score -= 10
            warnings.append("Phone number not detected.")
            
        # Skills
        skills = parsed_data.get("skills_found", [])
        if not skills:
            score -= 15
            warnings.append("No explicit skills detected for tagging.")
            recommendations.append("Include a dedicated 'Skills' section with comma-separated keywords.")
        else:
            detected_sections.append(f"Skills ({len(skills)} detected)")

        # Length check
        word_count = len(text.split())
        if word_count < 100:
            score -= 10
            warnings.append("Resume contains very little text, which may lead to poor search indexing.")
            
        return {
            "platform": self.name,
            "description": self.description,
            "compatibility_score": max(0, score),
            "detected_sections": detected_sections,
            "warnings": warnings,
            "recommendations": recommendations,
            "is_approximation": True
        }

class TaleoSimulator(ATSProfile):
    id = "taleo"
    name = "Taleo (Simulated)"
    description = "Approximates Taleo's legacy enterprise parsing. Rigid section sequencing and very sensitive to complex formatting, fonts, and excessively long resumes."
    
    def simulate(self, text: str, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        score = 100
        warnings = []
        recommendations = []
        detected_sections = []
        
        word_count = len(text.split())
        if word_count > 800:
            score -= 20
            warnings.append("Resume is too long (> 800 words). Taleo may truncate or fail to parse later sections.")
            recommendations.append("Condense your resume to focus on the most relevant 10 years of experience.")
            
        # Taleo hates weird characters
        if re.search(r'[^\x00-\x7F]+', text):
            score -= 10
            warnings.append("Detected non-standard/Unicode characters.")
            recommendations.append("Avoid complex icons, emojis, or non-standard bullet points.")
            
        headings = find_headings(text)
        found_keys = {h.key for h in headings}
        
        if "summary" in found_keys:
            detected_sections.append("Summary")
        if "experience" in found_keys:
            detected_sections.append("Experience")
        else:
            score -= 30
            warnings.append("Mandatory employment history block missing or unreadable.")
            
        return {
            "platform": self.name,
            "description": self.description,
            "compatibility_score": max(0, score),
            "detected_sections": detected_sections,
            "warnings": warnings,
            "recommendations": recommendations,
            "is_approximation": True
        }

# Registry
PROFILES = {
    "workday": WorkdaySimulator(),
    "greenhouse": GreenhouseSimulator(),
    "taleo": TaleoSimulator()
}

def get_simulator(profile_id: str) -> ATSProfile:
    return PROFILES.get(profile_id.lower())

def get_all_profiles() -> List[Dict[str, str]]:
    return [{"id": p.id, "name": p.name, "description": p.description} for p in PROFILES.values()]
