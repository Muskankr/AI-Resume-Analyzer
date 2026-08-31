"""
DRF serializers for language detection results and translation toggle states.
"""

from rest_framework import serializers


class LanguageDetectionRequestSerializer(serializers.Serializer):
    text = serializers.CharField(
        required=True,
        max_length=50000,
        help_text="The resume text to analyze for language detection.",
    )


class LanguageDetectionResponseSerializer(serializers.Serializer):
    language_code = serializers.CharField(
        help_text="ISO 639-1 language code (e.g., 'es', 'fr')."
    )
    language_name = serializers.CharField(
        help_text="Full name of the detected language."
    )
    confidence = serializers.FloatField(
        min_value=0.0, max_value=1.0, help_text="Confidence score of the detection."
    )
    method_used = serializers.CharField(
        help_text="The detection method used (e.g., 'langdetect', 'heuristic')."
    )
    is_english = serializers.BooleanField(
        help_text="Whether the text is predominantly English."
    )


class TranslationRequestSerializer(serializers.Serializer):
    text = serializers.CharField(
        required=True, max_length=100000, help_text="The text to be translated."
    )
    source_language = serializers.CharField(
        required=False,
        default="auto",
        help_text="Source language code. Use 'auto' for automatic detection.",
    )
    target_language = serializers.CharField(
        required=False,
        default="en",
        help_text="Target language code. Defaults to 'en' (English).",
    )


class TranslationResponseSerializer(serializers.Serializer):
    original_text = serializers.CharField(help_text="The original input text.")
    translated_text = serializers.CharField(help_text="The translated text.")
    source_language = serializers.CharField(
        help_text="Detected or provided source language."
    )
    target_language = serializers.CharField(
        help_text="Target language of the translation."
    )
    success = serializers.BooleanField(
        help_text="Whether the translation was successful."
    )
    error_message = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="Error message if translation failed.",
    )
