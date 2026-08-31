"""
Service layer to handle secure, batched translation of resume text to English
for the core ATS scoring engine, preserving original text for user display.
"""

import logging
import re
from typing import List, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class TranslationResult:
    original_text: str
    translated_text: str
    source_language: str
    target_language: str
    success: bool
    error_message: Optional[str] = None


class TranslationService:
    """
    Handles translation of resume text.
    Designed to be extended with actual API clients (e.g., Google Cloud Translation, DeepL).
    Includes a robust fallback/mock mode for development and testing without API keys.
    """

    MAX_CHUNK_SIZE = 4000  # Characters per translation request to respect API limits

    def __init__(self, use_mock: bool = False):
        """
        Initializes the translation service.
        :param use_mock: If True, uses a mock translator for testing/development.
        """
        self.use_mock = use_mock

    def translate_to_english(
        self, text: str, source_lang: str = "auto"
    ) -> TranslationResult:
        """
        Translates a given text to English. Handles chunking for long texts.
        """
        if not text or not text.strip():
            return TranslationResult(
                original_text=text,
                translated_text="",
                source_language=source_lang,
                target_language="en",
                success=True,
            )

        if source_lang == "en" or source_lang == "unknown":
            return TranslationResult(
                original_text=text,
                translated_text=text,
                source_language="en",
                target_language="en",
                success=True,
            )

        try:
            if self.use_mock:
                translated = self._mock_translate(text, source_lang)
            else:
                translated = self._actual_translate(text, source_lang)

            return TranslationResult(
                original_text=text,
                translated_text=translated,
                source_language=source_lang,
                target_language="en",
                success=True,
            )
        except Exception as e:
            logger.error(
                f"Translation failed for source language {source_lang}: {str(e)}"
            )
            return TranslationResult(
                original_text=text,
                translated_text=text,  # Fallback to original text on failure
                source_language=source_lang,
                target_language="en",
                success=False,
                error_message=str(e),
            )

    def _actual_translate(self, text: str, source_lang: str) -> str:
        """
        Placeholder for actual translation API integration.
        Chunks the text to avoid payload limits.
        """
        # Example structure for Google Cloud Translation or DeepL:
        # from google.cloud import translate_v2 as translate
        # translate_client = translate.Client()
        # result = translate_client.translate(text, target_language='en', source_language=source_lang)
        # return result['translatedText']

        # For now, if not in mock mode but no API is configured, we fall back gracefully
        # to prevent breaking the application. In production, this should be replaced
        # with a real API call.
        logger.warning(
            "Actual translation API not configured. Falling back to original text."
        )
        return text

    def _mock_translate(self, text: str, source_lang: str) -> str:
        """
        Mock translation for testing purposes.
        Prefixes the text to indicate it was 'translated' without altering the core content.
        """
        chunks = self._chunk_text(text)
        translated_chunks = []

        for chunk in chunks:
            # Simulate translation by adding a marker.
            # In a real scenario, this would be the API response.
            translated_chunks.append(f"[Translated from {source_lang}] {chunk}")

        return "\n".join(translated_chunks)

    def _chunk_text(self, text: str) -> List[str]:
        """Split ``text`` into pieces no larger than :attr:`MAX_CHUNK_SIZE`.

        The previous implementation packed paragraphs into chunks and assumed
        every paragraph fit. One that did not was assigned to ``current_chunk``
        whole and emitted at its full length, so the function whose entire
        purpose is respecting the API's payload limit returned chunks over it:

            >>> TranslationService()._chunk_text("A" * 4500 + chr(10)*2 + "B" * 4500)
            >>> [len(c) for c in _]
            [4500, 4500]

        A resume is exactly where that happens. ``pdfplumber`` returns a dense
        single-column layout as one unbroken run of text with no blank line in
        it, so the whole document arrives as a single paragraph and goes to the
        provider in one oversized request, which it rejects.

        Oversized paragraphs are now broken down in decreasing order of how
        much structure the split costs: sentences first, then lines, then a
        hard character cut. The last one is not good, but it is bounded, and it
        only happens for text with no sentence or line break in 4000
        characters.
        """
        if len(text) <= self.MAX_CHUNK_SIZE:
            return [text]

        chunks: List[str] = []
        current_chunk = ""

        # Split by paragraphs first to maintain context.
        for para in text.split("\n\n"):
            for piece in self._split_oversized(para):
                if not piece:
                    continue

                # +2 for the "\n\n" that will rejoin them.
                if current_chunk and len(current_chunk) + len(piece) + 2 > self.MAX_CHUNK_SIZE:
                    chunks.append(current_chunk.strip())
                    current_chunk = ""

                current_chunk = f"{current_chunk}{piece}\n\n" if current_chunk else f"{piece}\n\n"

        if current_chunk.strip():
            chunks.append(current_chunk.strip())

        return chunks

    def _split_oversized(self, paragraph: str) -> List[str]:
        """Break one paragraph into parts that each fit in a chunk.

        Returns ``[paragraph]`` unchanged when it already fits, which is the
        usual case — this only does work for the paragraph that would have
        broken the request.
        """
        if len(paragraph) <= self.MAX_CHUNK_SIZE:
            return [paragraph]

        # Sentence boundaries: the cheapest place to cut, because the provider
        # translates a sentence at a time anyway. The lookbehind keeps the
        # terminator attached to the sentence it ends.
        parts = self._pack(re.split(r"(?<=[.!?])\s+", paragraph))
        if all(len(part) <= self.MAX_CHUNK_SIZE for part in parts):
            return parts

        # No sentence punctuation — a bulleted skills block, or a parser that
        # dropped the periods. Lines are the next-best boundary.
        parts = self._pack(paragraph.splitlines())
        if all(len(part) <= self.MAX_CHUNK_SIZE for part in parts):
            return parts

        # Nothing to cut on. Slice on character count so the caller still gets
        # something it can send, rather than a request the provider refuses.
        return [
            paragraph[start : start + self.MAX_CHUNK_SIZE]
            for start in range(0, len(paragraph), self.MAX_CHUNK_SIZE)
        ]

    def _pack(self, pieces: List[str]) -> List[str]:
        """Greedily join ``pieces`` into the fewest parts that each fit.

        Rejoining with a single space, since the pieces came from splitting on
        whitespace. A piece that is itself too long is passed through for the
        caller to notice and handle at the next level down.
        """
        packed: List[str] = []
        current = ""

        for piece in pieces:
            piece = piece.strip()
            if not piece:
                continue
            candidate = f"{current} {piece}" if current else piece
            if current and len(candidate) > self.MAX_CHUNK_SIZE:
                packed.append(current)
                current = piece
            else:
                current = candidate

        if current:
            packed.append(current)

        return packed
