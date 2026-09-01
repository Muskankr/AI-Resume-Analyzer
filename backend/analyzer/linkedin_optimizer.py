"""
LinkedIn Profile Optimization Module.

This module contains logic to map parsed resume data into optimized,
platform-specific content tailored for LinkedIn profiles. It respects
character limits and LinkedIn's search algorithm preferences.
"""

import re
from typing import Dict, List, Any, Optional

# LinkedIn Character Limits (as of current platform standards)
LINKEDIN_LIMITS = {
    "headline": 220,
    "about": 2600,
    "experience_description": 2000,
    "skills": 50,  # Max 50 skills allowed on LinkedIn
}

# Common strong action verbs for LinkedIn optimization
ACTION_VERBS = [
    "Spearheaded",
    "Orchestrated",
    "Engineered",
    "Developed",
    "Implemented",
    "Optimized",
    "Architected",
    "Led",
    "Managed",
    "Directed",
    "Transformed",
    "Accelerated",
    "Pioneered",
    "Streamlined",
    "Revitalized",
    "Cultivated",
]

# Weak phrases to replace for higher impact
WEAK_PHRASES = [
    "responsible for",
    "duties included",
    "helped with",
    "worked on",
    "tasked with",
    "assisted in",
    "participated in",
    "handled",
]

# Auxiliaries that turn a weak phrase into a passive clause. Swapping
# "responsible for" for "spearheaded" inside "I was responsible for the
# rollout" produces "I was spearheaded the rollout" — passive, and not
# English. When one of these introduces the phrase it is replaced along with
# it, so the clause comes back active.
_LEADING_AUXILIARIES = r"(?:was|were|is|are|been|being)\s+"

WEAK_PHRASE_PATTERN = re.compile(
    r"\b(?:"
    + _LEADING_AUXILIARIES
    + r")?(?:"
    + "|".join(re.escape(phrase) for phrase in WEAK_PHRASES)
    + r")\b",
    re.IGNORECASE,
)

# Whole-word match. `"Led" in description` is a substring test, and "led" is
# inside "handled", "fulfilled", "called", "scheduled" and "modelled" — so
# "Handled customer escalations and fulfilled orders" counted as already
# carrying a strong verb and was left exactly as it was.
ACTION_VERB_PATTERN = re.compile(
    r"\b(?:" + "|".join(re.escape(verb) for verb in ACTION_VERBS) + r")\b",
    re.IGNORECASE,
)

# `.title()` is wrong for most technical skills: it produced "Javascript",
# "Ios", "Node.Js", "Postgresql" and "Rest Api". These go straight onto a
# profile whose skill matching is string-based, so the spelling matters.
#
# Keyed on the lowercased skill. Anything not listed falls through to the
# rules in `_canonical_skill` below.
SKILL_DISPLAY_CASING = {
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "node js": "Node.js",
    "react.js": "React.js",
    "next.js": "Next.js",
    "vue.js": "Vue.js",
    "jquery": "jQuery",
    "html": "HTML",
    "css": "CSS",
    "scss": "SCSS",
    "sass": "Sass",
    "sql": "SQL",
    "nosql": "NoSQL",
    "mysql": "MySQL",
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "sqlite": "SQLite",
    "mongodb": "MongoDB",
    "graphql": "GraphQL",
    "rest api": "REST API",
    "restful api": "RESTful API",
    "grpc": "gRPC",
    "api": "API",
    "ios": "iOS",
    "macos": "macOS",
    "android": "Android",
    "aws": "AWS",
    "gcp": "GCP",
    "ci/cd": "CI/CD",
    "cicd": "CI/CD",
    "devops": "DevOps",
    "mlops": "MLOps",
    "github": "GitHub",
    "gitlab": "GitLab",
    "php": "PHP",
    "asp.net": "ASP.NET",
    ".net": ".NET",
    "dotnet": ".NET",
    "c#": "C#",
    "c++": "C++",
    "objective-c": "Objective-C",
    "pytorch": "PyTorch",
    "tensorflow": "TensorFlow",
    "numpy": "NumPy",
    "scipy": "SciPy",
    "pandas": "pandas",
    "scikit-learn": "scikit-learn",
    "matlab": "MATLAB",
    "json": "JSON",
    "xml": "XML",
    "yaml": "YAML",
    "saas": "SaaS",
    "ux": "UX",
    "ui": "UI",
    "ui/ux": "UI/UX",
    "seo": "SEO",
    "etl": "ETL",
    "jwt": "JWT",
    "oauth": "OAuth",
    "openai": "OpenAI",
    "nlp": "NLP",
    "llm": "LLM",
}

# The closing clause of a generated headline, kept as a name so the pieces of
# `optimize_headline` read as a list of segments.
HEADLINE_TAGLINE = "Driving Innovation and Measurable Results"


def clean_and_format_text(text: str) -> str:
    """
    Cleans and formats text by removing extra whitespace and normalizing line breaks.

    Args:
        text (str): The raw text to clean.

    Returns:
        str: The cleaned and formatted text.
    """
    if not text or not isinstance(text, str):
        return ""

    # Order matters, and used to be the wrong way round. `\s` includes
    # newlines, so collapsing on `\s+` first flattened every paragraph break
    # into a space and left the second substitution with nothing to match —
    # it could never fire. The About section came back as one wall of text,
    # and the "\n\nCore Competencies:" block appended below was glued onto
    # the end of the preceding sentence.
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Horizontal whitespace only: `[^\S\n]` is "whitespace that is not a
    # newline", which is the set `\s+` was too broad for.
    text = re.sub(r"[^\S\n]+", " ", text)

    # Trim the spaces that sat either side of a line break.
    text = re.sub(r" *\n *", "\n", text)

    # Any run of blank lines becomes exactly one paragraph break.
    text = re.sub(r"\n{2,}", "\n\n", text)

    return text.strip()


def _truncate(text: str, limit: int) -> str:
    """Cut `text` to `limit` characters, ending on a word where possible.

    LinkedIn rejects anything over the limit outright, so the cut has to
    happen — but slicing blind left profiles ending mid-word ("...Kubernet...").
    Backs off to the last space when one is reasonably close to the end;
    falls back to the blind cut when there is no space to back off to, which
    keeps the result exactly `limit` characters for unbroken input.
    """
    if len(text) <= limit:
        return text

    cut = text[: limit - 3]
    boundary = cut.rfind(" ")
    # Only worth backing off if it does not throw away most of the text.
    if boundary > limit * 0.6:
        cut = cut[:boundary]

    return cut.rstrip(" |,;:-") + "..."


def _canonical_skill(skill: str) -> str:
    """Return `skill` spelled the way the thing is actually spelled.

    Three rules, in order:

    1. A known technical skill takes its canonical casing from
       ``SKILL_DISPLAY_CASING``.
    2. A skill that already carries a capital past its first character is
       left alone — "iOS", "PostgreSQL" and "GraphQL" are deliberate, and
       ``.title()`` destroys all three.
    3. Everything else is title-cased, which is what plain lowercase input
       ("django", "project management") wants.
    """
    cleaned = clean_and_format_text(skill).replace("\n", " ").strip()
    if not cleaned:
        return ""

    canonical = SKILL_DISPLAY_CASING.get(cleaned.lower())
    if canonical:
        return canonical

    if any(char.isupper() for char in cleaned[1:]):
        return cleaned

    return cleaned.title()


def optimize_headline(
    current_headline: str, target_role: str, top_skills: List[str]
) -> str:
    """
    Optimizes the LinkedIn headline to be impactful and within character limits.

    `current_headline` was declared, documented and never read: whatever the
    user had written was discarded and everyone got the same template. It
    leads the result now, because it is the only part of a headline that says
    something specific about this person.

    Args:
        current_headline (str): The existing or extracted headline.
        target_role (str): The target job role.
        top_skills (List[str]): A list of top skills to include.

    Returns:
        str: The optimized headline.
    """
    target_role = (target_role or "").strip() or "Professional"

    current = clean_and_format_text(current_headline).replace("\n", " ").strip()

    segments = []
    if current:
        segments.append(current)
    # The role is only worth its own segment if the headline does not already
    # say it — otherwise "Software Engineer | Software Engineer | ...".
    if target_role.lower() not in " | ".join(segments).lower():
        segments.append(target_role)

    skills = [_canonical_skill(skill) for skill in (top_skills or [])[:3]]
    skills_str = " | ".join(skill for skill in skills if skill)
    if skills_str:
        segments.append(skills_str)

    segments.append(HEADLINE_TAGLINE)

    return _truncate(" | ".join(segments), LINKEDIN_LIMITS["headline"])


def _replace_weak_phrase(match: "re.Match") -> str:
    """Swap a weak phrase for "spearheaded", keeping the sentence's casing.

    The replacement was always lowercase, so a sentence opening on "Responsible
    for ..." came back opening on "spearheaded ...".
    """
    replacement = "spearheaded"
    return replacement.capitalize() if match.group(0)[0].isupper() else replacement


def optimize_about_section(
    about_text: str, target_role: str, top_skills: List[str]
) -> str:
    """
    Optimizes the LinkedIn 'About' section for readability and keyword density.

    Args:
        about_text (str): The original about section or summary.
        target_role (str): The target job role.
        top_skills (List[str]): A list of top skills to include.

    Returns:
        str: The optimized 'About' section.
    """
    if not about_text:
        about_text = f"Results-driven {target_role} with a proven track record of delivering high-impact solutions."

    optimized_text = WEAK_PHRASE_PATTERN.sub(_replace_weak_phrase, about_text)

    # Mention any of the top skills the text does not already name. The old
    # check tested for the whole comma-joined string in one go, which is
    # essentially never present, so the block was appended unconditionally —
    # including skills the sentence above had just listed.
    lowered = optimized_text.lower()
    unmentioned = [
        canonical
        for canonical in (_canonical_skill(skill) for skill in (top_skills or [])[:5])
        if canonical and canonical.lower() not in lowered
    ]
    if unmentioned:
        optimized_text += f"\n\nCore Competencies: {', '.join(unmentioned)}."

    optimized_text = clean_and_format_text(optimized_text)

    return _truncate(optimized_text, LINKEDIN_LIMITS["about"])


def optimize_experience(experiences: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Optimizes experience entries for LinkedIn, focusing on impact and action verbs.

    Args:
        experiences (List[Dict[str, Any]]): A list of experience dictionaries.

    Returns:
        List[Dict[str, Any]]: A list of optimized experience dictionaries.
    """
    optimized_experiences = []

    for exp in experiences or []:
        title = exp.get("title") or "Professional"
        company = exp.get("company") or "Company"

        # Held separately. `description` used to be reassigned by the
        # enhancement below and then handed back as "original_description",
        # so the field whose whole purpose is a before/after comparison
        # returned the "after".
        original_description = exp.get("description") or ""

        description = original_description
        if description and not ACTION_VERB_PATTERN.search(description):
            description = (
                f"Spearheaded key initiatives as {title} at {company}. {description}"
            )

        optimized_desc = _truncate(
            clean_and_format_text(description),
            LINKEDIN_LIMITS["experience_description"],
        )

        optimized_experiences.append(
            {
                "title": title,
                "company": company,
                "description": optimized_desc,
                "original_description": original_description,
            }
        )

    return optimized_experiences


def optimize_skills(skills: List[str]) -> List[str]:
    """
    Optimizes and deduplicates skills for the LinkedIn Skills section.

    Args:
        skills (List[str]): A list of extracted skills.

    Returns:
        List[str]: A deduplicated and formatted list of skills, max 50.
    """
    # `dict` rather than `set`: insertion order is the caller's relevance
    # order, and the cut below depends on it. Keyed on the lowercased form so
    # "python" and "Python" collapse to one entry.
    seen: Dict[str, str] = {}
    for skill in skills or []:
        if not skill or not isinstance(skill, str):
            continue
        canonical = _canonical_skill(skill)
        if canonical:
            seen.setdefault(canonical.lower(), canonical)

    # Cut *before* sorting. Sorting first and truncating after threw away the
    # caller's ordering, so a profile with more than 50 skills kept the
    # alphabetically first 50 rather than the 50 most relevant — everything
    # from roughly "R" onward was dropped regardless of how central it was.
    kept = list(seen.values())[: LINKEDIN_LIMITS["skills"]]

    # Alphabetical for display, once the selection is settled.
    return sorted(kept)


def generate_linkedin_profile(resume_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main function to generate a fully optimized LinkedIn profile from resume data.

    Args:
        resume_data (Dict[str, Any]): The parsed resume data.

    Returns:
        Dict[str, Any]: The optimized LinkedIn profile data.
    """
    target_role = resume_data.get("target_role", "Professional")
    top_skills = resume_data.get("skills", [])
    summary = resume_data.get("summary", "")
    experiences = resume_data.get("experiences", [])

    return {
        "headline": optimize_headline(
            resume_data.get("headline", ""), target_role, top_skills
        ),
        "about": optimize_about_section(summary, target_role, top_skills),
        "experiences": optimize_experience(experiences),
        "skills": optimize_skills(top_skills),
        "limits": LINKEDIN_LIMITS,
    }
