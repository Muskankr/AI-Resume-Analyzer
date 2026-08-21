import re
import difflib
import ahocorasick

from .skill_dictionary import load_skill_dictionary


# Explicit false-positive pairs that must never be considered partial matches
EXPLICIT_NON_MATCHES = {
    ("java", "javascript"),
    ("javascript", "java"),
    ("java", "js"),
    ("js", "java"),
    ("c", "c++"),
    ("c++", "c"),
    ("c", "c#"),
    ("c#", "c"),
    ("c", "css"),
    ("css", "c"),
    ("r", "react"),
    ("react", "r"),
    ("r", "rust"),
    ("rust", "r"),
    ("r", "ruby"),
    ("ruby", "r"),
    ("sql", "nosql"),
    ("nosql", "sql"),
}


def is_explicit_non_match(skill_a: str, skill_b: str) -> bool:
    a, b = skill_a.strip().lower(), skill_b.strip().lower()
    return (a, b) in EXPLICIT_NON_MATCHES or (b, a) in EXPLICIT_NON_MATCHES


def normalize_text(text: str) -> str:
    """
    Normalize extracted resume text before matching.
    """

    text = text.lower()
    text = text.replace("\n", " ")

    # Keep only useful characters.
    text = re.sub(r"[^\w#+.-]", " ", text)

    # Collapse multiple spaces.
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def build_automaton():
    """
    Build Aho-Corasick automaton for every canonical skill
    and all of its aliases.
    """

    dictionary = load_skill_dictionary()
    A = ahocorasick.Automaton()

    for category in dictionary.values():
        if not isinstance(category, list):
            continue

        for skill in category:
            canonical = skill.get("name")
            if not canonical:
                continue

            aliases = set(skill.get("aliases", []))
            aliases.add(canonical)

            for alias in aliases:
                alias_lower = alias.lower()
                # AhoCorasick stores (index, value) at each matched node.
                # We store both the alias and the canonical name.
                A.add_word(alias_lower, (alias_lower, canonical))

    A.make_automaton()
    return A

AUTOMATON = build_automaton()


def is_word_boundary(text: str, start: int, end: int) -> bool:
    r"""
    Checks if a matched substring is bounded by non-word / non-skill characters.
    Prevents matching "react" inside "react.js" or "c" inside "c++".
    """
    # Check preceding character
    if start > 0:
        prev_char = text[start - 1]
        if prev_char.isalnum() or prev_char in ('_', '#', '+', '-'):
            return False
        if prev_char == '.' and start - 1 > 0 and text[start - 2].isalnum():
            return False

    # Check following character
    if end < len(text):
        next_char = text[end]
        if next_char.isalnum() or next_char in ('_', '#', '+', '-'):
            return False
        if next_char == '.' and end + 1 < len(text) and text[end + 1].isalnum():
            return False

    return True


def is_word_in_text(word: str, text: str) -> bool:
    """Check if word is bounded as a word in text."""
    pattern = r"(?<!\w)" + re.escape(word.lower()) + r"(?!\w)"
    return bool(re.search(pattern, text, re.IGNORECASE))


def get_skill_alias_map():
    """
    Build mappings:
    - alias_to_canonical: dict[str, str]
    - canonical_to_aliases: dict[str, set[str]]
    """
    dictionary = load_skill_dictionary()
    alias_to_canonical = {}
    canonical_to_aliases = {}

    for category in dictionary.values():
        if not isinstance(category, list):
            continue

        for skill in category:
            canonical = skill.get("name")
            if not canonical:
                continue

            canonical_lower = canonical.lower()
            aliases = set(a.lower() for a in skill.get("aliases", []))
            aliases.add(canonical_lower)

            canonical_to_aliases[canonical_lower] = aliases
            for alias in aliases:
                alias_to_canonical[alias] = canonical_lower

    return alias_to_canonical, canonical_to_aliases


def extract_skills(text: str):
    """
    Extract canonical skills from resume text using Aho-Corasick.

    Returns:
        list[str]
    """
    normalized = normalize_text(text)
    detected = []

    # pyahocorasick returns (end_index, (alias_lower, canonical))
    # end_index is inclusive.
    for end_index, (alias_lower, canonical) in AUTOMATON.iter(normalized):
        start_index = end_index - len(alias_lower) + 1
        
        # Match complete words only to prevent false positives (e.g. react in reactive)
        if is_word_boundary(normalized, start_index, end_index + 1):
            detected.append(canonical)

    # Preserve insertion order and remove duplicates.
    return list(dict.fromkeys(detected))


def extract_skills_detailed(text: str):
    """
    Extract canonical skills and the exact matched aliases/variants from text.

    Returns:
        dict[str, list[str]]: Map of canonical skill name to list of matched aliases in text.
    """
    normalized = normalize_text(text)
    matched_details = {}

    for end_index, (alias_lower, canonical) in AUTOMATON.iter(normalized):
        start_index = end_index - len(alias_lower) + 1
        if is_word_boundary(normalized, start_index, end_index + 1):
            if canonical not in matched_details:
                matched_details[canonical] = []
            if alias_lower not in matched_details[canonical]:
                matched_details[canonical].append(alias_lower)

    return matched_details


def match_skills_with_partial(required_skills, text, detected_skills=None):
    """
    Categorizes required skills into matched (full match), partial (near match), and missing.

    Returns:
        tuple[list[str], list[dict], list[str]]:
            - matched_skills: list of exact/full matched required skill strings
            - partial_skills: list of dicts with keys {"skill", "matched_variant", "note"}
            - missing_skills: list of truly missing required skill strings
    """
    if detected_skills is None:
        detected_skills = extract_skills(text)

    normalized_text = normalize_text(text)
    detailed_matches = extract_skills_detailed(text)
    alias_to_canonical, canonical_to_aliases = get_skill_alias_map()

    matched = []
    partial = []
    missing = []

    for req in required_skills:
        req_clean = req.strip()
        req_lower = req_clean.lower()
        canonical_req = alias_to_canonical.get(req_lower, req_lower)
        req_matched_exact = False

        # Check 1: Exact full match
        matched_aliases_in_text = detailed_matches.get(canonical_req, [])

        if matched_aliases_in_text:
            if req_lower in matched_aliases_in_text:
                req_matched_exact = True
            else:
                req_matched_exact = False
        elif is_word_in_text(req_lower, normalized_text):
            req_matched_exact = True
        elif req_lower in [s.lower() for s in detected_skills]:
            req_matched_exact = True

        if req_matched_exact:
            matched.append(req_clean)
            continue

        # Check 2: Near / Partial Match
        partial_info = None

        # (a) Found an alias in text for this required skill (e.g. React.js for React, or Postgres for PostgreSQL)
        if matched_aliases_in_text:
            variant = matched_aliases_in_text[0]
            if not is_explicit_non_match(req_lower, variant):
                variant_display = variant.upper() if variant in ("js", "ts", "css", "html", "sql") else variant.title()
                partial_info = {
                    "skill": req_clean,
                    "matched_variant": variant_display,
                    "note": f"Resume mentions '{variant_display}' (partial match for '{req_clean}')"
                }

        # (b) Or detected skills contain a canonical/alias of required skill
        if not partial_info:
            for det in detected_skills:
                det_lower = det.lower()
                canonical_det = alias_to_canonical.get(det_lower, det_lower)
                if is_explicit_non_match(req_lower, det_lower):
                    continue

                if canonical_req == canonical_det or req_lower in canonical_to_aliases.get(canonical_det, set()):
                    det_display = det.title()
                    partial_info = {
                        "skill": req_clean,
                        "matched_variant": det_display,
                        "note": f"Resume mentions '{det_display}' (partial match for '{req_clean}')"
                    }
                    break

        # (c) Formatting / String similarity check for custom skills or JD terms
        if not partial_info:
            req_alpha = re.sub(r"[^\w]", "", req_lower)
            for det in detected_skills:
                det_lower = det.lower()
                if is_explicit_non_match(req_lower, det_lower):
                    continue
                det_alpha = re.sub(r"[^\w]", "", det_lower)

                if len(req_alpha) >= 3 and len(det_alpha) >= 3:
                    # Substring or formatting match (e.g. "unittest" vs "unittesting")
                    if req_alpha in det_alpha or det_alpha in req_alpha:
                        partial_info = {
                            "skill": req_clean,
                            "matched_variant": det.title(),
                            "note": f"Resume mentions '{det.title()}' (formatting variant of '{req_clean}')"
                        }
                        break
                    
                    # High similarity ratio
                    ratio = difflib.SequenceMatcher(None, req_alpha, det_alpha).ratio()
                    if ratio >= 0.82:
                        partial_info = {
                            "skill": req_clean,
                            "matched_variant": det.title(),
                            "note": f"Resume mentions '{det.title()}' (near match for '{req_clean}')"
                        }
                        break

        # (d) Fallback check raw text for formatting variants (e.g. "React.js" when req is "React")
        if not partial_info and len(req_clean) >= 3:
            possible_variants = [f"{req_lower}.js", f"{req_lower}js", f"{req_lower} css", f"{req_lower} framework"]
            for pv in possible_variants:
                if is_word_in_text(pv, normalized_text) and not is_explicit_non_match(req_lower, pv):
                    partial_info = {
                        "skill": req_clean,
                        "matched_variant": pv,
                        "note": f"Resume mentions '{pv}' (near match for '{req_clean}')"
                    }
                    break

        if partial_info:
            partial.append(partial_info)
        else:
            missing.append(req_clean)

    return matched, partial, missing