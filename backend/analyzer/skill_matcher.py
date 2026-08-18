import re
import ahocorasick

from .skill_dictionary import load_skill_dictionary


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
    """
    Checks if a matched substring is bounded by non-word characters.
    Equivalent to regex (?<!\w) ... (?!\w)
    """
    def is_word_char(c):
        return c.isalnum() or c == '_'

    if start > 0 and is_word_char(text[start - 1]):
        return False
    if end < len(text) and is_word_char(text[end]):
        return False

    return True


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