import re
import unicodedata
from typing import Dict, List, Any, Callable, Tuple
from .section_headings import find_headings, SECTIONS, section_body
from .timeline import extract_ranges, FORMAT_LABELS

class ATSProfile:
    id = ""
    name = ""
    description = ""
    
    def simulate(self, text: str, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

def extract_contact_info(text: str) -> Dict[str, bool]:
    has_email = bool(re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text))
    has_phone = bool(re.search(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text))
    return {"email": has_email, "phone": has_phone}

class WorkdaySimulator(ATSProfile):
    id = "workday"
    name = "Workday (Simulated)"
    description = "Approximates Workday's strict parsing. Relies heavily on exact chronological dates and standard headings. Known to struggle with ambiguous section names."
    
    def simulate(self, text: str, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        score = 100
        warnings = []
        recommendations = []
        detected_sections = []
        
        headings = find_headings(text)
        found_keys = {h.key for h in headings}
        
        # Check standard sections
        if "experience" not in found_keys:
            score -= 25
            warnings.append("Failed to detect an explicit 'Experience' section.")
            recommendations.append("Use standard headings like 'Work Experience' instead of creative variants.")
        else:
            detected_sections.append("Work Experience")
            
        if "education" not in found_keys:
            score -= 20
            warnings.append("Failed to detect an explicit 'Education' section.")
            recommendations.append("Ensure your education block is clearly labeled 'Education'.")
        else:
            detected_sections.append("Education")

        # Check dates
        dates = extract_ranges(text)
        if len(dates) < 2 and "experience" in found_keys:
            score -= 15
            warnings.append("Workday parser may fail to map employment dates accurately.")
            recommendations.append("Use standard date formats (e.g., MM/YYYY - MM/YYYY) for all roles.")
        
        # Contact
        contact = extract_contact_info(text)
        if not contact["email"] or not contact["phone"]:
            score -= 10
            warnings.append("Missing standard email or phone number formats.")
            
        return {
            "platform": self.name,
            "description": self.description,
            "compatibility_score": max(0, score),
            "detected_sections": detected_sections,
            "warnings": warnings,
            "recommendations": recommendations,
            "is_approximation": True
        }

class GreenhouseSimulator(ATSProfile):
    id = "greenhouse"
    name = "Greenhouse (Simulated)"
    description = "Approximates Greenhouse's modern parsing. Highly effective at extracting unstructured text and skills, but strictly requires easily identifiable contact information blocks."
    
    def simulate(self, text: str, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        score = 100
        warnings = []
        recommendations = []
        detected_sections = []
        
        # Contact is critical for Greenhouse
        contact = extract_contact_info(text)
        if not contact["email"]:
            score -= 30
            warnings.append("Critical: Email address not found. Greenhouse will fail to create a candidate profile properly.")
            recommendations.append("Place a standard email address at the very top of your resume.")
        if not contact["phone"]:
            score -= 10
            warnings.append("Phone number not detected.")
            
        # Skills
        skills = parsed_data.get("skills_found", [])
        if not skills:
            score -= 15
            warnings.append("No explicit skills detected for tagging.")
            recommendations.append("Include a dedicated 'Skills' section with comma-separated keywords.")
        else:
            detected_sections.append(f"Skills ({len(skills)} detected)")

        # Length check
        word_count = len(text.split())
        if word_count < 100:
            score -= 10
            warnings.append("Resume contains very little text, which may lead to poor search indexing.")
            
        return {
            "platform": self.name,
            "description": self.description,
            "compatibility_score": max(0, score),
            "detected_sections": detected_sections,
            "warnings": warnings,
            "recommendations": recommendations,
            "is_approximation": True
        }

class TaleoSimulator(ATSProfile):
    id = "taleo"
    name = "Taleo (Simulated)"
    description = "Approximates Taleo's legacy enterprise parsing. Rigid section sequencing and very sensitive to complex formatting, fonts, and excessively long resumes."
    
    def simulate(self, text: str, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        score = 100
        warnings = []
        recommendations = []
        detected_sections = []
        
        word_count = len(text.split())
        if word_count > 800:
            score -= 20
            warnings.append("Resume is too long (> 800 words). Taleo may truncate or fail to parse later sections.")
            recommendations.append("Condense your resume to focus on the most relevant 10 years of experience.")
            
        # Taleo hates weird characters
        if re.search(r'[^\x00-\x7F]+', text):
            score -= 10
            warnings.append("Detected non-standard/Unicode characters.")
            recommendations.append("Avoid complex icons, emojis, or non-standard bullet points.")
            
        headings = find_headings(text)
        found_keys = {h.key for h in headings}
        
        if "summary" in found_keys:
            detected_sections.append("Summary")
        if "experience" in found_keys:
            detected_sections.append("Experience")
        else:
            score -= 30
            warnings.append("Mandatory employment history block missing or unreadable.")
            
        return {
            "platform": self.name,
            "description": self.description,
            "compatibility_score": max(0, score),
            "detected_sections": detected_sections,
            "warnings": warnings,
            "recommendations": recommendations,
            "is_approximation": True
        }

# Registry
PROFILES = {
    "workday": WorkdaySimulator(),
    "greenhouse": GreenhouseSimulator(),
    "taleo": TaleoSimulator()
}

def get_simulator(profile_id: str) -> ATSProfile:
    return PROFILES.get(profile_id.lower())

def get_all_profiles() -> List[Dict[str, str]]:
    return [{"id": p.id, "name": p.name, "description": p.description} for p in PROFILES.values()]


# ═══════════════════════════════════════════════════════════════════════════════
# 10-point ATS Compatibility Checker
#
# The simulators above answer "how would Workday/Greenhouse/Taleo treat this?".
# The checker below answers a different, vendor-neutral question: "does this
# resume follow the ten formatting rules that every mainstream ATS depends on?"
#
# Design goal: nothing is a black box. Every one of the ten criteria returns
#   - the points it awarded and the maximum it could award (always out of 10),
#   - a plain-language status (pass / warn / fail),
#   - the concrete evidence it saw in the resume text, and
#   - the fixes that would recover the most points.
# The overall score is just the sum of the ten criteria (so 0..100), and the
# "estimated ATS pass rate" is a documented interpolation from that score,
# capped when a parser-fatal problem is present. No magic constants without a
# comment next to them.
# ═══════════════════════════════════════════════════════════════════════════════

CRITERION_MAX = 10          # every criterion is scored out of 10 ...
NUM_CRITERIA = 10           # ... and there are ten of them -> overall is 0..100

CORE_SECTIONS = ("experience", "education", "skills")   # an ATS files by these
BONUS_SECTIONS = ("summary", "projects")

# ~450 words per page is the usual single-column estimate; the band below is
# "roughly one to two pages", which is what recruiters and parsers expect.
WORDS_PER_PAGE = 450
LENGTH_MIN_WORDS = 400
LENGTH_MAX_WORDS = 850

# Non-letter symbols that are common and harmless in real resumes: curly
# quotes, en/em dashes, the bullet, the ellipsis and a non-breaking space.
_SAFE_NON_ASCII = set("‘’“”–—•… ")

_EMOJI_RE = re.compile(
    "[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF⬀-⯿]"
)
_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
_PHONE_RE = re.compile(r"(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}")
_LINKEDIN_RE = re.compile(r"linkedin\.com/in/[\w%-]+", re.IGNORECASE)
_LOCATION_RE = re.compile(r"\b[A-Z][a-zA-Z.]+,\s*(?:[A-Z]{2}\b|[A-Z][a-z]+\b)")
_DEGREE_RE = re.compile(
    r"\b(bachelor|master|associate|doctorate|"
    r"b\.?\s?s\.?|b\.?\s?a\.?|m\.?\s?s\.?|m\.?\s?a\.?|m\.?\s?b\.?a\.?|ph\.?\s?d|"
    r"b\.?tech|m\.?tech|b\.?e\.?|b\.?sc|m\.?sc|diploma|degree)\b",
    re.IGNORECASE,
)

# A small, uncontroversial action-verb list for the no-job-description path of
# the keyword check. Not exhaustive on purpose - it only needs to tell "this
# resume uses achievement language" from "this resume is a list of duties".
_ACTION_VERBS = {
    "led", "built", "designed", "implemented", "developed", "created", "launched",
    "managed", "improved", "increased", "reduced", "optimized", "delivered",
    "spearheaded", "architected", "migrated", "automated", "streamlined",
    "mentored", "analyzed", "deployed", "integrated", "refactored", "established",
    "coordinated", "achieved", "generated", "drove", "owned", "shipped", "scaled",
    "negotiated", "resolved", "trained", "supervised",
}

_JD_STOPWORDS = {
    "the", "and", "for", "with", "was", "this", "that", "from", "are", "you",
    "your", "our", "their", "its", "have", "has", "had", "will", "would", "can",
    "could", "should", "must", "not", "but", "they", "them", "who", "which",
    "job", "role", "work", "team", "teams", "company", "including", "etc",
    "experience", "skills", "ability", "responsibilities", "requirements",
    "preferred", "plus", "strong", "years", "year", "using", "well", "able",
}


def _status(earned: int, maximum: int) -> str:
    """pass at >=80% of the points, warn at >=50%, fail below that."""
    pct = earned / maximum if maximum else 1.0
    if pct >= 0.8:
        return "pass"
    if pct >= 0.5:
        return "warn"
    return "fail"


def _criterion(cid, label, why, earned, evidence, fixes) -> Dict[str, Any]:
    """Assemble one criterion result, clamping the score to 0..CRITERION_MAX."""
    earned = max(0, min(CRITERION_MAX, int(round(earned))))
    return {
        "id": cid,
        "label": label,
        "earned": earned,
        "max": CRITERION_MAX,
        "status": _status(earned, CRITERION_MAX),
        "why_it_matters": why,
        "evidence": [e for e in evidence if e],
        "fixes": [{"text": t, "points": max(1, int(p))} for t, p in fixes if t],
    }


def _split_skill_items(body: str) -> List[str]:
    """Break a skills block into individual, de-duplicated entries."""
    if not body:
        return []
    items, seen = [], set()
    for part in re.split(r"[,\n;•|·]", body):
        token = part.strip(" \t-–—:*•").strip()
        if 1 <= len(token) <= 40 and re.search(r"[A-Za-z]", token):
            key = token.lower()
            if key not in seen:
                seen.add(key)
                items.append(token)
    return items


def _weird_characters(text: str) -> Dict[str, int]:
    """Non-ASCII characters that are *not* letters and *not* on the safe list.

    Accented letters and non-Latin scripts (real names) pass; decorative
    glyphs, box drawing, arrows, ligatures and private-use junk do not.
    """
    weird: Dict[str, int] = {}
    for ch in text:
        if ord(ch) < 128 or ch in _SAFE_NON_ASCII:
            continue
        if unicodedata.category(ch).startswith("L"):   # a letter in some script
            continue
        weird[ch] = weird.get(ch, 0) + 1
    return weird


# ── the ten checks ───────────────────────────────────────────────────────────
# Each takes the shared `ctx` dict and returns a `_criterion(...)` result.

def _check_section_headers(ctx) -> Dict[str, Any]:
    keys = ctx["heading_keys"]
    earned, evidence, fixes = 0, [], []

    present_core = [k for k in CORE_SECTIONS if k in keys]
    missing_core = [k for k in CORE_SECTIONS if k not in keys]
    earned += 3 * len(present_core)                       # 3 points per core section
    if any(k in keys for k in BONUS_SECTIONS):            # a Summary/Projects heading
        earned += 1

    detected = [SECTIONS[k][0] for k in keys if k in SECTIONS]
    if detected:
        evidence.append("Detected headings: " + ", ".join(detected) + ".")
    else:
        evidence.append("No standard section heading was found on its own line.")
    for k in missing_core:
        name = SECTIONS[k][0]
        evidence.append(f"No recognisable '{name}' heading.")
        fixes.append((f"Add a plain '{name}' heading on its own line.", 3))

    return _criterion(
        "section_headers", "Standard section headings",
        "An ATS files your content into fields by reading headings like 'Work "
        "Experience', 'Education' and 'Skills'. Missing or creatively named "
        "headings make whole sections disappear.",
        earned, evidence, fixes,
    )


def _check_contact_info(ctx) -> Dict[str, Any]:
    text = ctx["text"]
    earned, evidence, fixes = 0, [], []

    email = _EMAIL_RE.search(text)
    phone = _PHONE_RE.search(text)
    linkedin = _LINKEDIN_RE.search(text)
    location = _LOCATION_RE.search(text)
    ctx["flags"]["has_email"] = bool(email)

    if email:
        earned += 4
        evidence.append(f"Email found: {email.group(0)}")
    else:
        evidence.append("No email address detected.")
        fixes.append(("Put a professional email address in the top few lines.", 4))
    if phone:
        earned += 3
        evidence.append(f"Phone number found: {phone.group(0)}")
    else:
        evidence.append("No phone number detected.")
        fixes.append(("Add a phone number, e.g. (555) 123-4567.", 3))
    if linkedin:
        earned += 2
        evidence.append("LinkedIn URL found.")
    else:
        fixes.append(("Add your LinkedIn URL (linkedin.com/in/...).", 2))
    if location:
        earned += 1
        evidence.append(f"Location found: {location.group(0)}")
    else:
        fixes.append(("Add your city and state/country for location filters.", 1))

    return _criterion(
        "contact_info", "Contact information",
        "Recruiters filter and contact you on these fields. If the parser "
        "cannot find an email, your application can be unreachable.",
        earned, evidence, fixes,
    )


def _check_dates(ctx) -> Dict[str, Any]:
    ranges = ctx["date_ranges"]
    earned, evidence, fixes = 0, [], []

    if len(ranges) >= 1:
        earned += 4
    if len(ranges) >= 2:
        earned += 3

    formats = {
        f for r in ranges for f in (r.start_format, r.end_format)
        if f and f != "present"
    }

    if not ranges:
        evidence.append("No parseable employment date ranges were found.")
        fixes.append(("Give every role a month-and-year range, e.g. "
                      "'Mar 2021 - Jun 2023'.", 7))
    else:
        evidence.append(
            f"Found {len(ranges)} date range(s), e.g. '{ranges[0].text.strip()}'."
        )
        if len(ranges) < 2:
            fixes.append(("List start and end dates for each role so the "
                          "timeline can be reconstructed.", 3))
        if len(formats) <= 1:
            earned += 3
            evidence.append("Date formats are consistent.")
        else:
            labels = sorted(FORMAT_LABELS.get(f, f) for f in formats)
            evidence.append("Mixed date formats: " + ", ".join(labels) + ".")
            fixes.append(("Use one date format everywhere (e.g. 'Jan 2020').", 3))

    return _criterion(
        "date_formatting", "Date formatting & consistency",
        "Parsers build your career timeline from date ranges. Missing or "
        "mixed formats produce gaps and mis-dated roles.",
        earned, evidence, fixes,
    )


def _check_encoding(ctx) -> Dict[str, Any]:
    text = ctx["text"]
    earned, evidence, fixes = CRITERION_MAX, [], []

    emoji = _EMOJI_RE.findall(text)
    if emoji:
        earned -= 3
        evidence.append(f"{len(emoji)} emoji / pictograph character(s) found.")
        fixes.append(("Remove emoji and pictographs - parsers often turn them "
                      "into mojibake.", 3))

    weird = ctx["weird_chars"]
    if weird:
        penalty = min(6, len(weird) * 2)                  # 2 points per symbol type
        earned -= penalty
        shown = ", ".join(repr(c) for c in list(weird)[:6])
        evidence.append(f"{len(weird)} unusual symbol type(s): {shown}.")
        fixes.append(("Replace decorative symbols and ligatures with plain "
                      "ASCII ('-', '*').", penalty))

    if not emoji and not weird:
        evidence.append("No problematic characters - the text is ASCII-clean.")

    return _criterion(
        "encoding", "Character encoding",
        "Special glyphs and smart symbols can be dropped or garbled when the "
        "ATS re-encodes your file, corrupting nearby words.",
        earned, evidence, fixes,
    )


def _check_keywords(ctx) -> Dict[str, Any]:
    jd = (ctx["job_description"] or "").strip()
    text_l = ctx["lower"]
    earned, evidence, fixes = 0, [], []

    if jd:
        counts: Dict[str, int] = {}
        for w in re.findall(r"[a-zA-Z][a-zA-Z+#.\-]{2,}", jd.lower()):
            if w not in _JD_STOPWORDS:
                counts[w] = counts.get(w, 0) + 1
        keywords = [w for w, _ in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:25]]

        if not keywords:
            earned = 5
            evidence.append("The job description had no distinctive keywords to match.")
        else:
            matched = [w for w in keywords if w in text_l]
            missing = [w for w in keywords if w not in text_l]
            ratio = len(matched) / len(keywords)
            # Matching 60% of the job's own vocabulary is treated as full marks;
            # few real resumes echo more than that without keyword-stuffing.
            earned = CRITERION_MAX * min(1.0, ratio / 0.6)
            evidence.append(
                f"Matched {len(matched)} of {len(keywords)} key terms from the "
                f"job description ({round(ratio * 100)}%)."
            )
            if matched:
                evidence.append("Present: " + ", ".join(matched[:12]) + ".")
            if missing:
                evidence.append("Missing: " + ", ".join(missing[:12]) + ".")
                fixes.append(("Where it is truthful, add these job-description "
                              "terms: " + ", ".join(missing[:8]) + ".",
                              min(8, len(missing))))
    else:
        verbs = {v for v in _ACTION_VERBS if re.search(rf"\b{v}\b", text_l)}
        quantified = len(re.findall(r"\d+\s?%|\$\s?\d|\b\d{2,}\b", text_l))
        skill_items = ctx["skill_items"]

        if len(skill_items) >= 5:
            earned += 4
            evidence.append(f"Skills section lists {len(skill_items)} concrete items.")
        else:
            evidence.append("Few concrete skills listed for keyword matching.")
            fixes.append(("List 5-8+ concrete tools/technologies in a Skills "
                          "section.", 4))
        if len(verbs) >= 5:
            earned += 3
            evidence.append(
                f"{len(verbs)} distinct action verbs used "
                f"(e.g. {', '.join(sorted(verbs)[:4])})."
            )
        else:
            fixes.append(("Start bullets with strong action verbs "
                          "(led, built, reduced, shipped...).", 3))
        if quantified >= 4:
            earned += 3
            evidence.append(f"{quantified} quantified figures detected (numbers, %, $).")
        else:
            fixes.append(("Quantify at least 3-4 achievements with numbers, % or $.", 3))
        evidence.append("No job description supplied - scored on generic "
                        "keyword-readiness instead.")

    return _criterion(
        "keywords", "Keyword coverage",
        "The first ATS filter is almost always a keyword match against the job "
        "posting. Terms that never appear in your resume cannot be matched.",
        earned, evidence, fixes,
    )


def _check_tables(ctx) -> Dict[str, Any]:
    lines = ctx["nonblank_lines"]
    earned, evidence, fixes = CRITERION_MAX, [], []

    flagged = []
    for ln in lines:
        # A tab-flattened table row, or a line split into two blocks by a wide
        # run of spaces (right-aligned dates, "column A ....... column B").
        # Pipes are deliberately ignored - "React | Redux | Node" and
        # "email | phone | site" contact lines are not tables.
        if ln.count("\t") >= 2 or re.search(r"\S {4,}\S.* {3,}\S", ln):
            flagged.append(ln.strip())

    if ctx["has_tables"] or ctx["has_columns"]:
        earned = 2
        evidence.append("The uploaded document reported tables or multiple columns.")
        fixes.append(("Rebuild the resume as a single column with no tables.", 8))
    elif len(flagged) >= 6:
        earned = 3
    elif len(flagged) >= 3:
        earned = 6
    elif len(flagged) >= 1:
        earned = 8

    if flagged:
        evidence.append(
            f"{len(flagged)} line(s) look column-aligned or tabular, e.g.: "
            f"\"{flagged[0][:80]}\"."
        )
        if not (ctx["has_tables"] or ctx["has_columns"]):
            fixes.append(("Replace tab/space column alignment with plain lines - "
                          "parsers read tables out of reading order.",
                          CRITERION_MAX - earned))
    else:
        evidence.append("Layout looks like clean single-column text.")

    return _criterion(
        "tables_columns", "Tables & multi-column layout",
        "Many parsers flatten tables and columns left-to-right, interleaving "
        "unrelated text and scrambling your bullet points.",
        earned, evidence, fixes,
    )


def _check_length(ctx) -> Dict[str, Any]:
    words = ctx["word_count"]
    pages = max(1, round(words / WORDS_PER_PAGE, 1))
    evidence, fixes = [], []

    if LENGTH_MIN_WORDS <= words <= LENGTH_MAX_WORDS:
        earned = 10
        evidence.append(
            f"{words} words (~{pages} page(s)) - inside the recommended "
            f"{LENGTH_MIN_WORDS}-{LENGTH_MAX_WORDS} word band."
        )
    elif 300 <= words < LENGTH_MIN_WORDS or LENGTH_MAX_WORDS < words <= 1000:
        earned = 7
    elif 200 <= words < 300 or 1000 < words <= 1200:
        earned = 4
    else:
        earned = 1

    if words > LENGTH_MAX_WORDS:
        evidence.append(f"{words} words (~{pages} pages) - longer than most "
                        f"recruiters and parsers expect.")
        fixes.append(("Trim toward one page (early career) or two at most; cut "
                      "older roles to 2-3 bullets.", 10 - earned))
    elif words < LENGTH_MIN_WORDS:
        evidence.append(f"Only {words} words - a parser has little to index.")
        fixes.append(("Expand bullets with responsibilities and quantified "
                      "impact to reach ~450-650 words.", 10 - earned))

    return _criterion(
        "length", "Resume length",
        "Too short and there is nothing to rank on; too long and later "
        "sections are truncated or skimmed.",
        earned, evidence, fixes,
    )


def _check_education(ctx) -> Dict[str, Any]:
    has_heading = "education" in ctx["heading_keys"]
    body = ctx["education_body"] or ctx["text"]
    degree = _DEGREE_RE.search(body)
    earned, evidence, fixes = 0, [], []

    if has_heading:
        earned += 5
        evidence.append("An 'Education' section heading is present.")
    else:
        evidence.append("No 'Education' heading found.")
        fixes.append(("Add an 'Education' heading, even if the section is short.", 5))
    if degree:
        earned += 5
        evidence.append(f"Qualification wording detected: '{degree.group(0).strip()}'.")
    else:
        evidence.append("No recognisable degree/qualification wording.")
        fixes.append(("State the qualification explicitly, e.g. 'B.S. in "
                      "Computer Science, 2020'.", 5))

    return _criterion(
        "education", "Education section",
        "Education is a structured field in every ATS; without a labelled "
        "section and a recognisable qualification it is stored as loose text.",
        earned, evidence, fixes,
    )


def _check_skills(ctx) -> Dict[str, Any]:
    has_heading = "skills" in ctx["heading_keys"]
    items = ctx["skill_items"]
    earned, evidence, fixes = 0, [], []

    if has_heading:
        earned += 4
        evidence.append("A 'Skills' section heading is present.")
    else:
        evidence.append("No 'Skills' heading found.")
        fixes.append(("Add a dedicated 'Skills' section for your tools and "
                      "technologies.", 4))

    count = len(items)
    if count >= 8:
        earned += 6
        evidence.append(f"{count} distinct skills listed.")
    elif count >= 4:
        earned += 3
        evidence.append(f"Only {count} skills listed.")
        fixes.append(("List at least 8 concrete, role-relevant skills.", 3))
    else:
        evidence.append("Fewer than 4 concrete skills detected.")
        fixes.append(("List 8+ concrete skills (languages, frameworks, tools), "
                      "comma- or line-separated.", 6))

    return _criterion(
        "skills", "Skills section",
        "The skills list is the densest keyword source on the resume and is "
        "matched directly against the job's required-skills field.",
        earned, evidence, fixes,
    )


def _check_text_purity(ctx) -> Dict[str, Any]:
    text = ctx["text"]
    words = ctx["word_count"]
    dense = re.sub(r"\s", "", text)
    letters = [c for c in text if c.isalpha()]
    alnum_ratio = (sum(c.isalnum() for c in dense) / len(dense)) if dense else 0.0
    caps_ratio = (sum(c.isupper() for c in letters) / len(letters)) if letters else 0.0
    earned, evidence, fixes = CRITERION_MAX, [], []

    if words == 0 or not dense:
        return _criterion(
            "text_purity", "Text layer / parseability",
            "If no text can be extracted, the file is an image and the ATS "
            "sees a blank application.",
            0,
            ["No extractable text at all - the file is probably a scan or image."],
            [("Export a text-based PDF or DOCX, not a scanned/flattened image.", 10)],
        )

    if alnum_ratio < 0.55:
        earned -= 4
        evidence.append(f"Only {round(alnum_ratio * 100)}% of characters are "
                        f"letters or digits - a lot of symbols/noise.")
        fixes.append(("Remove ASCII-art, borders and long symbol runs; keep "
                      "text and simple bullets.", 4))
    if caps_ratio > 0.6 and len(letters) > 200:
        earned -= 3
        evidence.append(f"{round(caps_ratio * 100)}% of letters are uppercase - "
                        f"all-caps text parses and reads poorly.")
        fixes.append(("Use normal sentence/title case instead of ALL CAPS.", 3))
    if 0 < words < 50:
        earned -= 3
        evidence.append(f"Only {words} words of text were extracted.")

    if earned == CRITERION_MAX:
        evidence.append("Clean text layer - parses as plain, readable text.")

    return _criterion(
        "text_purity", "Text layer / parseability",
        "Everything else depends on the ATS being able to read the file as "
        "ordinary text in the first place.",
        earned, evidence, fixes,
    )


_CHECKS: Tuple[Callable[[Dict[str, Any]], Dict[str, Any]], ...] = (
    _check_section_headers,
    _check_contact_info,
    _check_dates,
    _check_encoding,
    _check_keywords,
    _check_tables,
    _check_length,
    _check_education,
    _check_skills,
    _check_text_purity,
)


def _grade(score: int) -> str:
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"


def _rating(score: int) -> str:
    if score >= 90:
        return "Excellent"
    if score >= 75:
        return "Good"
    if score >= 50:
        return "Needs work"
    return "Poor"


# Anchor points mapping the 0..100 score to an estimated probability (%) of
# clearing a typical keyword + parse filter. Values between anchors are linearly
# interpolated. These are calibrated estimates, not a guarantee - real ATS
# behaviour varies with each employer's configuration.
_PASS_RATE_ANCHORS = [
    (0, 3), (40, 16), (50, 28), (60, 42), (70, 60), (80, 76), (90, 88), (100, 96),
]


def _estimate_pass_rate(score: int) -> int:
    score = max(0, min(100, score))
    for (x0, y0), (x1, y1) in zip(_PASS_RATE_ANCHORS, _PASS_RATE_ANCHORS[1:]):
        if score <= x1:
            t = (score - x0) / (x1 - x0) if x1 != x0 else 0.0
            return int(round(y0 + t * (y1 - y0)))
    return _PASS_RATE_ANCHORS[-1][1]


def analyze_ats_compatibility(
    resume_text: str,
    job_description: str = "",
    has_tables: bool = False,
    has_columns: bool = False,
) -> Dict[str, Any]:
    """Run the ten-point ATS compatibility check.

    Args:
        resume_text: The plain text of the resume.
        job_description: Optional target job posting. When present, the keyword
            criterion scores real overlap; when absent it falls back to a
            generic keyword-readiness heuristic.
        has_tables / has_columns: Set by the caller when the source document
            (PDF/DOCX) is known to contain tables or multiple columns.

    Returns:
        A dict with ``overall_score`` (0..100), ``grade`` (A-F), ``rating``,
        ``estimated_ats_pass_rate`` (percent), ``word_count``, a ``summary``
        count of pass/warn/fail criteria, the ten ``criteria`` results in
        document order, and ``prioritized_fixes`` sorted by impact.
    """
    text = resume_text or ""
    headings = find_headings(text)
    skills_body = section_body(text, "skills")

    ctx: Dict[str, Any] = {
        "text": text,
        "lower": text.lower(),
        "nonblank_lines": [ln for ln in text.splitlines() if ln.strip()],
        "word_count": len(text.split()),
        "heading_keys": [h.key for h in headings],
        "date_ranges": extract_ranges(text),
        "weird_chars": _weird_characters(text),
        "job_description": job_description or "",
        "has_tables": bool(has_tables),
        "has_columns": bool(has_columns),
        "skills_body": skills_body,
        "skill_items": _split_skill_items(skills_body),
        "education_body": section_body(text, "education"),
        "flags": {},
    }

    criteria = [check(ctx) for check in _CHECKS]
    overall = sum(c["earned"] for c in criteria)          # 10 x 10 -> 0..100
    by_id = {c["id"]: c for c in criteria}

    pass_rate = _estimate_pass_rate(overall)
    # Caps for parser-fatal problems: a great keyword score cannot rescue a
    # resume the ATS literally cannot read or reply to.
    if by_id["text_purity"]["earned"] == 0:
        pass_rate = 0
    if not ctx["flags"].get("has_email", False):
        pass_rate = min(pass_rate, 35)
    if "experience" not in ctx["heading_keys"]:
        pass_rate = min(pass_rate, 45)

    severity_of = {"fail": "high", "warn": "medium", "pass": "low"}
    prioritized, seen = [], set()
    for crit in criteria:
        if crit["status"] == "pass":
            continue
        for fix in crit["fixes"]:
            key = fix["text"].lower()
            if key in seen:
                continue
            seen.add(key)
            prioritized.append({
                "category": crit["label"],
                "severity": severity_of[crit["status"]],
                "text": fix["text"],
                "points": fix["points"],
            })
    prioritized.sort(key=lambda f: (f["severity"] != "high", -f["points"]))

    return {
        "overall_score": overall,
        "grade": _grade(overall),
        "rating": _rating(overall),
        "estimated_ats_pass_rate": pass_rate,
        "word_count": ctx["word_count"],
        "summary": {
            "passed": sum(1 for c in criteria if c["status"] == "pass"),
            "warnings": sum(1 for c in criteria if c["status"] == "warn"),
            "failed": sum(1 for c in criteria if c["status"] == "fail"),
        },
        "criteria": criteria,
        "prioritized_fixes": prioritized,
    }
