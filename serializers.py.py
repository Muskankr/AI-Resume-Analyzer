"""
Serializers for job offer comparison API
"""

from rest_framework import serializers

class JobOfferComparisonSerializer(serializers.Serializer):
    """Serializer for job offer comparison request"""
    
    job_offer_1 = serializers.CharField(required=True, help_text="First job description")
    job_offer_2 = serializers.CharField(required=True, help_text="Second job description")
    
    def validate(self, data):
        """Validate request data"""
        jd1 = data.get('job_offer_1', '').strip()
        jd2 = data.get('job_offer_2', '').strip()
        
        if len(jd1) < 10:
            raise serializers.ValidationError({
                'job_offer_1': 'Job description 1 is too short (minimum 10 characters)'
            })
        
        if len(jd2) < 10:
            raise serializers.ValidationError({
                'job_offer_2': 'Job description 2 is too short (minimum 10 characters)'
            })
        
        if len(jd1) > 10000:
            raise serializers.ValidationError({
                'job_offer_1': 'Job description 1 exceeds maximum length (10000 characters)'
            })
        
        if len(jd2) > 10000:
            raise serializers.ValidationError({
                'job_offer_2': 'Job description 2 exceeds maximum length (10000 characters)'
            })
        
        return data

class ComparisonResponseSerializer(serializers.Serializer):
    """Serializer for comparison response"""
    
    job1 = serializers.DictField()
    job2 = serializers.DictField()
    comparison = serializers.DictField()
    insights = serializers.ListField(child=serializers.CharField())
    seniority_comparison = serializers.DictField()