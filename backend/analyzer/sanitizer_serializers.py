"""
Serializers for Metadata Sanitizer.

Handles validation of redaction requests and structures the sanitized response.
"""

from rest_framework import serializers


class MetadataExtractionRequestSerializer(serializers.Serializer):
    """
    Serializer to validate the file upload for metadata extraction.
    """

    file = serializers.FileField(required=True)


class PIIRedactionRequestSerializer(serializers.Serializer):
    """
    Serializer to validate the PII redaction request.
    """

    text = serializers.CharField(required=True)
    pii_types_to_redact = serializers.ListField(
        child=serializers.CharField(), required=True
    )


class MetadataResponseSerializer(serializers.Serializer):
    """
    Serializer to structure the extracted metadata output.
    """

    filename = serializers.CharField()
    filetype = serializers.CharField()
    metadata = serializers.DictField()
    pii_detections = serializers.ListField(child=serializers.DictField())


class RedactionResponseSerializer(serializers.Serializer):
    """
    Serializer to structure the redacted text output.
    """

    original_text = serializers.CharField()
    redacted_text = serializers.CharField()
    redacted_types = serializers.ListField(child=serializers.CharField())
