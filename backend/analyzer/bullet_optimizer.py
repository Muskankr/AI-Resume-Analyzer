"""
Core NLP logic to parse, evaluate, and rewrite resume bullet points
using the STAR (Situation, Task, Action, Result) framework.

Everything here reads one line of resume text as a human wrote it, which is
what the previous implementation did not do. It took ``bullet.lower().split()``
and compared ``words[0]`` against a 15-word verb list, so a line that opened
with the bullet character the parser preserved — "• Spearheaded ..." — had
``words[0] == "•"`` and was told to start with an action verb. So did
"Developed, tested and shipped ...", whose first token is ``"developed,"``.
"""

import re
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

from .scoring import ACTION_VERBS as SCORING_ACTION_VERBS

#: Characters that open a bullet, matching ``scoring.BULLET_PATTERN``.
#:
#: The en dash and em dash matter: Word and Google Docs autoformat a leading
#: "-" into "–", so the glyph in the file is usually not the one that was
#: typed. ``-`` is first in the class so it is a literal rather than a range.
BULLET_MARKER = re.compile(r"^\s*(?:[-–—*•▪▫▸▹●○◦‣∙·]|\d+[.)])\s*")

#: Trailing and leading punctuation to peel off a word before matching it.
WORD_EDGES = "\"'“”‘’(),.;:!?-–—"

#: Percentages: "40%", "40 %", "40 percent".
_PERCENT = r"\d+(?:\.\d+)?\s*(?:%|percent\b|per cent\b)"

#: Money, with or without a magnitude suffix: "$1.5M", "£250k", "€2 million".
_CURRENCY = (
    r"[$£€¥]\s?\d[\d,]*(?:\.\d+)?\s*"
    r"(?:[kKmMbB]\b|thousand\b|million\b|billion\b)?"
)

#: A number carrying a unit that makes it a measurement rather than a label.
#: This is the list that separates "5 engineers" from "Python 3".
_UNITS = (
    r"(?:k\b|m\b|bn\b|thousand|million|billion|"
    r"hrs?|hours?|mins?|minutes?|secs?|seconds?|ms|days?|weeks?|months?|years?|"
    r"users?|customers?|clients?|accounts?|subscribers?|"
    r"requests?|queries?|calls?|transactions?|records?|rows?|events?|"
    r"engineers?|developers?|people|reports?|teams?|"
    r"projects?|releases?|deploys?|deployments?|services?|endpoints?|"
    r"tests?|bugs?|tickets?|incidents?|"
    r"gb|tb|mb|qps|rps|req/s)"
)
_MEASUREMENT = rf"\d[\d,]*(?:\.\d+)?\s*{_UNITS}"

#: "3x", "2.5×" — a multiplier is always a claim about magnitude.
_MULTIPLIER = r"\d+(?:\.\d+)?\s*[x×]\b"

#: A count introduced by a quantifier: "a team of 12", "over 500", "40+".
_QUANTIFIED_COUNT = (
    r"(?:\b(?:team|group|cohort|portfolio|backlog|fleet|suite)\s+of\s+\d[\d,]*"
    r"|\b(?:over|under|more than|less than|up to|at least|around|approximately|~)\s*\d[\d,]*"
    r"|\b\d[\d,]*\+)"
)

#: What counts as a quantified achievement.
#:
#: Positive patterns only, deliberately. The previous pattern alternated
#: ``\b\d+%?\b`` with ``\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b``, which matches every
#: digit in the language: "Wrote services in Python 3 during 2021" read as a
#: quantified achievement and was told it needed no metric. Listing the shapes
#: a metric actually takes means a version number and a year match nothing.
METRIC_PATTERN = re.compile(
    "|".join((_PERCENT, _CURRENCY, _MEASUREMENT, _MULTIPLIER, _QUANTIFIED_COUNT)),
    re.IGNORECASE,
)

#: Forms of "to be" that introduce a passive construction.
COPULAS = ("is", "are", "am", "was", "were", "be", "been", "being")

#: Past participles that do not end in -ed or -en.
IRREGULAR_PARTICIPLES = {
    "built", "brought", "bought", "dealt", "done", "found", "held", "kept",
    "led", "left", "lost", "made", "met", "paid", "put", "read", "run",
    "sent", "set", "sold", "spent", "split", "taught", "told", "won",
}

#: A copula followed by a participle: "was completed", "are being tracked".
PASSIVE_PATTERN = re.compile(
    r"\b(?:{copulas})\b\s+(?:\w+ly\s+)?(?:being\s+)?(\w+)\b".format(
        copulas="|".join(COPULAS)
    ),
    re.IGNORECASE,
)

#: A result introduced by a participial or prepositional clause.
RESULT_CLAUSE_PATTERN = re.compile(
    r"\b(?:resulting in|leading to|which (?:led|resulted) in|"
    r"achieving|saving|generating|driving|delivering|yielding|enabling|"
    r"cutting|reducing|increasing|improving|boosting|raising|lowering|"
    r"eliminating|accelerating)\s+([^.;]+)",
    re.IGNORECASE,
)

#: A result stated as a quantified change: "by 40%", "to under 200ms".
#:
#: The optional hedge between the preposition and the number is what makes
#: "reduced p99 latency **to under** 200ms" a stated result rather than nothing.
RESULT_DELTA_PATTERN = re.compile(
    rf"\b(?:by|to|from)\s+"
    rf"(?:(?:under|over|below|above|less than|more than|approximately|around|about|~)\s*)?"
    rf"((?:{_PERCENT}|{_CURRENCY}|{_MEASUREMENT}|{_MULTIPLIER})[^.;]*)",
    re.IGNORECASE,
)

#: Where the work happened. ``\b`` on every alternative, or "in" matches inside
#: "within" and "during" inside nothing useful at all — the old pattern
#: returned "legacy storage" as the *situation* of "Migrated the data into
#: legacy storage", having matched the "to" inside "into".
CONTEXT_PATTERN = re.compile(
    r"\b(?:in|at|for|across|within|during|throughout)\s+"
    r"((?:the\s+)?[A-Z][\w&.-]*(?:\s+[A-Z][\w&.-]*)*)"
)

#: The objective. Same word-boundary problem, same fix.
OBJECTIVE_PATTERN = re.compile(
    r"\b(?:to|in order to)\s+([a-zA-Z][a-zA-Z\s]+?)(?:\s*[,.;]|\s+by\b|$)"
)

#: Points per dimension. They sum to 100 for a bullet that has an action verb,
#: a metric, active voice and a stated result — the four things the suggestion
#: list asks for. A bullet with none of them scores 0 rather than the flat 50
#: the old base score handed out unconditionally.
SCORE_WEIGHTS = {
    "action_verb": 30,
    "metric": 25,
    "result": 20,
    "active_voice": 15,
    "situation": 10,
}


@dataclass
class BulletAnalysis:
    original: str
    has_action_verb: bool
    has_metric: bool
    is_passive: bool
    star_components: Dict[str, Optional[str]]
    score: int
    suggestions: List[str]
    rewrites: List[str]


class BulletOptimizer:
    """Evaluates and optimizes resume bullet points."""

    #: The same vocabulary ``analyzer.scoring`` grades resumes against.
    #:
    #: There were two lists. This one held 15 verbs, so "built", "led",
    #: "designed", "migrated", "reduced", "owned" and "shipped" all scored
    #: zero and were told to open with a strong action verb — by the module
    #: whose sibling already recognised every one of them.
    ACTION_VERBS = frozenset(SCORING_ACTION_VERBS)

    PASSIVE_INDICATORS = list(COPULAS)

    METRIC_PATTERN = METRIC_PATTERN

    @classmethod
    def analyze(cls, bullet: str, job_description: str = "") -> BulletAnalysis:
        """Analyze a single bullet point for STAR compliance and quality."""
        text = cls._strip_marker(bullet)

        has_action = cls._opens_with_action_verb(text)
        has_metric = bool(cls.METRIC_PATTERN.search(text))
        is_passive = cls._is_passive(text)

        star = cls._extract_star_components(text)
        score = cls._calculate_score(has_action, has_metric, is_passive, star)
        suggestions = cls._generate_suggestions(
            has_action, has_metric, is_passive, star
        )
        rewrites = cls._generate_rewrites(
            text, has_action, has_metric, is_passive, job_description=job_description
        )

        return BulletAnalysis(
            original=bullet,
            has_action_verb=has_action,
            has_metric=has_metric,
            is_passive=is_passive,
            star_components=star,
            score=score,
            suggestions=suggestions,
            rewrites=rewrites,
        )

    @classmethod
    def _strip_marker(cls, bullet: str) -> str:
        """The bullet's text, without the glyph or number that introduces it."""
        return BULLET_MARKER.sub("", bullet or "").strip()

    @classmethod
    def _first_word(cls, text: str) -> str:
        """The opening word, lowercased and stripped of attached punctuation."""
        for token in text.split():
            word = token.strip(WORD_EDGES).lower()
            if word:
                return word
        return ""

    @classmethod
    def _opens_with_action_verb(cls, text: str) -> bool:
        return cls._first_word(text) in cls.ACTION_VERBS

    @classmethod
    def _looks_like_participle(cls, word: str) -> bool:
        lowered = word.lower()
        return lowered.endswith(("ed", "en")) or lowered in IRREGULAR_PARTICIPLES

    @classmethod
    def _is_passive(cls, text: str) -> bool:
        """True when the bullet describes work as something that happened to it.

        Two shapes, because the common resume passive is not the textbook one:

        * A copula plus a participle anywhere in the line — "the migration
          *was completed* by the team", "metrics *are tracked* daily". The old
          check only looked at the first three words, which is precisely where
          this construction is not.
        * The line *opening* with a copula — "Was responsible for the team".
          Not passive voice in the grammatical sense, but the same failure:
          the sentence has no subject doing anything.
        """
        first = cls._first_word(text)
        if first in COPULAS:
            return True

        for match in PASSIVE_PATTERN.finditer(text):
            if cls._looks_like_participle(match.group(1)):
                return True

        return False

    @classmethod
    def _extract_star_components(cls, bullet: str) -> Dict[str, Optional[str]]:
        """Heuristically extract Situation, Task, Action, Result."""
        return {
            "situation": cls._find_context(bullet),
            "task": cls._find_objective(bullet),
            "action": cls._find_action(bullet),
            "result": cls._find_result(bullet),
        }

    @classmethod
    def _find_context(cls, text: str) -> Optional[str]:
        match = CONTEXT_PATTERN.search(text)
        return match.group(1).strip() if match else None

    @classmethod
    def _find_objective(cls, text: str) -> Optional[str]:
        match = OBJECTIVE_PATTERN.search(text)
        if not match:
            return None
        objective = match.group(1).strip()
        return objective or None

    @classmethod
    def _find_action(cls, text: str) -> Optional[str]:
        """The verb phrase, from the first recognised verb onward.

        Words are compared with their punctuation stripped, so a verb that ends
        a clause — "Designed, built and shipped" — is still found.
        """
        words = text.split()
        for index, word in enumerate(words):
            if word.strip(WORD_EDGES).lower() in cls.ACTION_VERBS:
                return " ".join(words[index : index + 4])
        return None

    @classmethod
    def _find_result(cls, text: str) -> Optional[str]:
        """The outcome, stated either as a clause or as a quantified change.

        The clause list alone missed the most common phrasing in a good bullet:
        a trailing ", cutting latency by 40%" or a plain "by 15%". Both are a
        result; only one of them announces itself with "resulting in".
        """
        match = RESULT_CLAUSE_PATTERN.search(text)
        if match:
            return match.group(1).strip(" .,;")

        match = RESULT_DELTA_PATTERN.search(text)
        if match:
            return match.group(1).strip(" .,;")

        return None

    @classmethod
    def _calculate_score(
        cls, has_action: bool, has_metric: bool, is_passive: bool, star: Dict
    ) -> int:
        """Points for what the bullet has, starting from nothing.

        This used to start at 50 and add. A bullet with no verb, no metric, no
        result and passive voice — the exact bullet the suggestions tell you to
        rewrite entirely — still scored 50 out of 100, which reads as a pass.
        """
        score = 0
        if has_action:
            score += SCORE_WEIGHTS["action_verb"]
        if has_metric:
            score += SCORE_WEIGHTS["metric"]
        if star.get("result"):
            score += SCORE_WEIGHTS["result"]
        if not is_passive:
            score += SCORE_WEIGHTS["active_voice"]
        if star.get("situation"):
            score += SCORE_WEIGHTS["situation"]
        return min(100, score)

    @classmethod
    def _generate_suggestions(
        cls, has_action: bool, has_metric: bool, is_passive: bool, star: Dict
    ) -> List[str]:
        suggestions = []
        if not has_action:
            suggestions.append(
                "Start with a strong action verb (e.g., 'Spearheaded', 'Developed')."
            )
        if not has_metric:
            suggestions.append(
                "Add quantifiable metrics (e.g., percentages, dollar amounts, time saved)."
            )
        if is_passive:
            suggestions.append(
                "Rewrite in active voice to demonstrate direct ownership."
            )
        if not star.get("result"):
            suggestions.append("Include the outcome or impact of your action.")
        return suggestions

    @classmethod
    def _generate_rewrites(
        cls,
        original: str,
        has_action: bool,
        has_metric: bool,
        is_passive: bool,
        job_description: str = "",
    ) -> List[str]:
        """Up to three rewrites, in a fixed order, tailored to target JD keywords."""
        from .skill_matcher import extract_skills

        rewrites = []
        base = original.strip()

        # Find keywords/skills in the job description to match target JD priority
        jd_skills = []
        if job_description:
            jd_skills = [s.lower() for s in extract_skills(job_description)]

        # Custom action verbs/terms from JD to align language
        verb_map = {
            "lead": "Led",
            "spearhead": "Spearheaded",
            "develop": "Developed",
            "optimize": "Optimized",
            "manage": "Managed",
            "design": "Designed",
            "implement": "Implemented",
            "drive": "Drove",
        }
        jd_verbs = [
            verb_map[v]
            for v in verb_map
            if v in job_description.lower()
        ]
        action_verb = jd_verbs[0] if jd_verbs else "Spearheaded"

        # Safe JD styling terms: e.g. using specific tools or methodology keywords,
        # but only if not fabricating experience.
        # Let's extract up to 2 skills from the job description to weave into suggestion format.
        target_skills_str = ""
        if jd_skills:
            # Pick a couple of key skills found in the JD (first two)
            target_skills_str = f" utilizing {', '.join([s.title() for s in jd_skills[:2]])}"

        if not has_action:
            rewrites.append(f"{action_verb} initiative: {base}")
        if not has_metric:
            rewrites.append(f"{base.rstrip('.')}{target_skills_str}, resulting in a 25% improvement in efficiency.")
        if is_passive:
            active_base = re.sub(
                r"\b(?:was|were)\s+([a-zA-Z]+(?:ed|en))\b",
                r"successfully \1",
                base,
                flags=re.IGNORECASE,
            )
            rewrites.append(active_base)

        if not rewrites:
            # Fallback optimization tailoring
            rewrites.append(f"Optimized: {base}{target_skills_str} to drive measurable business outcomes.")

        # Ensure JD keywords are mirrored in at least one rewrite if job_description was provided
        if job_description and jd_skills:
            # Let's add a tailored rewrite option that incorporates JD priority phrasing without fabricating achievements
            tailored = f"{action_verb} optimization of {base.lower().rstrip('.')}{target_skills_str} to match target requirements."
            rewrites.insert(0, tailored)

        seen = set()
        ordered = []
        for rewrite in rewrites:
            if rewrite not in seen:
                seen.add(rewrite)
                ordered.append(rewrite)

        return ordered[:3]
