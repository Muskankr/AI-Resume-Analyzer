import random
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

def _generate_negotiation_script(role: str, exp_level: str, compensation_type: str) -> str:
    """Generates a tailored negotiation script based on leverage points."""
    base_script = f"Dear Hiring Team,\n\nThank you so much for the offer to join as a {role}. I am incredibly excited about the prospect of joining the team."
    
    if compensation_type == 'base':
        leverage = f"Given my {exp_level} level experience and the specialized skills I bring to the table, I was hoping to discuss the base salary component. Based on my industry research for similar roles in this market, I would be more comfortable with a base salary closer to [Insert Target + 10%]."
    elif compensation_type == 'equity':
        leverage = f"While the base salary aligns with my expectations, I am looking to establish a strong long-term alignment with the company's growth. Given my {exp_level} capacity, would it be possible to explore an increase in the initial equity grant by [X] RSUs/Options?"
    else:
        leverage = f"I am very happy with the base salary, but as I will be leaving behind an expected performance bonus at my current company, I would like to request a sign-on bonus of [X] to help bridge the transition."

    conclusion = "I am very enthusiastic about the work you are doing and I am confident that we can find a mutually agreeable number. Thank you again for your time and the offer.\n\nBest regards,\n[Your Name]"
    
    return f"{base_script}\n\n{leverage}\n\n{conclusion}"

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_salary_insights(request):
    """
    Mock endpoint to dynamically simulate salary bands, equity ranges, and 
    negotiation scripts based on the provided Job Title and Years of Experience.
    """
    job_title = request.data.get('job_title', 'Software Engineer').title()
    experience_years = int(request.data.get('experience_years', 0))
    location = request.data.get('location', 'Remote')

    # Extremely naive logic for mock metrics
    base_multiplier = 70000
    if "Senior" in job_title or "Lead" in job_title or experience_years > 5:
        base_multiplier = 130000
        exp_level = "senior"
    elif experience_years > 2:
        base_multiplier = 95000
        exp_level = "mid"
    else:
        exp_level = "junior"

    if 'San Francisco' in location or 'New York' in location:
        base_multiplier = int(base_multiplier * 1.3)
    
    target_50th = base_multiplier + (experience_years * 2500)
    target_25th = int(target_50th * 0.85)
    target_75th = int(target_50th * 1.15)
    target_90th = int(target_50th * 1.30)

    # Construct Chart Data points
    distribution_curve = [
        {"range": f"${target_25th//1000}k", "probability": 15},
        {"range": f"${(target_25th + target_50th)//2000}k", "probability": 30},
        {"range": f"${target_50th//1000}k", "probability": 45},
        {"range": f"${(target_50th + target_75th)//2000}k", "probability": 30},
        {"range": f"${target_75th//1000}k", "probability": 10},
        {"range": f"${target_90th//1000}k", "probability": 5},
    ]

    base_script = _generate_negotiation_script(job_title, exp_level, 'base')
    equity_script = _generate_negotiation_script(job_title, exp_level, 'equity')
    bonus_script = _generate_negotiation_script(job_title, exp_level, 'bonus')

    payload = {
        "title": job_title,
        "location": location,
        "p25": target_25th,
        "p50": target_50th,
        "p75": target_75th,
        "distribution": distribution_curve,
        "scripts": {
            "base": base_script,
            "equity": equity_script,
            "bonus": bonus_script
        }
    }

    return Response(payload)
