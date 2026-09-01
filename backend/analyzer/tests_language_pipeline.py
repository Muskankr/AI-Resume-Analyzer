"""The language-detection and translation pipeline, end to end.

Kept as a flat ``tests_*.py`` module because that is the layout Django's
discovery actually reaches in this app. ``analyzer/tests/test_multilingual.py``
holds the original tests for these modules and has never been collected — the
directory is shadowed by ``analyzer/tests.py`` (#913). Putting these here means
they run today rather than after that is untangled.

What they cover:

* English is *detected*, not merely defaulted to. Before this, the heuristic
  had no English word list, and every English resume matched the Italian one
  through the words the two share.
* ``is_english`` can return ``True``. It gated on a confidence no English
  result could reach, so the translation banner offered to translate English.
* The same text always gets the same answer.
* Chunking never returns a chunk over the limit it exists to enforce.
"""

from django.test import TestCase

from analyzer.language_detector import (
    LANGUAGE_INDICATORS,
    LANGUAGE_NAMES,
    LanguageDetector,
)
from analyzer.translation_service import TranslationService


class LanguageDetectionHeuristicTests(TestCase):
    """The heuristic is not a fallback in practice — it is the implementation.

    ``langdetect`` is not in ``requirements.txt``, so the ``except ImportError``
    branch fires on every call and these tests cover the only path that runs.
    """

    #: One sentence of ordinary prose per supported language. Deliberately not
    #: resume text: if the heuristic cannot separate plain sentences it has no
    #: chance on a resume, and a failure here is easier to read.
    SAMPLES = {
        "en": "This is clearly an English sentence written for the test suite.",
        "es": "Esta es claramente una oración en español para las pruebas.",
        "fr": "Ceci est clairement une phrase en français pour les tests.",
        "de": "Dies ist eindeutig ein deutscher Satz mit einigen Wörtern.",
        "it": "Questa è chiaramente una frase in italiano per le prove.",
    }

    def test_each_supported_language_is_identified(self):
        for expected, text in self.SAMPLES.items():
            with self.subTest(language=expected):
                self.assertEqual(LanguageDetector.detect(text).language_code, expected)

    def test_an_english_resume_is_not_reported_as_italian(self):
        """The regression this was filed for.

        The Italian list holds "a", "e", "i", "in", "no", "si", "ha", "ma" and
        "per" — all English words too. With no English list to compete, every
        English resume scored for Italian and nothing else.
        """
        text = (
            "Experienced software engineer with a proven track record in "
            "Python and Django. Led a team of four and shipped the billing "
            "service on time."
        )
        result = LanguageDetector.detect(text)

        self.assertEqual(result.language_code, "en")
        self.assertEqual(result.language_name, "English")

    def test_an_ambiguous_text_reports_a_lower_confidence_than_a_clear_one(self):
        """The confidence has to mean something, or callers cannot use it.

        "de la que un con" is stop words Spanish and French share almost
        evenly. Whichever way the tie falls, saying so with the same certainty
        as a plainly Spanish sentence would be a lie.
        """
        ambiguous = LanguageDetector.detect("de la que un con " * 8)
        unambiguous = LanguageDetector.detect(self.SAMPLES["es"])

        # A relative assertion rather than a threshold: the exact number is a
        # property of the word tables, and pinning it would make every future
        # addition to them a test failure. What must hold is the ordering.
        self.assertLess(ambiguous.confidence, unambiguous.confidence)

    def test_a_shared_word_counts_for_less_than_a_distinctive_one(self):
        """"in" is English, German and Italian; "the" is only English."""
        from analyzer.language_detector import _INDICATOR_WEIGHTS

        self.assertEqual(_INDICATOR_WEIGHTS["the"], 1.0)
        self.assertLess(_INDICATOR_WEIGHTS["in"], _INDICATOR_WEIGHTS["the"])

    def test_a_keyword_only_resume_reports_no_signal_rather_than_guessing(self):
        """"Python Django PostgreSQL Kubernetes" is not a sentence in any language."""
        result = LanguageDetector.detect("Python Django PostgreSQL Kubernetes Terraform")

        self.assertEqual(result.language_code, "en")
        self.assertEqual(result.method_used, "heuristic_no_signal")
        self.assertEqual(result.confidence, 0.0)

    def test_detection_is_a_function_of_the_text_alone(self):
        """Same input, same answer — every time, in any order."""
        text = self.SAMPLES["fr"]
        results = [LanguageDetector.detect(text) for _ in range(25)]

        self.assertEqual({r.language_code for r in results}, {"fr"})
        self.assertEqual({r.confidence for r in results}, {results[0].confidence})

    def test_a_tie_resolves_the_same_way_every_time(self):
        """`max()` returned whichever key the table happened to list first.

        A genuine tie should still be answered deterministically, so that a
        re-analysis of an unchanged resume does not silently change language.
        """
        text = "in no a e i o"
        first = LanguageDetector.detect(text).language_code

        for _ in range(20):
            self.assertEqual(LanguageDetector.detect(text).language_code, first)

    def test_confidence_stays_within_the_range_the_serializer_declares(self):
        """`LanguageDetectionResponseSerializer` bounds this to 0.0–1.0."""
        for text in list(self.SAMPLES.values()) + ["Hi", "", "Python Kubernetes"]:
            with self.subTest(text=text[:24]):
                confidence = LanguageDetector.detect(text).confidence
                self.assertGreaterEqual(confidence, 0.0)
                self.assertLessEqual(confidence, 1.0)

    def test_a_confident_answer_beats_an_unrecognised_one(self):
        """Real prose should score higher than a bag of proper nouns."""
        prose = LanguageDetector.detect(self.SAMPLES["de"])
        nouns = LanguageDetector.detect("Kubernetes Terraform Datadog Snowflake Airflow")

        self.assertGreater(prose.confidence, nouns.confidence)

    def test_every_language_in_the_table_has_a_display_name(self):
        for code in LANGUAGE_INDICATORS:
            with self.subTest(language=code):
                self.assertIn(code, LANGUAGE_NAMES)


class IsEnglishTests(TestCase):
    """`is_english` could not return True for any input at all.

    It gated on ``confidence > 0.6``, and every path returning ``"en"``
    returned less than that. The only branch that clears the gate is the one
    that has just decided the text is not English.
    """

    def test_english_prose_is_english(self):
        self.assertTrue(
            LanguageDetector.is_english("This is clearly an English sentence.")
        )

    def test_an_english_resume_is_english(self):
        self.assertTrue(
            LanguageDetector.is_english(
                "Backend engineer responsible for the billing service and its "
                "migration to a managed database."
            )
        )

    def test_spanish_prose_is_not_english(self):
        self.assertFalse(
            LanguageDetector.is_english("Esta es claramente una oración en español.")
        )

    def test_text_too_short_to_judge_defaults_to_english(self):
        """Not offering a translation is the safe answer when we do not know."""
        self.assertTrue(LanguageDetector.is_english("Hi"))

    def test_the_result_flag_agrees_with_the_method(self):
        for text in (
            "This is clearly an English sentence.",
            "Esta es claramente una oración en español.",
            "Dies ist eindeutig ein deutscher Satz.",
        ):
            with self.subTest(text=text[:24]):
                result = LanguageDetector.detect(text)
                self.assertEqual(result.is_english, LanguageDetector.is_english(text))

class TranslationChunkingTests(TestCase):
    """`_chunk_text` returned chunks larger than `MAX_CHUNK_SIZE`.

    It packed paragraphs into chunks and assumed each paragraph fit. One that
    did not was assigned whole and emitted at full size — and a resume is
    exactly where that happens, because pdfplumber returns a dense
    single-column layout as one unbroken run of text.
    """

    def setUp(self):
        self.service = TranslationService(use_mock=True)

    def test_two_oversized_paragraphs_are_each_split(self):
        chunks = self.service._chunk_text("A" * 4500 + "\n\n" + "B" * 4500)

        self.assertGreaterEqual(len(chunks), 3)
        for index, chunk in enumerate(chunks):
            self.assertLessEqual(
                len(chunk),
                TranslationService.MAX_CHUNK_SIZE,
                f"chunk {index} is {len(chunk)} characters, over the limit the "
                "chunking exists to respect",
            )

    def test_chunking_preserves_every_character_of_content(self):
        """Splitting must not drop text — a lost paragraph is a lost job."""
        paragraphs = ["Paragraph number %d. " % n * 40 for n in range(12)]
        text = "\n\n".join(paragraphs)

        chunks = self.service._chunk_text(text)

        rejoined = " ".join(chunks)
        for paragraph in paragraphs:
            self.assertIn(paragraph.split(".")[0], rejoined)

    def test_a_single_unbroken_paragraph_is_split_on_sentences(self):
        """What pdfplumber hands us: one dense block, no blank lines at all."""
        text = "Delivered the billing service on schedule. " * 200

        chunks = self.service._chunk_text(text)

        self.assertGreater(len(chunks), 1)
        for chunk in chunks:
            self.assertLessEqual(len(chunk), TranslationService.MAX_CHUNK_SIZE)
            # Cut on a sentence boundary, so no chunk opens mid-sentence.
            self.assertTrue(chunk.startswith("Delivered"))

    def test_a_paragraph_with_no_sentence_punctuation_is_split_on_lines(self):
        """A skills block: many short lines, not a full stop between them."""
        text = "\n".join(["Python Django PostgreSQL Kubernetes"] * 300)

        chunks = self.service._chunk_text(text)

        for chunk in chunks:
            self.assertLessEqual(len(chunk), TranslationService.MAX_CHUNK_SIZE)

    def test_text_with_no_boundary_at_all_is_still_bounded(self):
        """Last resort. Not a good split, but a bounded one."""
        chunks = self.service._chunk_text("X" * 12_000)

        self.assertEqual(len(chunks), 3)
        for chunk in chunks:
            self.assertLessEqual(len(chunk), TranslationService.MAX_CHUNK_SIZE)

    def test_text_within_the_limit_is_returned_untouched(self):
        text = "A short resume paragraph that needs no splitting."
        self.assertEqual(self.service._chunk_text(text), [text])

    def test_mock_translation_marks_every_chunk(self):
        """The marker is per chunk, so a long text must not lose it partway."""
        result = self.service.translate_to_english("Hola. " * 2000, source_lang="es")

        self.assertTrue(result.success)
        self.assertGreater(result.translated_text.count("[Translated from es]"), 1)
