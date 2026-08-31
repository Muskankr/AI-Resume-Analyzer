import logging
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import ResumeAnalysis
from .cover_letter_generator import CoverLetterGenerator
from rest_framework.throttling import AnonRateThrottle

logger = logging.getLogger(__name__)

class CoverLetterThrottle(AnonRateThrottle):
    scope = "cover_letter_gen"

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([CoverLetterThrottle])
def generate_cover_letter_view(request):
    """
    Generate an AI cover letter from an existing resume analysis and a job description.
    """
    analysis_id = request.data.get("analysis_id")
    job_description = request.data.get("job_description")
    
    if not analysis_id:
        return Response({"error": "analysis_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        
    if not job_description or len(job_description.strip()) < 20:
        return Response({"error": "A valid job description is required (min 20 characters)."}, status=status.HTTP_400_BAD_REQUEST)
        
    analysis = get_object_or_404(ResumeAnalysis, id=analysis_id, user=request.user)
    resume_text = analysis.resume_text
    
    if not resume_text:
        return Response({"error": "The selected resume analysis does not contain extracted text."}, status=status.HTTP_400_BAD_REQUEST)
        
    generator = CoverLetterGenerator()
    try:
        raw_draft = generator.generate(resume_text, job_description)
        validation_result = generator.validate_claims(raw_draft, resume_text)
        
        return Response({
            "draft": validation_result["validated_text"],
            "status": "success",
            "warnings": validation_result.get("warnings", []),
            "disclaimer": "AI-generated cover letter draft. Please review and edit before submission to ensure no unsupported claims are made."
        })
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except RuntimeError as e:
        logger.error(f"Cover letter generation error: {e}")
        return Response({"error": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        logger.error(f"Unexpected error in cover letter generator: {e}")
        return Response({"error": "An unexpected error occurred during generation."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
