import re

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


def build_alias_patterns():
    """
    Build compiled regex patterns for every canonical skill
    and all of its aliases.
    """

    dictionary = load_skill_dictionary()

    patterns = {}

    for category in dictionary.values():

        if not isinstance(category, list):
            continue

        for skill in category:

            canonical = skill.get("name")

            if not canonical:
                continue

            aliases = set(skill.get("aliases", []))

            # Canonical name should also match.
            aliases.add(canonical)

            compiled_patterns = []

            for alias in aliases:

                # Match complete words only.
                # Prevents false positives such as:
                # react -> reactive
                # c -> education
                pattern = re.compile(
                    rf"(?<!\w){re.escape(alias.lower())}(?!\w)",
                    re.IGNORECASE,
                )

                compiled_patterns.append(pattern)

            patterns[canonical] = compiled_patterns

    return patterns


PATTERNS = build_alias_patterns()


def extract_skills(text: str):
    """
    Extract canonical skills from resume text.

    Returns:
        list[str]
    """

    normalized = normalize_text(text)

    detected = []

    for canonical, regexes in PATTERNS.items():

        for regex in regexes:

            if regex.search(normalized):

                detected.append(canonical)

                break

    # Preserve insertion order and remove duplicates.
    return list(dict.fromkeys(detected))