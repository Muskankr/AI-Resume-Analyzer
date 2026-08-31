import re
from typing import TypedDict

NUMERIC_PATTERN = re.compile(
    r"""
    \d+
    | \d+[%xX]
    | \$[\d,]+
    | [\d,]+\s*(k|m|b)\b
    | \b(zero|one|two|three|four|five|six|seven|eight|nine|ten|
         hundred|thousand|million|billion|dozen|several|multiple|
         first|second|third|half|double|triple|quadruple)\b
    | \b\d+\+
    | \b\d+[-]\d+
    """,
    re.VERBOSE | re.IGNORECASE,
)

EXEMPT_PATTERNS = [
    re.compile(r, re.IGNORECASE)
    for r in [
        r"^(objective|summary|profile|about|overview)\s*[:\-]",
        r"^(skills?|technologies|tools?|languages?|frameworks?)\s*[:\-]",
        r"@",
        r"\b(university|college|school|bachelor|master|phd|b\.?s\.?|m\.?s\.?|gpa)\b",
        r"\b(january|february|march|april|may|june|july|august|september|october|november|december)\b",
        r"^\s*references\b",
    ]
]

ACCOMPLISHMENT_VERBS = re.compile(
    r"\b(achiev|improv|increas|decreas|reduc|optimiz|accelerat|deliver|"
    r"develop|launch|lead|led|manag|built|build|creat|design|implement|automat|"
    r"deploy|drove|generat|saved|cut|grew|scal|streamlin|transform|"
    r"boost|enhanc|resolv|migrat|refactor|consolidat|negoti|complet|"
    r"execut|oversaw|coordin|establish|spearhead|champion)\w*",
    re.IGNORECASE,
)

METRIC_PROMPTS = {
    "improv":  "e.g. 'improved load time by 40%'",
    "increas": "e.g. 'increased revenue by $50k'",
    "decreas": "e.g. 'decreased bug count by 60%'",
    "reduc":   "e.g. 'reduced deployment time from 2h to 15 min'",
    "optimiz": "e.g. 'optimized query time from 3s to 200ms'",
    "lead":    "e.g. 'led a team of 5 engineers'",
    "led":     "e.g. 'led a team of 5 engineers'",
    "manag":   "e.g. 'managed 3 direct reports'",
    "develop": "e.g. 'developed 3 REST APIs serving 10k daily users'",
    "launch":  "e.g. 'launched feature used by 5,000+ customers'",
    "built":   "e.g. 'built a pipeline processing 1M records/day'",
    "automat": "e.g. 'automated 8 workflows, saving 20 hrs/week'",
    "deploy":  "e.g. 'deployed 12 microservices to AWS'",
    "drove":   "e.g. 'drove a 25% increase in conversion rate'",
    "saved":   "e.g. 'saved $30k/year in infrastructure costs'",
    "grew":    "e.g. 'grew user base from 500 to 5,000 in 6 months'",
    "scal":    "e.g. 'scaled system to handle 100k concurrent requests'",
    "resolv":  "e.g. 'resolved 95% of P1 incidents within SLA'",
    "default": "Try adding a number, percentage, dollar amount, or time saved.",
}


class QuantifyNudge(TypedDict):
    line_index: int
    original_text: str
    suggestion: str
    hint: str


def is_exempt(line: str) -> bool:
    stripped = line.strip().lstrip("-*▪▸ \t")
    if len(stripped) < 15:
        return True
    for pat in EXEMPT_PATTERNS:
        if pat.search(stripped):
            return True
    return False


def _pick_hint(line: str) -> str:
    for key, hint in METRIC_PROMPTS.items():
        if key == "default":
            continue
        if re.search(r"\b" + key, line, re.IGNORECASE):
            return hint
    return METRIC_PROMPTS["default"]


def flag_unquantified_bullets(bullets: list[str]) -> list[QuantifyNudge]:
    nudges: list[QuantifyNudge] = []
    for idx, raw in enumerate(bullets):
        line = raw.strip()
        if not line:
            continue
        if is_exempt(line):
            continue
        if not ACCOMPLISHMENT_VERBS.search(line):
            continue
        if NUMERIC_PATTERN.search(line):
            continue
        nudges.append(QuantifyNudge(
            line_index=idx,
            original_text=raw,
            suggestion=(
                "This bullet describes an accomplishment but lacks a "
                "quantifiable detail. Adding a number, percentage, or "
                "metric will make it significantly stronger."
            ),
            hint=_pick_hint(line),
        ))
    return nudges
