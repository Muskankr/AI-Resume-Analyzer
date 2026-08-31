"""
Serializers for Cliché Detector.

Handles validation of incoming text and structures the detection output.
"""

from rest_framework import serializers


class ClicheDetectionRequestSerializer(serializers.Serializer):
    """
    Serializer to validate the incoming request for cliché detection.
    """

    text = serializers.CharField(required=True, allow_blank=False, max_length=5000)


class DetectionItemSerializer(serializers.Serializer):
    """
    Serializer for a single detection item.
    """

    phrase = serializers.CharField()
    start = serializers.IntegerField()
    end = serializers.IntegerField()
    suggestion = serializers.CharField()
    type = serializers.CharField()


class ClicheDetectionResponseSerializer(serializers.Serializer):
    """
    Serializer to structure the cliché detection output.
    """

    detections = DetectionItemSerializer(many=True)
    modernized_text = serializers.CharField()
    score = serializers.IntegerField()
    total_issues = serializers.IntegerField()
