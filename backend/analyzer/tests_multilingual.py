"""
Tests covering language detection accuracy and translation service fallback mechanisms.
"""

from django.test import TestCase

from analyzer.quarantine import skip_while_broken
from analyzer.language_detector import LanguageDetector, LANGUAGE_NAMES
from analyzer.translation_service import TranslationService, TranslationResult
from analyzer.multilingual_serializers import (
    LanguageDetectionRequestSerializer,
    TranslationRequestSerializer,
)


#: These tests were written against behaviour the modules under test do not
#: have. They failed from the day they were written and nobody saw it, because
#: the package they lived in was never collected (#913). Turning collection
#: back on without quarantining them would land a red build for bugs this
#: change is not making.
#:
#: Each quarantine names the issue that tracks its bug and carries a probe for
#: it, so the test starts running again on its own once the fix lands — in
#: whatever order these pull requests are merged. See `analyzer/quarantine.py`
#: for why a plain @skip would outlive its reason here.

class LanguageDetectorTestCase(TestCase):
    @skip_while_broken(
        lambda: LanguageDetector.detect(
            "Experienced software engineer with a proven track record in "
            "Python and Django."
        ).language_code
        != "en",
        "#914: the heuristic has no English word list, so English scores as Italian",
    )
    def test_detect_english_text(self):
        text = "Experienced software engineer with a proven track record in Python and Django."
        result = LanguageDetector.detect(text)
        self.assertEqual(result.language_code, "en")
        self.assertEqual(result.language_name, "English")
        self.assertTrue(
            result.is_english
            if hasattr(result, "is_english")
            else result.language_code == "en"
        )

    def test_detect_spanish_text_heuristic(self):
        text = "Ingeniero de software experimentado con un historial comprobado en Python y Django."
        result = LanguageDetector.detect(text)
        # Depending on whether langdetect is installed, it might be 'es' or heuristic 'es'
        self.assertIn(
            result.language_code, ["es", "en"]
        )  # Fallback to en is acceptable if heuristic fails

    def test_detect_short_text_fallback(self):
        text = "Hi"
        result = LanguageDetector.detect(text)
        self.assertEqual(result.method_used, "fallback_short_text")
        self.assertEqual(result.language_code, "en")

    @skip_while_broken(
        lambda: not LanguageDetector.is_english("This is clearly an English sentence."),
        "#914: is_english() gates on a confidence no English result can reach",
    )
    def test_is_english_method(self):
        english_text = "This is clearly an English sentence."
        spanish_text = "Esta es claramente una oración en español."

        self.assertTrue(LanguageDetector.is_english(english_text))
        # Spanish text might return False, or True if heuristic confidence is low,
        # but we test the method executes without error.
        LanguageDetector.is_english(spanish_text)


class TranslationServiceTestCase(TestCase):
    def setUp(self):
        self.service = TranslationService(use_mock=True)

    def test_translate_english_to_english(self):
        text = "No translation needed."
        result = self.service.translate_to_english(text, source_lang="en")
        self.assertTrue(result.success)
        self.assertEqual(result.translated_text, text)
        self.assertEqual(result.source_language, "en")

    def test_translate_mock_spanish(self):
        text = "Hola mundo."
        result = self.service.translate_to_english(text, source_lang="es")
        self.assertTrue(result.success)
        self.assertIn("[Translated from es]", result.translated_text)
        self.assertEqual(result.target_language, "en")

    def test_translate_empty_text(self):
        result = self.service.translate_to_english("", source_lang="fr")
        self.assertTrue(result.success)
        self.assertEqual(result.translated_text, "")

    @skip_while_broken(
        lambda: any(
            len(chunk) > TranslationService.MAX_CHUNK_SIZE
            for chunk in TranslationService(use_mock=True)._chunk_text(
                "A" * 4500 + "\n\n" + "B" * 4500
            )
        ),
        "#914: a paragraph over MAX_CHUNK_SIZE is emitted whole",
    )
    def test_chunking_long_text(self):
        # Two paragraphs, each on its own larger than MAX_CHUNK_SIZE (4000).
        #
        # This asserted `len(chunks) == 2` alongside `len(chunks[0]) <= 4000`,
        # which nothing can satisfy: 9000 characters of content do not fit in
        # two chunks of 4000. The count is now derived from the limit instead
        # of pinned to a number, and every chunk is checked rather than the
        # first two.
        long_text = "A" * 4500 + "\n\n" + "B" * 4500
        chunks = self.service._chunk_text(long_text)

        self.assertGreaterEqual(len(chunks), 3)
        for index, chunk in enumerate(chunks):
            self.assertLessEqual(
                len(chunk),
                TranslationService.MAX_CHUNK_SIZE,
                f"chunk {index} is {len(chunk)} characters, over the limit the "
                "chunking exists to respect",
            )


class MultilingualSerializersTestCase(TestCase):
    def test_language_detection_request_serializer_valid(self):
        data = {"text": "Sample resume text for detection."}
        serializer = LanguageDetectionRequestSerializer(data=data)
        self.assertTrue(serializer.is_valid())

    def test_language_detection_request_serializer_invalid(self):
        data = {
            "text": ""
        }  # Empty text might be valid depending on CharField, but let's test missing
        serializer = LanguageDetectionRequestSerializer(data={})
        self.assertFalse(serializer.is_valid())
        self.assertIn("text", serializer.errors)

    def test_translation_request_serializer_defaults(self):
        data = {"text": "Translate this."}
        serializer = TranslationRequestSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data["source_language"], "auto")
        self.assertEqual(serializer.validated_data["target_language"], "en")
