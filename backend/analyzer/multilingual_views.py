"""HTTP endpoints for language detection and translation.

``language_detector.py``, ``translation_service.py`` and
``multilingual_serializers.py`` were all written, and nothing was ever put
between them and a URL. ``frontend/src/services/translationService.ts`` has
been posting to ``/api/analyzer/detect-language/`` and ``/api/analyzer/translate/``
since it was added; both returned 404.

The two views are thin on purpose: they validate, call the module that does the
work, and shape the result to the serializer that was already written for it.
"""

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from .language_detector import LanguageDetector
from .multilingual_serializers import (
    LanguageDetectionRequestSerializer,
    LanguageDetectionResponseSerializer,
    TranslationRequestSerializer,
    TranslationResponseSerializer,
)
from .translation_service import TranslationService


class LanguageDetectionThrottle(UserRateThrottle):
    """Detection is cheap, but it runs on every upload in the worst case."""

    # A distinct scope, or this shares one cache bucket with every other
    # `UserRateThrottle` in the app and inherits the tightest rate among them.
    scope = "language_detection"
    rate = "30/minute"


class TranslationThrottle(UserRateThrottle):
    """Translation is the expensive one — it fans out to a paid API per chunk."""

    scope = "translation"
    rate = "10/minute"


class LanguageDetectionView(APIView):
    """Report the primary language of a block of resume text."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [LanguageDetectionThrottle]

    @extend_schema(
        request=LanguageDetectionRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=LanguageDetectionResponseSerializer,
                description="Detected language, confidence and the method used.",
            ),
            400: OpenApiResponse(description="Invalid input data"),
        },
        summary="Detect the language of resume text",
    )
    def post(self, request):
        serializer = LanguageDetectionRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        text = serializer.validated_data["text"]
        result = LanguageDetector.detect(text)

        return Response(
            {
                "language_code": result.language_code,
                "language_name": result.language_name,
                "confidence": result.confidence,
                "method_used": result.method_used,
                # Derived from the same result rather than a second `detect`
                # call, so the flag and the code can never disagree.
                "is_english": result.language_code == "en",
            },
            status=status.HTTP_200_OK,
        )


class TranslationView(APIView):
    """Translate resume text to English for the scoring engine.

    ``source_language`` defaults to ``"auto"``, in which case the language is
    detected here rather than being pushed onto the caller — the frontend has
    the text, not a language code.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [TranslationThrottle]

    @extend_schema(
        request=TranslationRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=TranslationResponseSerializer,
                description="Translated text, or the original when translation failed.",
            ),
            400: OpenApiResponse(description="Invalid input data"),
        },
        summary="Translate resume text to English",
    )
    def post(self, request):
        serializer = TranslationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        text = serializer.validated_data["text"]
        source_language = serializer.validated_data.get("source_language", "auto")
        target_language = serializer.validated_data.get("target_language", "en")

        if target_language != "en":
            return Response(
                {
                    "error": (
                        "Only translation to English is supported. The scoring "
                        "engine reads English, and translating away from it "
                        "would leave nothing to score."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if source_language == "auto":
            source_language = LanguageDetector.detect(text).language_code

        # No translation provider is configured in this deployment, so the
        # service falls back to returning the original text. `success` still
        # reports honestly, and the frontend already renders that state.
        result = TranslationService().translate_to_english(
            text, source_lang=source_language
        )

        return Response(
            {
                "original_text": result.original_text,
                "translated_text": result.translated_text,
                "source_language": result.source_language,
                "target_language": result.target_language,
                "success": result.success,
                "error_message": result.error_message,
            },
            status=status.HTTP_200_OK,
        )
