"""
Job Offer Comparator Module
Provides side-by-side comparison of two job descriptions
"""

from .comparer import JobOfferComparer
from .serializers import JobOfferComparisonSerializer

__all__ = ['JobOfferComparer', 'JobOfferComparisonSerializer']