"""
Module utilizing lightweight NLP models and heuristics to accurately
identify the resume's primary language without heavy external dependencies.
"""

import re
from typing import Dict, Optional, Tuple
from dataclasses import dataclass

# Common language indicators (heuristic fallback if langdetect is unavailable)
#
# English was missing from this table entirely, which meant English could never
# *win* the vote — it was only what the code fell back to when every other
# language scored zero. It rarely did: the Italian list holds "a", "e", "i",
# "in", "no", "si", "ha", "ma", "per" and "come", so any English paragraph of
# reasonable length scored several points for Italian and none for English, and
# was reported as Italian with a straight face.
LANGUAGE_INDICATORS = {
    "en": [
        "the",
        "of",
        "and",
        "to",
        "a",
        "in",
        "that",
        "is",
        "was",
        "for",
        "it",
        "with",
        "as",
        "his",
        "on",
        "be",
        "at",
        "by",
        "this",
        "had",
        "not",
        "are",
        "but",
        "from",
        "or",
        "have",
        "an",
        "they",
        "which",
        "one",
        "you",
        "were",
        "her",
        "all",
        "she",
        "there",
        "would",
        "their",
        "we",
        "him",
        "been",
        "has",
        "when",
        "who",
        "will",
        "more",
        "no",
        "if",
        "out",
        "so",
        "said",
        "what",
        "up",
        "its",
        "about",
        "into",
        "them",
        "can",
        "only",
        "other",
        "new",
        "some",
        "could",
        "time",
        "these",
        "two",
        "may",
        "then",
        "do",
        "first",
        "any",
        "my",
        "now",
        "such",
        "like",
        "our",
        "over",
        "man",
        "me",
        "even",
        "most",
        "made",
        "after",
        "also",
        "did",
        "many",
        "before",
        "must",
        "through",
        "back",
        "years",
        "where",
        "much",
        "your",
        "way",
        "well",
        "down",
        "should",
        "because",
        "each",
        "just",
        "those",
        "how",
        "between",
        "both",
        "under",
        "while",
        "during",
        "against",
        "within",
        "across",
    ],
    "es": [
        "el",
        "la",
        "los",
        "las",
        "de",
        "que",
        "y",
        "en",
        "un",
        "ser",
        "se",
        "no",
        "haber",
        "por",
        "con",
        "su",
        "para",
        "como",
        "estar",
        "tener",
        "le",
        "lo",
        "todo",
        "pero",
        "más",
        "hacer",
        "o",
        "poder",
        "decir",
        "este",
        "ir",
        "otro",
        "ese",
        "la",
        "si",
        "me",
        "ya",
        "ver",
        "porque",
        "dar",
        "cuando",
        "él",
        "muy",
        "sin",
        "vez",
        "saber",
        "qué",
        "sobre",
        "mi",
        "alguno",
        "mismo",
        "yo",
        "también",
        "hasta",
        "año",
        "dos",
        "querer",
        "entre",
        "así",
        "primero",
        "desde",
        "grande",
        "eso",
        "ni",
        "nos",
        "llegar",
        "pasar",
        "tiempo",
        "ella",
        "sí",
        "día",
        "uno",
        "bien",
        "poco",
        "deber",
        "entonces",
        "poner",
        "cosa",
        "tanto",
        "hombre",
        "parecer",
        "nuestro",
        "tan",
        "donde",
        "ahora",
        "parte",
        "después",
        "vida",
        "quedar",
        "siempre",
        "creer",
        "hablar",
        "llevar",
        "dejar",
        "nada",
        "cada",
        "seguir",
        "menos",
        "nuevo",
        "encontrar",
        "algo",
        "solo",
        "pues",
        "llamar",
        "venir",
        "pensar",
        "salir",
        "volver",
        "conocer",
        "vivir",
        "sentir",
        "tratar",
        "mirar",
        "contar",
        "empezar",
        "esperar",
        "buscar",
        "existir",
        "entrar",
        "trabajar",
        "escribir",
        "perder",
        "producir",
        "ocurrir",
        "entender",
        "pedir",
        "recibir",
        "recordar",
        "terminar",
        "permitir",
        "aparecer",
        "conseguir",
        "comenzar",
        "servir",
        "sacar",
        "necesitar",
        "mantener",
        "resultar",
        "leer",
        "caer",
        "cambiar",
        "presentar",
        "crear",
        "abrir",
        "pasar",
        "considerar",
        "dar",
        "tomar",
        "responder",
        "crecer",
        "hacer",
        "traer",
        "descubrir",
        "conocer",
        "lograr",
        "comprender",
        "gustar",
        "obtener",
        "explicar",
        "oír",
        "realizar",
        "suponer",
        "comentar",
        "imaginar",
        "decidir",
        "asegurar",
        "desarrollar",
        "afirmar",
        "preguntar",
        "alcanzar",
        "diferenciar",
        "establecer",
        "utilizar",
        "formar",
        "dirigir",
        "notar",
        "provocar",
        "reconocer",
        "incluir",
        "observar",
        "comprobar",
        "comunicar",
        "adoptar",
        "proponer",
        "aportar",
        "revelar",
        "aplicar",
        "ejercer",
        "representar",
        "constituir",
        "exigir",
        "implicar",
        "contribuir",
        "transformar",
        "generar",
        "reflejar",
        "asumir",
        "demostrar",
        "garantizar",
        "promover",
        "indicar",
        "determinar",
        "significar",
        "comparar",
        "evaluar",
        "analizar",
        "identificar",
        "señalar",
        "mencionar",
        "describir",
        "resumir",
        "concluir",
        "sugerir",
        "recomendar",
        "orientar",
        "guiar",
        "facilitar",
        "optimizar",
        "mejorar",
        "incrementar",
        "reducir",
        "maximizar",
        "minimizar",
        "estandarizar",
        "automatizar",
        "digitalizar",
        "innovar",
        "liderar",
        "gestionar",
        "administrar",
        "coordinar",
        "supervisar",
        "evaluar",
        "auditar",
        "inspeccionar",
        "verificar",
        "validar",
        "certificar",
        "acreditar",
        "homologar",
        "normalizar",
        "regular",
        "reglamentar",
        "legislar",
        "normar",
        "estandarizar",
        "unificar",
        "armonizar",
        "integrar",
        "articular",
        "vincular",
        "conectar",
        "enlazar",
        "relacionar",
        "asociar",
        "agrupar",
        "clasificar",
        "categorizar",
        "ordenar",
        "organizar",
        "estructurar",
        "sistematizar",
        "planificar",
        "programar",
        "diseñar",
        "concebir",
        "idear",
        "inventar",
        "descubrir",
        "explorar",
        "investigar",
        "estudiar",
        "examinar",
        "analizar",
        "evaluar",
        "valorar",
        "tasar",
        "cotizar",
        "presupuestar",
        "financiar",
        "costear",
        "subvencionar",
        "patrocinar",
        "auspiciar",
        "respaldar",
        "apoyar",
        "sostener",
        "mantener",
        "conservar",
        "preservar",
        "proteger",
        "defender",
        "resguardar",
        "salvaguardar",
        "custodiar",
        "vigilar",
        "monitorear",
        "controlar",
        "regular",
        "fiscalizar",
        "sancionar",
        "penalizar",
        "multar",
        "castigar",
        "reprimir",
        "contener",
        "frenar",
        "detener",
        "parar",
        "suspender",
        "interrumpir",
        "cancelar",
        "anular",
        "invalidar",
        "revocar",
        "derogar",
        "abrogar",
        "rescindir",
        "terminar",
        "finalizar",
        "concluir",
        "cerrar",
        "clausurar",
        "liquidar",
        "disolver",
        "desintegrar",
        "descomponer",
        "desarmar",
        "desmontar",
        "desmantelar",
        "despedazar",
        "romper",
        "quebrar",
        "partir",
        "dividir",
        "separar",
        "aislar",
        "marginar",
        "excluir",
        "eliminar",
        "suprimir",
        "borrar",
        "tachar",
        "anular",
        "cancelar",
        "revocar",
        "invalidar",
        "desestimar",
        "rechazar",
        "denegar",
        "negar",
        "rehusar",
        "declinar",
        "receptar",
        "aceptar",
        "admitir",
        "recibir",
        "acoger",
        "abrazar",
        "adoptar",
        "incorporar",
        "integrar",
        "incluir",
        "agregar",
        "añadir",
        "sumar",
        "adicionar",
        "acumular",
        "reunir",
        "juntar",
        "agrupar",
        "concentrar",
        "centralizar",
        "focalizar",
        "enfocar",
        "orientar",
        "dirigir",
        "guiar",
        "conducir",
        "llevar",
        "transportar",
        "trasladar",
        "mover",
        "desplazar",
        "transferir",
        "transmitir",
        "comunicar",
        "informar",
        "notificar",
        "avisar",
        "alertar",
        "advertir",
        "prevenir",
        "proteger",
        "defender",
        "resguardar",
        "salvaguardar",
        "custodiar",
        "vigilar",
        "monitorear",
        "controlar",
        "regular",
        "fiscalizar",
        "sancionar",
        "penalizar",
        "multar",
        "castigar",
        "reprimir",
        "contener",
        "frenar",
        "detener",
        "parar",
        "suspender",
        "interrumpir",
        "cancelar",
        "anular",
        "invalidar",
        "revocar",
        "derogar",
        "abrogar",
        "rescindir",
        "terminar",
        "finalizar",
        "concluir",
        "cerrar",
        "clausurar",
        "liquidar",
        "disolver",
        "desintegrar",
        "descomponer",
        "desarmar",
        "desmontar",
        "desmantelar",
        "despedazar",
        "romper",
        "quebrar",
        "partir",
        "dividir",
        "separar",
        "aislar",
        "marginar",
        "excluir",
        "eliminar",
        "suprimir",
        "borrar",
        "tachar",
    ],
    "fr": [
        "le",
        "de",
        "et",
        "à",
        "un",
        "il",
        "être",
        "et",
        "en",
        "avoir",
        "que",
        "pour",
        "dans",
        "ce",
        "son",
        "une",
        "sur",
        "avec",
        "ne",
        "se",
        "pas",
        "tout",
        "plus",
        "par",
        "grand",
        "en",
        "une",
        "être",
        "et",
        "en",
        "avoir",
        "que",
        "pour",
        "dans",
        "ce",
        "son",
        "une",
        "sur",
        "avec",
        "ne",
        "se",
        "pas",
        "tout",
        "plus",
        "par",
        "grand",
        "en",
        "une",
        "être",
        "et",
        "en",
        "avoir",
        "que",
        "pour",
        "dans",
        "ce",
        "son",
        "une",
        "sur",
        "avec",
        "ne",
        "se",
        "pas",
        "tout",
        "plus",
        "par",
        "grand",
    ],
    "de": [
        "der",
        "die",
        "und",
        "in",
        "den",
        "von",
        "zu",
        "das",
        "mit",
        "sich",
        "des",
        "auf",
        "für",
        "ist",
        "im",
        "dem",
        "nicht",
        "ein",
        "eine",
        "als",
        "auch",
        "es",
        "an",
        "werden",
        "aus",
        "er",
        "hat",
        "dass",
        "sie",
        "nach",
        "wird",
        "bei",
        "einer",
        "um",
        "am",
        "sind",
        "noch",
        "wie",
        "einem",
        "über",
        "einen",
        "so",
        "zum",
        "war",
        "haben",
        "nur",
        "oder",
        "aber",
        "vor",
        "zur",
        "bis",
        "mehr",
        "durch",
        "man",
        "sein",
        "wurde",
        "sei",
        "in",
        "wird",
        "ihm",
        "eine",
        "eines",
        "da",
        "soll",
        "mir",
        "kein",
        "wir",
        "eine",
        "unter",
        "hat",
        "denn",
        "nun",
        "alles",
        "nur",
        "oder",
        "aber",
        "vor",
        "zur",
        "bis",
        "mehr",
        "durch",
        "man",
        "sein",
        "wurde",
        "sei",
        "in",
        "wird",
        "ihm",
        "eine",
        "eines",
        "da",
        "soll",
        "mir",
        "kein",
        "wir",
        "eine",
        "unter",
        "hat",
        "denn",
        "nun",
        "alles",
    ],
    "it": [
        "il",
        "di",
        "che",
        "e",
        "la",
        "per",
        "un",
        "a",
        "è",
        "in",
        "una",
        "non",
        "si",
        "da",
        "mi",
        "lo",
        "le",
        "ha",
        "i",
        "ma",
        "ho",
        "cosa",
        "come",
        "io",
        "questo",
        "qui",
        "quello",
        "sono",
        "ci",
        "ti",
        "ne",
        "no",
        "se",
        "anche",
        "tutto",
        "più",
        "con",
        "grande",
        "in",
        "una",
        "essere",
        "e",
        "in",
        "avere",
        "che",
        "per",
        "dentro",
        "questo",
        "suo",
        "una",
        "su",
        "con",
        "non",
        "si",
        "non",
        "tutto",
        "più",
        "per",
        "grande",
    ],
}

LANGUAGE_NAMES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "nl": "Dutch",
    "ru": "Russian",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "ar": "Arabic",
    "hi": "Hindi",
    "unknown": "Unknown",
}


#: Languages we can recognise, in the order ties are broken. Alphabetical
#: rather than dict order: ``max()`` returns the first key at the maximum, and
#: dict order here is "whoever edited the table last", which made a genuine
#: two-way tie resolve differently depending on an unrelated edit.
SUPPORTED_LANGUAGES = tuple(sorted(LANGUAGE_INDICATORS))

#: Inflected forms the tables above are missing.
#:
#: The Spanish and French lists were written as lemmas — ``ser``, ``haber``,
#: ``être``, ``avoir`` — but nobody writes a resume in the infinitive. The
#: conjugated forms that actually appear in a sentence were absent, so "Esta es
#: claramente una oración en español" matched Spanish on almost nothing and was
#: reported as German, whose list does carry the surface form ``es``.
#:
#: Kept separate from the tables above rather than merged into them: these are
#: a targeted correction with a reason, and burying them in a 700-line literal
#: would lose it.
ADDITIONAL_INDICATORS = {
    "es": (
        "es", "son", "está", "están", "estaba", "una", "del", "al", "esta",
        "esa", "fue", "fueron", "han", "he", "hemos", "sus", "nuestra",
        "según", "durante", "mediante", "sobre",
    ),
    "fr": (
        "est", "sont", "était", "des", "les", "qui", "cette", "ces", "été",
        "nous", "vous", "leur", "aux", "du", "au", "ainsi", "chez", "dont",
    ),
    "de": (
        "zwischen", "während", "gegen", "jedoch", "sowie", "bereits",
    ),
    "it": (
        "del", "della", "dei", "delle", "nel", "nella", "questa", "sua",
        "loro", "tra", "dal", "alla", "allo", "gli", "presso", "inoltre",
    ),
}

#: The indicator lists as sets, built once. The literals above contain repeats
#: — ``"la"`` appears twice under ``es``, ``"in"`` three times under ``it`` —
#: which would have counted a single match more than once.
_INDICATOR_SETS = {
    lang: frozenset(words) | frozenset(ADDITIONAL_INDICATORS.get(lang, ()))
    for lang, words in LANGUAGE_INDICATORS.items()
}


def _build_indicator_weights():
    """How much one matched word is worth, per word.

    A word shared by several languages says almost nothing about which one you
    are reading. ``in`` is English, German and Italian; ``no`` is English,
    Spanish and Italian; ``a`` is English, Portuguese-ish Italian and more. Under
    a flat one-point-per-match count those shared words were the *majority* of
    what an English resume matched, and they all paid out to languages the text
    was not written in.

    Weighting each word by ``1 / (languages containing it)`` leaves the shared
    words contributing a fraction each while a distinctive word — ``the``,
    ``qué``, ``werden`` — carries its full point.
    """
    counts = {}
    for words in _INDICATOR_SETS.values():
        for word in words:
            counts[word] = counts.get(word, 0) + 1
    return {word: 1.0 / count for word, count in counts.items()}


_INDICATOR_WEIGHTS = _build_indicator_weights()

#: Below this many characters there is not enough signal to call it.
MIN_TEXT_LENGTH = 10

#: Roughly the weighted stop-word density of ordinary prose in its own
#: language. Used to turn a raw density into a 0–1 strength, so "half the words
#: I recognise" does not read as "50% confident".
TYPICAL_INDICATOR_DENSITY = 0.18


@dataclass
class LanguageDetectionResult:
    language_code: str
    language_name: str
    confidence: float
    method_used: str

    @property
    def is_english(self) -> bool:
        """Convenience for callers that only care whether to offer translation."""
        return self.language_code == "en"


class LanguageDetector:
    """Detects the primary language of a given text."""

    @classmethod
    def detect(cls, text: str) -> LanguageDetectionResult:
        """
        Detects the language of the provided text.
        Attempts to use `langdetect` first, falls back to heuristic word matching.
        """
        if not text or len(text.strip()) < MIN_TEXT_LENGTH:
            return LanguageDetectionResult("en", "English", 0.0, "fallback_short_text")

        detected = cls._langdetect_detection(text)
        if detected is not None:
            return detected

        return cls._heuristic_detection(text)

    @classmethod
    def _langdetect_detection(cls, text: str):
        """``langdetect``'s answer, or ``None`` when it cannot give one.

        ``langdetect`` is not in ``requirements.txt``, so in practice this
        returns ``None`` and the heuristic below is what actually runs. It is
        kept because the response contract documents a ``"langdetect"`` method,
        and because the heuristic should stay the fallback rather than quietly
        become the whole implementation.

        The seed matters. ``langdetect`` samples features at random and, left
        unseeded, gives different answers for the same input across runs — the
        same resume would be Spanish on upload and Portuguese on re-analysis.
        Seeding makes the result a function of the text alone.
        """
        try:
            from langdetect import DetectorFactory, detect_langs
        except ImportError:
            return None

        DetectorFactory.seed = 0

        try:
            ranked = detect_langs(text)
        except Exception:
            # langdetect raises its own LangDetectException, which we cannot
            # name without importing it, plus anything its tokenizer throws on
            # unusual input. Either way the answer is "fall back".
            return None

        if not ranked:
            return None

        best = ranked[0]
        code = best.lang.split("-")[0]
        return LanguageDetectionResult(
            code,
            LANGUAGE_NAMES.get(code, LANGUAGE_NAMES["unknown"]),
            # Its own probability, rather than the flat 0.85 this used to
            # report for every answer including the shaky ones.
            round(min(0.99, float(best.prob)), 2),
            "langdetect",
        )

    @classmethod
    def _heuristic_detection(cls, text: str) -> LanguageDetectionResult:
        """Fallback heuristic detection based on common stop words."""
        words = re.findall(r"\b\w+\b", text.lower())
        if not words:
            return LanguageDetectionResult("en", "English", 0.0, "heuristic_empty")

        densities = cls._indicator_densities(words)
        total = sum(densities.values())

        if total <= 0:
            # No stop word from any list. A skills-only resume — "Python Django
            # PostgreSQL Kubernetes" — looks like this. English is the right
            # default for the app, but the confidence has to say that nothing
            # was actually recognised, or callers cannot tell a real answer
            # from a shrug.
            return LanguageDetectionResult("en", "English", 0.0, "heuristic_no_signal")

        # Ranked rather than `max`, so a tie resolves alphabetically instead of
        # by whichever key the table happens to list first, and so the
        # runner-up is available below.
        ranked = sorted(SUPPORTED_LANGUAGES, key=lambda lang: (-densities[lang], lang))
        best_lang = ranked[0]
        best_density = densities[best_lang]
        runner_up_density = densities[ranked[1]] if len(ranked) > 1 else 0.0

        # Two halves, because either alone misleads.
        #
        # `margin` is how far clear of the runner-up the winner is. Near zero
        # for a text made of words several languages share — which is what an
        # English resume looked like before English had a list of its own, and
        # exactly the case that used to be reported with full confidence.
        #
        # `strength` is how much was recognised at all. Low for a resume that
        # is mostly proper nouns and product names, where a clear winner among
        # four matched words still is not much to go on.
        margin = (best_density - runner_up_density) / best_density
        strength = min(1.0, best_density / TYPICAL_INDICATOR_DENSITY)
        confidence = min(0.95, 0.5 * margin + 0.5 * strength)

        return LanguageDetectionResult(
            best_lang,
            LANGUAGE_NAMES.get(best_lang, LANGUAGE_NAMES["unknown"]),
            round(confidence, 2),
            "heuristic",
        )

    @classmethod
    def _indicator_densities(cls, words) -> Dict[str, float]:
        """Weighted share of ``words`` that are stop words of each language.

        Divided by the word count, so a long resume and a short one are
        comparable, and every language is measured against the same text —
        which the old raw counts were not, since the lists are different
        lengths.
        """
        totals = {lang: 0.0 for lang in LANGUAGE_INDICATORS}

        for word in words:
            weight = _INDICATOR_WEIGHTS.get(word)
            if weight is None:
                continue
            for lang, indicators in _INDICATOR_SETS.items():
                if word in indicators:
                    totals[lang] += weight

        return {lang: total / len(words) for lang, total in totals.items()}

    @classmethod
    def is_english(cls, text: str) -> bool:
        """Quick check if text is predominantly English.

        This used to be ``code == "en" and confidence > 0.6`` and could not
        return ``True`` for anything. Every path that returns ``"en"`` returned
        a confidence below the gate — the short-text fallback ``0.0``, the
        no-signal default ``0.5`` — and the only branch that clears ``0.6`` is
        the branch that has just decided the text is *not* English. So the
        translation banner offered to translate English resumes, every time.

        The gate is gone rather than lowered. What the caller is deciding is
        whether to offer a translation, and offering one for a text we are
        unsure about is worse than not offering it: the confident answer and
        the shrug both mean "leave this alone".
        """
        return cls.detect(text).language_code == "en"
