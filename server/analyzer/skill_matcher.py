import re

from .skill_dictionary import load_skill_dictionary


def normalize_text(text: str) -> str:
    """Normalize resume text before skill matching."""
    text = text.lower()
    text = text.replace("\n", " ")
    text = re.sub(r"[^\w#+.-]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def build_alias_patterns():
    """Compile regex patterns for all canonical skills and aliases."""
    dictionary = load_skill_dictionary()
    patterns = {}

    for category in dictionary.values():
        # Ignore unexpected metadata entries
        if not isinstance(category, list):
            continue

        for skill in category:
            canonical = skill.get("name")
            if not canonical:
                continue

            aliases = set(skill.get("aliases", []))
            aliases.add(canonical)

            compiled_patterns = []

            for alias in aliases:
                compiled_patterns.append(
                    re.compile(
                        rf"(?<!\w){re.escape(alias.lower())}(?!\w)",
                        re.IGNORECASE,
                    )
                )

            patterns[canonical] = compiled_patterns

    return patterns


# Build regex cache once during module import
PATTERNS = build_alias_patterns()


def extract_skills(text: str):
    """Extract canonical skill names from resume text."""
    normalized = normalize_text(text)

    detected = []

    for canonical, regexes in PATTERNS.items():
        for pattern in regexes:
            if pattern.search(normalized):
                detected.append(canonical)
                break

    # Preserve insertion order while removing duplicates
    return list(dict.fromkeys(detected))