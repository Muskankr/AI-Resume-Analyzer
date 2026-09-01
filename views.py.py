"""
Views for job offer comparison
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import logging

from .comparer import JobOfferComparer
from .serializers import JobOfferComparisonSerializer

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def compare_job_offers(request):
    """
    Compare two job offers side by side
    
    POST /api/compare-job-offers/
    """
    try:
        # Validate request
        serializer = JobOfferComparisonSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        jd1 = serializer.validated_data['job_offer_1']
        jd2 = serializer.validated_data['job_offer_2']
        
        # Perform comparison
        result = JobOfferComparer.compare(jd1, jd2)
        
        return Response(result, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Job comparison error: {str(e)}")
        return Response(
            {'error': f'Failed to compare job offers: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_comparison_history(request):
    """
    Get comparison history (placeholder - would need a model)
    """
    return Response({
        'comparisons': []
    }, status=status.HTTP_200_OK)