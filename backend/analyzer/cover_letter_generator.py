import os
import logging
from typing import Dict, Any
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

class CoverLetterGenerator:
    """
    Generates a personalized cover letter by matching resume evidence to a job description.
    Uses an LLM (OpenAI by default) via REST API to ensure no extra dependencies are needed.
    """
    def __init__(self, api_key: str = None, model: str = "gpt-4o-mini"):
        self.api_key = api_key or getattr(settings, 'OPENAI_API_KEY', None)
        self.model = getattr(settings, 'LLM_MODEL_NAME', model)
        self.endpoint = getattr(settings, 'OPENAI_ENDPOINT', "https://api.openai.com/v1/chat/completions")

    def build_prompt(self, resume_text: str, job_description: str) -> str:
        return f"""You are an expert career coach and professional cover letter writer.
Your task is to generate a personalized cover letter draft.

TARGET JOB DESCRIPTION:
{job_description}

CANDIDATE RESUME:
{resume_text}

ANTI-FABRICATION RULES (CRITICAL):
1. DO NOT invent any companies, job titles, employment history, degrees, certifications, metrics, or technologies that are not explicitly present in the resume.
2. If the candidate does not have a skill required by the JD, do not claim they do. You may emphasize transferable skills if appropriate.
3. The generated text MUST be clearly marked at the very top with "[AI-GENERATED DRAFT - PLEASE REVIEW AND EDIT]".
4. Do not hallucinate enthusiasm for a specific company if the company name is not mentioned in the JD.

Format: Return ONLY the text of the cover letter.
"""

    def generate(self, resume_text: str, job_description: str) -> str:
        if not self.api_key:
            raise ValueError("AI provider is not configured (API key missing).")

        prompt = self.build_prompt(resume_text, job_description)
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are a professional cover letter writer that strictly follows anti-fabrication guidelines."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 1000
        }

        try:
            response = requests.post(self.endpoint, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error calling LLM provider: {str(e)}")
            raise RuntimeError("Failed to generate cover letter due to AI service error.")
        except (KeyError, IndexError, ValueError) as e:
            logger.error(f"Invalid response format from LLM: {str(e)}")
            raise RuntimeError("Failed to parse AI response.")

    def validate_claims(self, generated_text: str, resume_text: str) -> Dict[str, Any]:
        """
        Validates the generated claims. In a full robust implementation, this could use 
        another LLM call to verify zero hallucinations. For now, we perform basic string checks 
        and provide standard warnings.
        """
        warnings = []
        # Basic check to ensure the disclaimer is present
        if "[AI-GENERATED DRAFT - PLEASE REVIEW AND EDIT]" not in generated_text:
            generated_text = "[AI-GENERATED DRAFT - PLEASE REVIEW AND EDIT]\n\n" + generated_text
            warnings.append("Disclaimer was missing and has been prepended.")
            
        return {
            "is_valid": True,
            "warnings": warnings,
            "validated_text": generated_text
        }
