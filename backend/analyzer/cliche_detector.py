"""
Resume Phrase Cliché Detector and Modernizer.

This module identifies overused buzzwords, passive voice, and cliché phrases
in resume bullet points, offering strong, action-oriented, and modern alternatives.
"""

import re
from typing import List, Dict, Any, Optional, Tuple

# Comprehensive dictionary of clichés mapped to strong alternatives.
#
# The verb entries carry their inflections. The dictionary held only
# `\bhandled\b`, so "handling" and "handles" went straight past a detector
# whose whole job is to catch that verb — which is what
# `test_analyze_and_suggest_modernization` was failing on.
CLICHE_DICTIONARY = {
    r"\bresponsible for\b": "spearheaded",
    r"\bduties included\b": "managed",
    r"\bhelped with\b": "collaborated on",
    r"\bwork(?:ed|s|ing) on\b": "developed",
    r"\btasked with\b": "executed",
    r"\bassisted in\b": "supported",
    r"\bparticipated in\b": "contributed to",
    r"\bhandl(?:e|es|ed|ing)\b": "orchestrated",
    r"\bwas in charge of\b": "directed",
    r"\bin charge of\b": "directed",
    r"\bthink outside the box\b": "innovated",
    r"\bgo-getter\b": "proactive",
    r"\bteam player\b": "collaborative",
    r"\bhard worker\b": "dedicated",
    r"\bresults-driven\b": "impact-focused",
    r"\bsynergy\b": "collaboration",
    r"\bleverag(?:e|es|ed|ing)\b": "utilized",
    r"\butiliz(?:e|es|ed|ing)\b": "used",
    r"\bparadigm shift\b": "transformation",
    r"\bbest-in-class\b": "industry-leading",
    r"\bworld-class\b": "exceptional",
}

#: Clichés that introduce the real verb rather than being it: "responsible for
#: *managing*", "tasked with *handling*". Replacing one of these on its own
#: leaves the gerund stranded — "Executed handling the migration" — so when a
#: gerund follows, the lead-in is dropped and the gerund becomes the verb.
LEAD_IN_CLICHES = frozenset(
    {
        "responsible for",
        "duties included",
        "helped with",
        "worked on",
        "works on",
        "working on",
        "tasked with",
        "assisted in",
        "participated in",
        "was in charge of",
        "in charge of",
    }
)

#: Forms of "to be". One source of truth: this list existed before but was
#: never referenced — ``detect_passive_voice`` hardcoded its own copy of six
#: of these inline, so the module had two lists and only one of them did
#: anything.
PASSIVE_INDICATORS = frozenset(
    {"was", "were", "been", "being", "is", "are", "am", "be"}
)

#: Words that may sit between the auxiliary and the participle without
#: breaking the construction: "was *not* completed", "was *quickly* deployed".
_PASSIVE_INTERRUPTERS = frozenset({"not", "never", "also", "then", "still", "already"})

#: Past participles that do not end in "ed". The original test was
#: ``endswith(("ed", "en", "t"))``, and "t" matches an enormous number of
#: ordinary words — "was not", "is best", "was at", "was part", "is it" were
#: all reported as passive voice. An explicit set is narrower than any suffix
#: rule that includes "t".
IRREGULAR_PARTICIPLES = frozenset(
    {
        "been", "begun", "bought", "brought", "built", "caught", "chosen",
        "cut", "done", "drawn", "driven", "eaten", "fallen", "felt", "found",
        "given", "gone", "grown", "held", "hidden", "kept", "known", "led",
        "left", "lost", "made", "met", "paid", "put", "read", "risen", "run",
        "said", "seen", "sent", "set", "shown", "sold", "spent", "spoken",
        "sung", "taken", "taught", "thrown", "told", "understood", "won",
        "written",
    }
)

#: Gerund -> simple past, for the forms the rules below get wrong.
IRREGULAR_GERUND_PAST = {
    "being": "was",
    "beginning": "began",
    "bringing": "brought",
    "building": "built",
    "buying": "bought",
    "catching": "caught",
    "choosing": "chose",
    "cutting": "cut",
    "doing": "did",
    "drawing": "drew",
    "driving": "drove",
    "finding": "found",
    "getting": "got",
    "giving": "gave",
    "going": "went",
    "growing": "grew",
    "having": "had",
    "holding": "held",
    "keeping": "kept",
    "knowing": "knew",
    "leading": "led",
    "leaving": "left",
    "losing": "lost",
    "making": "made",
    "meeting": "met",
    "paying": "paid",
    "putting": "put",
    "reading": "read",
    "running": "ran",
    "seeing": "saw",
    "selling": "sold",
    "sending": "sent",
    "setting": "set",
    "speaking": "spoke",
    "spending": "spent",
    "taking": "took",
    "teaching": "taught",
    "telling": "told",
    "thinking": "thought",
    "throwing": "threw",
    "winning": "won",
    "writing": "wrote",
}

#: Compiled once. Longest pattern first so that where two entries could match
#: at the same position — "in charge of" inside "was in charge of" — the
#: longer one is the one that survives the overlap pass in `detect_cliches`.
_COMPILED_CLICHES: List[Tuple[re.Pattern, str]] = [
    (re.compile(pattern, re.IGNORECASE), suggestion)
    for pattern, suggestion in sorted(
        CLICHE_DICTIONARY.items(), key=lambda item: len(item[0]), reverse=True
    )
]

#: Words, with their offsets. `text.split()` loses position, which is why
#: `detect_passive_voice` had to go looking for its own matches with `find`.
_WORD_RE = re.compile(r"[A-Za-z][A-Za-z'-]*")


def _is_past_participle(word: str) -> bool:
    """Whether `word` can be the participle half of a passive construction."""
    lowered = word.lower()
    if lowered in IRREGULAR_PARTICIPLES:
        return True
    # "ed" is the regular ending and is specific enough to use as a rule.
    # "en" and "t" are not: they match often, when, then, open, seven,
    # children, and every word in English ending in t.
    return lowered.endswith("ed") and len(lowered) > 3


def _to_past_tense(gerund: str) -> str:
    """Turn an "-ing" form into its simple past.

    Used when a lead-in cliché is dropped and the gerund behind it has to
    become the sentence's verb.
    """
    lowered = gerund.lower()
    if lowered in IRREGULAR_GERUND_PAST:
        return IRREGULAR_GERUND_PAST[lowered]

    stem = lowered[:-3]
    if not stem:
        return lowered
    # "studying" -> "study" -> "studied"
    if stem.endswith("y") and len(stem) > 1 and stem[-2] not in "aeiou":
        return stem[:-1] + "ied"
    # English drops a silent "e" before "-ing", so putting "ed" back on the
    # stem recovers it: handling -> handl -> handled, using -> us -> used.
    return stem + "ed"


def _match_casing(source: str, replacement: str) -> str:
    """Give `replacement` the casing `source` was written in.

    The original only inspected `source[0]`, so "RESPONSIBLE FOR" came back as
    "Spearheaded" — a heading quietly changed style.
    """
    if source.isupper() and len(source) > 1:
        return replacement.upper()
    if source[:1].isupper():
        return replacement[:1].upper() + replacement[1:]
    return replacement


def _drop_overlaps(detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Keep the leftmost, then longest, of any group of overlapping spans.

    Two patterns can cover the same words — "in charge of" sits inside "was in
    charge of". Emitting both gives the caller two highlights over one phrase
    and, worse, two replacements over one span.
    """
    ordered = sorted(detections, key=lambda d: (d["start"], -(d["end"] - d["start"])))

    kept: List[Dict[str, Any]] = []
    for detection in ordered:
        if kept and detection["start"] < kept[-1]["end"]:
            continue
        kept.append(detection)
    return kept


def detect_cliches(text: str) -> List[Dict[str, Any]]:
    """
    Detects cliché phrases in the provided text.

    Args:
        text (str): The resume text or bullet point to analyze.

    Returns:
        List[Dict[str, Any]]: A list of detected clichés with their positions and suggestions.
    """
    if not text:
        return []

    detections = []
    for pattern, suggestion in _COMPILED_CLICHES:
        for match in pattern.finditer(text):
            detections.append(
                {
                    "phrase": match.group(),
                    "start": match.start(),
                    "end": match.end(),
                    "suggestion": suggestion,
                    "type": "cliche",
                }
            )

    return _drop_overlaps(detections)


def detect_passive_voice(text: str) -> List[Dict[str, Any]]:
    """
    Heuristically detects potential passive voice constructions.

    Args:
        text (str): The resume text to analyze.

    Returns:
        List[Dict[str, Any]]: A list of potential passive voice indicators.
    """
    if not text:
        return []

    words = [(m.group(), m.start(), m.end()) for m in _WORD_RE.finditer(text)]
    detections = []

    for index, (word, start, _end) in enumerate(words):
        if word.lower() not in PASSIVE_INDICATORS:
            continue

        # Look past an interrupting adverb: "was not completed".
        candidate = index + 1
        while (
            candidate < len(words)
            and words[candidate][0].lower() in _PASSIVE_INTERRUPTERS
        ):
            candidate += 1

        if candidate >= len(words):
            continue

        participle, _p_start, p_end = words[candidate]
        if not _is_past_participle(participle):
            continue

        # `start` and `end` come from the match being reported. They used to
        # come from `text.lower().find(...)`, which returns the *first*
        # occurrence in the string — so every repeat of a phrase pointed at
        # the same place, and the UI highlighted the wrong words.
        detections.append(
            {
                "phrase": text[start:p_end],
                "start": start,
                "end": p_end,
                "suggestion": "Rewrite in active voice (e.g., 'Led', 'Built', 'Created')",
                "type": "passive",
            }
        )

    return detections


def _gerund_after(text: str, position: int) -> Optional[Tuple[str, int, int]]:
    """The "-ing" word immediately following `position`, if there is one."""
    match = _WORD_RE.search(text, position)
    if match is None:
        return None
    # Only "immediately": anything but whitespace in between means the lead-in
    # is not introducing this word.
    if text[position : match.start()].strip():
        return None
    word = match.group()
    if len(word) > 4 and word.lower().endswith("ing"):
        return word, match.start(), match.end()
    return None


def _suggestion_for(word: str) -> Optional[str]:
    """The dictionary's replacement for `word`, if `word` is itself a cliché."""
    for pattern, suggestion in _COMPILED_CLICHES:
        match = pattern.fullmatch(word)
        if match is not None:
            return suggestion
    return None


def _build_replacements(text: str, cliches: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Turn cliché detections into spans to rewrite, keeping the result English.

    Two shapes need handling beyond a straight swap:

    * A lead-in followed by a gerund. "Tasked with handling the migration"
      became "Executed handling the migration" — two verbs, no sentence. The
      lead-in goes and the gerund becomes the verb: "Orchestrated the
      migration".
    * A lead-in introduced by "was"/"were". "I was responsible for the
      rollout" became "I was spearheaded the rollout" — passive, from a tool
      whose stated job is removing passive voice. The auxiliary is swallowed
      with the phrase: "I spearheaded the rollout".
    """
    replacements = []

    for detection in cliches:
        start, end = detection["start"], detection["end"]
        source = detection["phrase"]
        replacement = detection["suggestion"]

        gerund = _gerund_after(text, end)
        if gerund is not None and source.lower() in LEAD_IN_CLICHES:
            word, _g_start, g_end = gerund
            # If the gerund is itself in the dictionary, take its suggestion.
            # The past tense of "handling" is "handled", which is a cliché —
            # replacing a cliché with a cliché.
            replacement = _suggestion_for(word) or _to_past_tense(word)
            end = g_end

        # Swallow a "was"/"were" sitting immediately in front of the phrase.
        preceding = _WORD_RE.findall(text[:start])
        if preceding and preceding[-1].lower() in {"was", "were", "is", "are"}:
            auxiliary_start = text.lower().rindex(preceding[-1].lower(), 0, start)
            if not text[auxiliary_start + len(preceding[-1]) : start].strip():
                source = text[auxiliary_start:end]
                start = auxiliary_start

        replacements.append(
            {
                "start": start,
                "end": end,
                "text": _match_casing(source, replacement),
            }
        )

    # A lead-in that swallowed its gerund now covers the span of the gerund's
    # own detection — "tasked with" grew to cover "handling", which is itself
    # a cliché. Applying both rewrote one span twice and produced
    # "Handledated". The leftmost, longest span wins, same rule as detection.
    return _drop_overlaps(replacements)


def analyze_and_suggest(text: str) -> Dict[str, Any]:
    """
    Main function to analyze text for clichés and passive voice, providing suggestions.

    Args:
        text (str): The resume text to analyze.

    Returns:
        Dict[str, Any]: Analysis results including detections and a modernized version.
    """
    if not text or not isinstance(text, str):
        return {"detections": [], "modernized_text": "", "score": 100, "total_issues": 0}

    cliches = detect_cliches(text)
    passive = detect_passive_voice(text)

    all_detections = sorted(cliches + passive, key=lambda x: x["start"])

    # Applied back to front so an earlier replacement cannot move the offsets
    # of a later one.
    modernized_text = text
    for replacement in sorted(
        _build_replacements(text, cliches), key=lambda r: r["start"], reverse=True
    ):
        modernized_text = (
            modernized_text[: replacement["start"]]
            + replacement["text"]
            + modernized_text[replacement["end"] :]
        )

    # Issues per *sentence-sized unit* rather than per word. The old formula,
    # `100 - (issues / words) * 500`, scored one issue in an eight-word bullet
    # at 38/100 — a bullet is short by design, and being short is not a fault.
    # 12 points an issue puts a bullet with two clichés in the sixties and
    # still bottoms out for text that is nothing but clichés.
    issues_count = len(all_detections)
    score = max(0, 100 - issues_count * 12)

    return {
        "detections": all_detections,
        "modernized_text": modernized_text,
        "score": score,
        "total_issues": issues_count,
    }
