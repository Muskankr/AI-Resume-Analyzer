/**
 * ATS Compatibility Checker — transparent 10-point analysis.
 *
 * This is the browser-side twin of the Django engine in
 * `backend/analyzer/ats_simulator.py` (`analyze_ats_compatibility`). The backend
 * is the source of truth used by the dashboard; this module is a dependency-free
 * reference / offline implementation with the same scoring model and output.
 *
 * The point of the rewrite (the previous version did `score = 40; if (email)
 * score += 15`) is that nothing here is a magic number without a reason next to
 * it. Every one of the ten criteria reports the points it awarded out of 10, the
 * evidence it saw, and the fixes worth the most points.
 */

export type CriterionStatus = 'pass' | 'warn' | 'fail'
export type FixSeverity = 'high' | 'medium' | 'low'

export interface CriterionResult {
  id: string
  label: string
  earned: number
  max: 10
  status: CriterionStatus
  whyItMatters: string
  evidence: string[]
  fixes: { text: string; points: number }[]
}

export interface PrioritizedFix {
  category: string
  severity: FixSeverity
  text: string
  points: number
}

export interface AtsCompatibilityReport {
  overallScore: number // 0..100 (sum of the ten criteria)
  grade: string // A..F
  rating: string
  estimatedAtsPassRate: number // percent
  wordCount: number
  summary: { passed: number; warnings: number; failed: number }
  criteria: CriterionResult[]
  prioritizedFixes: PrioritizedFix[]
}

const CRITERION_MAX = 10
const CORE_SECTIONS = ['experience', 'education', 'skills'] as const
const LENGTH_MIN_WORDS = 400
const LENGTH_MAX_WORDS = 850
const WORDS_PER_PAGE = 450

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/
const PHONE_RE = /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
const LINKEDIN_RE = /linkedin\.com\/in\/[\w%-]+/i
const LOCATION_RE = /\b[A-Z][a-zA-Z.]+,\s*(?:[A-Z]{2}\b|[A-Z][a-z]+\b)/
const DEGREE_RE =
  /\b(bachelor|master|associate|doctorate|b\.?\s?s\.?|b\.?\s?a\.?|m\.?\s?s\.?|m\.?\s?a\.?|m\.?\s?b\.?a\.?|ph\.?\s?d|b\.?tech|m\.?tech|b\.?e\.?|b\.?sc|m\.?sc|diploma|degree)\b/i
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u

const SECTION_ALIASES: Record<string, string[]> = {
  summary: ['summary', 'objective', 'profile', 'about me', 'professional summary'],
  experience: ['experience', 'work experience', 'employment', 'work history', 'professional experience'],
  education: ['education', 'academic background', 'qualifications'],
  skills: ['skills', 'technical skills', 'core competencies', 'technologies', 'tools'],
  projects: ['projects', 'personal projects', 'portfolio', 'key projects'],
}

const SECTION_DISPLAY: Record<string, string> = {
  summary: 'Summary',
  experience: 'Work Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
}

const ACTION_VERBS = new Set([
  'led', 'built', 'designed', 'implemented', 'developed', 'created', 'launched',
  'managed', 'improved', 'increased', 'reduced', 'optimized', 'delivered',
  'spearheaded', 'architected', 'migrated', 'automated', 'streamlined',
  'mentored', 'analyzed', 'deployed', 'integrated', 'refactored', 'established',
  'coordinated', 'achieved', 'generated', 'drove', 'owned', 'shipped', 'scaled',
])

const JD_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'was', 'this', 'that', 'from', 'are', 'you',
  'your', 'our', 'their', 'its', 'have', 'has', 'will', 'would', 'can', 'not',
  'job', 'role', 'work', 'team', 'company', 'experience', 'skills', 'ability',
  'responsibilities', 'requirements', 'preferred', 'plus', 'strong', 'years',
])

interface Ctx {
  text: string
  lower: string
  lines: string[]
  wordCount: number
  headingKeys: string[]
  skillsBody: string
  skillItems: string[]
  educationBody: string
  jobDescription: string
  hasTables: boolean
  hasColumns: boolean
  hasEmail: boolean
}

function statusFor(earned: number): CriterionStatus {
  const pct = earned / CRITERION_MAX
  if (pct >= 0.8) return 'pass'
  if (pct >= 0.5) return 'warn'
  return 'fail'
}

function criterion(
  id: string,
  label: string,
  whyItMatters: string,
  earned: number,
  evidence: string[],
  fixes: { text: string; points: number }[],
): CriterionResult {
  const clamped = Math.max(0, Math.min(CRITERION_MAX, Math.round(earned)))
  return {
    id,
    label,
    earned: clamped,
    max: CRITERION_MAX,
    status: statusFor(clamped),
    whyItMatters,
    evidence: evidence.filter(Boolean),
    fixes: fixes
      .filter((f) => f.text)
      .map((f) => ({ text: f.text, points: Math.max(1, Math.round(f.points)) })),
  }
}

/** Heading detection: a short line (<= 6 words) that names a known section. */
function detectHeadingKeys(lines: string[]): string[] {
  const keys: string[] = []
  for (const raw of lines) {
    const line = raw
      .trim()
      .replace(/^[#*=_\-\s]+|[#*=_\-:\s]+$/g, '')
      .toLowerCase()
    if (!line || line.split(/\s+/).length > 6) continue
    for (const [key, aliases] of Object.entries(SECTION_ALIASES)) {
      if (keys.includes(key)) continue
      if (aliases.some((a) => line === a || line.startsWith(a + ' ') || line.startsWith(a + ','))) {
        keys.push(key)
      }
    }
  }
  return keys
}

function sectionBody(lines: string[], key: string): string {
  const aliases = SECTION_ALIASES[key] ?? []
  const isHeading = (line: string) =>
    Object.values(SECTION_ALIASES).some((al) => al.some((a) => line === a || line.startsWith(a + ' ')))

  let start = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim().toLowerCase().replace(/[:#*=_\s]+$/g, '')
    if (aliases.some((a) => line === a || line.startsWith(a))) {
      start = i
      break
    }
  }
  if (start === -1) return ''

  const collected: string[] = []
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim().toLowerCase().replace(/[:#*=_\s]+$/g, '')
    if (isHeading(line)) break
    collected.push(lines[i])
  }
  return collected.join('\n').trim()
}

function splitSkillItems(body: string): string[] {
  if (!body) return []
  const seen = new Set<string>()
  const items: string[] = []
  for (const part of body.split(/[,\n;•|·]/)) {
    const token = part.replace(/^[\s\t\-–—:*•]+|[\s\t\-–—:*•]+$/g, '')
    if (token.length >= 1 && token.length <= 40 && /[A-Za-z]/.test(token)) {
      const k = token.toLowerCase()
      if (!seen.has(k)) {
        seen.add(k)
        items.push(token)
      }
    }
  }
  return items
}

// ── the ten checks ─────────────────────────────────────────────────────────

function checkSectionHeaders(ctx: Ctx): CriterionResult {
  let earned = 0
  const evidence: string[] = []
  const fixes: { text: string; points: number }[] = []
  const present = CORE_SECTIONS.filter((k) => ctx.headingKeys.includes(k))
  const missing = CORE_SECTIONS.filter((k) => !ctx.headingKeys.includes(k))
  earned += 3 * present.length
  if (ctx.headingKeys.includes('summary') || ctx.headingKeys.includes('projects')) earned += 1

  const detected = ctx.headingKeys.map((k) => SECTION_DISPLAY[k]).filter(Boolean)
  evidence.push(
    detected.length
      ? `Detected headings: ${detected.join(', ')}.`
      : 'No standard section heading found on its own line.',
  )
  for (const k of missing) {
    evidence.push(`No recognisable '${SECTION_DISPLAY[k]}' heading.`)
    fixes.push({ text: `Add a plain '${SECTION_DISPLAY[k]}' heading on its own line.`, points: 3 })
  }
  return criterion(
    'section_headers',
    'Standard section headings',
    "An ATS files your content into fields by reading headings like 'Work Experience', 'Education' and 'Skills'.",
    earned,
    evidence,
    fixes,
  )
}

function checkContactInfo(ctx: Ctx): CriterionResult {
  let earned = 0
  const evidence: string[] = []
  const fixes: { text: string; points: number }[] = []
  const email = ctx.text.match(EMAIL_RE)
  const phone = ctx.text.match(PHONE_RE)
  const linkedin = LINKEDIN_RE.test(ctx.text)
  const location = ctx.text.match(LOCATION_RE)
  ctx.hasEmail = Boolean(email)

  if (email) {
    earned += 4
    evidence.push(`Email found: ${email[0]}`)
  } else {
    evidence.push('No email address detected.')
    fixes.push({ text: 'Put a professional email address in the top few lines.', points: 4 })
  }
  if (phone) {
    earned += 3
    evidence.push(`Phone number found: ${phone[0]}`)
  } else {
    fixes.push({ text: 'Add a phone number, e.g. (555) 123-4567.', points: 3 })
  }
  if (linkedin) {
    earned += 2
    evidence.push('LinkedIn URL found.')
  } else {
    fixes.push({ text: 'Add your LinkedIn URL (linkedin.com/in/...).', points: 2 })
  }
  if (location) {
    earned += 1
    evidence.push(`Location found: ${location[0]}`)
  } else {
    fixes.push({ text: 'Add your city and state/country for location filters.', points: 1 })
  }
  return criterion(
    'contact_info',
    'Contact information',
    'Recruiters filter and contact you on these fields; a missing email can make an application unreachable.',
    earned,
    evidence,
    fixes,
  )
}

function checkDates(ctx: Ctx): CriterionResult {
  const evidence: string[] = []
  const fixes: { text: string; points: number }[] = []
  const rangeRe =
    /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}|\d{1,2}\/\d{4}|\d{4})\s*(?:-|–|—|to|until)\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}|\d{1,2}\/\d{4}|\d{4}|present|current)/gi
  const matches = [...ctx.text.matchAll(rangeRe)]
  let earned = 0
  if (matches.length >= 1) earned += 4
  if (matches.length >= 2) earned += 3

  const formatOf = (s: string): string => {
    const t = s.trim()
    if (/^\d{4}$/.test(t)) return 'year'
    if (/^\d{1,2}\/\d{4}$/.test(t)) return 'numeric'
    return 'month-name'
  }
  const formats = new Set<string>()
  for (const m of matches) {
    formats.add(formatOf(m[1]))
    if (!/present|current/i.test(m[2])) formats.add(formatOf(m[2]))
  }

  if (matches.length === 0) {
    evidence.push('No parseable employment date ranges were found.')
    fixes.push({ text: "Give every role a month-and-year range, e.g. 'Mar 2021 - Jun 2023'.", points: 7 })
  } else {
    evidence.push(`Found ${matches.length} date range(s), e.g. '${matches[0][0].trim()}'.`)
    if (matches.length < 2) fixes.push({ text: 'List start and end dates for each role.', points: 3 })
    if (formats.size <= 1) {
      earned += 3
      evidence.push('Date formats are consistent.')
    } else {
      evidence.push(`Mixed date formats: ${[...formats].join(', ')}.`)
      fixes.push({ text: "Use one date format everywhere (e.g. 'Jan 2020').", points: 3 })
    }
  }
  return criterion(
    'date_formatting',
    'Date formatting & consistency',
    'Parsers build your career timeline from date ranges; missing or mixed formats create gaps and mis-dated roles.',
    earned,
    evidence,
    fixes,
  )
}

function checkEncoding(ctx: Ctx): CriterionResult {
  let earned = CRITERION_MAX
  const evidence: string[] = []
  const fixes: { text: string; points: number }[] = []
  const emoji = ctx.text.match(new RegExp(EMOJI_RE, 'gu')) ?? []
  if (emoji.length) {
    earned -= 3
    evidence.push(`${emoji.length} emoji / pictograph character(s) found.`)
    fixes.push({ text: 'Remove emoji and pictographs — parsers often turn them into mojibake.', points: 3 })
  }
  const safe = new Set(['‘', '’', '“', '”', '–', '—', '•', '…', ' '])
  const weird = new Set<string>()
  for (const ch of ctx.text) {
    if (ch.charCodeAt(0) < 128 || safe.has(ch)) continue
    if (/\p{L}/u.test(ch)) continue
    if (EMOJI_RE.test(ch)) continue
    weird.add(ch)
  }
  if (weird.size) {
    const penalty = Math.min(6, weird.size * 2)
    earned -= penalty
    evidence.push(
      `${weird.size} unusual symbol type(s): ${[...weird]
        .slice(0, 6)
        .map((c) => JSON.stringify(c))
        .join(', ')}.`,
    )
    fixes.push({ text: "Replace decorative symbols and ligatures with plain ASCII ('-', '*').", points: penalty })
  }
  if (!emoji.length && !weird.size) evidence.push('No problematic characters — the text is ASCII-clean.')
  return criterion(
    'encoding',
    'Character encoding',
    'Special glyphs and smart symbols can be dropped or garbled when the ATS re-encodes your file.',
    earned,
    evidence,
    fixes,
  )
}

function checkKeywords(ctx: Ctx): CriterionResult {
  const evidence: string[] = []
  const fixes: { text: string; points: number }[] = []
  let earned = 0
  const jd = ctx.jobDescription.trim()

  if (jd) {
    const counts = new Map<string, number>()
    for (const w of jd.toLowerCase().match(/[a-z][a-z+#.\-]{2,}/g) ?? []) {
      if (!JD_STOPWORDS.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1)
    }
    const keywords = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 25)
      .map(([w]) => w)
    if (keywords.length === 0) {
      earned = 5
      evidence.push('The job description had no distinctive keywords to match.')
    } else {
      const matched = keywords.filter((w) => ctx.lower.includes(w))
      const missing = keywords.filter((w) => !ctx.lower.includes(w))
      const ratio = matched.length / keywords.length
      earned = CRITERION_MAX * Math.min(1, ratio / 0.6) // 60% overlap = full marks
      evidence.push(
        `Matched ${matched.length} of ${keywords.length} key terms from the job description (${Math.round(
          ratio * 100,
        )}%).`,
      )
      if (matched.length) evidence.push(`Present: ${matched.slice(0, 12).join(', ')}.`)
      if (missing.length) {
        evidence.push(`Missing: ${missing.slice(0, 12).join(', ')}.`)
        fixes.push({
          text: `Where truthful, add these job-description terms: ${missing.slice(0, 8).join(', ')}.`,
          points: Math.min(8, missing.length),
        })
      }
    }
  } else {
    const verbs = [...ACTION_VERBS].filter((v) => new RegExp(`\\b${v}\\b`).test(ctx.lower))
    const quantified = (ctx.lower.match(/\d+\s?%|\$\s?\d|\b\d{2,}\b/g) ?? []).length
    if (ctx.skillItems.length >= 5) {
      earned += 4
      evidence.push(`Skills section lists ${ctx.skillItems.length} concrete items.`)
    } else {
      fixes.push({ text: 'List 5–8+ concrete tools/technologies in a Skills section.', points: 4 })
    }
    if (verbs.length >= 5) {
      earned += 3
      evidence.push(`${verbs.length} distinct action verbs used (e.g. ${verbs.slice(0, 4).join(', ')}).`)
    } else {
      fixes.push({ text: 'Start bullets with strong action verbs (led, built, reduced, shipped...).', points: 3 })
    }
    if (quantified >= 4) {
      earned += 3
      evidence.push(`${quantified} quantified figures detected (numbers, %, $).`)
    } else {
      fixes.push({ text: 'Quantify at least 3–4 achievements with numbers, % or $.', points: 3 })
    }
    evidence.push('No job description supplied — scored on generic keyword-readiness instead.')
  }
  return criterion(
    'keywords',
    'Keyword coverage',
    'The first ATS filter is almost always a keyword match against the job posting.',
    earned,
    evidence,
    fixes,
  )
}

function checkTables(ctx: Ctx): CriterionResult {
  const evidence: string[] = []
  const fixes: { text: string; points: number }[] = []
  let earned = CRITERION_MAX
  const flagged = ctx.lines.filter(
    (ln) => (ln.match(/\t/g)?.length ?? 0) >= 2 || /\S {4,}\S.* {3,}\S/.test(ln),
  )
  if (ctx.hasTables || ctx.hasColumns) {
    earned = 2
    evidence.push('The uploaded document reported tables or multiple columns.')
    fixes.push({ text: 'Rebuild the resume as a single column with no tables.', points: 8 })
  } else if (flagged.length >= 6) earned = 3
  else if (flagged.length >= 3) earned = 6
  else if (flagged.length >= 1) earned = 8

  if (flagged.length) {
    evidence.push(
      `${flagged.length} line(s) look column-aligned or tabular, e.g.: "${flagged[0].trim().slice(0, 80)}".`,
    )
    if (!(ctx.hasTables || ctx.hasColumns)) {
      fixes.push({
        text: 'Replace tab/space column alignment with plain lines — parsers read tables out of order.',
        points: CRITERION_MAX - earned,
      })
    }
  } else {
    evidence.push('Layout looks like clean single-column text.')
  }
  return criterion(
    'tables_columns',
    'Tables & multi-column layout',
    'Many parsers flatten tables and columns left-to-right, scrambling your bullet points.',
    earned,
    evidence,
    fixes,
  )
}

function checkLength(ctx: Ctx): CriterionResult {
  const evidence: string[] = []
  const fixes: { text: string; points: number }[] = []
  const w = ctx.wordCount
  const pages = Math.max(1, Math.round((w / WORDS_PER_PAGE) * 10) / 10)
  let earned: number
  if (w >= LENGTH_MIN_WORDS && w <= LENGTH_MAX_WORDS) {
    earned = 10
    evidence.push(
      `${w} words (~${pages} page(s)) — inside the recommended ${LENGTH_MIN_WORDS}–${LENGTH_MAX_WORDS} word band.`,
    )
  } else if ((w >= 300 && w < LENGTH_MIN_WORDS) || (w > LENGTH_MAX_WORDS && w <= 1000)) earned = 7
  else if ((w >= 200 && w < 300) || (w > 1000 && w <= 1200)) earned = 4
  else earned = 1

  if (w > LENGTH_MAX_WORDS) {
    evidence.push(`${w} words (~${pages} pages) — longer than most recruiters and parsers expect.`)
    fixes.push({
      text: 'Trim toward one page (early career) or two at most; cut older roles to 2–3 bullets.',
      points: 10 - earned,
    })
  } else if (w < LENGTH_MIN_WORDS) {
    evidence.push(`Only ${w} words — a parser has little to index.`)
    fixes.push({
      text: 'Expand bullets with responsibilities and quantified impact to reach ~450–650 words.',
      points: 10 - earned,
    })
  }
  return criterion(
    'length',
    'Resume length',
    'Too short and there is nothing to rank on; too long and later sections are truncated.',
    earned,
    evidence,
    fixes,
  )
}

function checkEducation(ctx: Ctx): CriterionResult {
  let earned = 0
  const evidence: string[] = []
  const fixes: { text: string; points: number }[] = []
  const hasHeading = ctx.headingKeys.includes('education')
  const degree = (ctx.educationBody || ctx.text).match(DEGREE_RE)
  if (hasHeading) {
    earned += 5
    evidence.push("An 'Education' section heading is present.")
  } else {
    evidence.push("No 'Education' heading found.")
    fixes.push({ text: "Add an 'Education' heading, even if the section is short.", points: 5 })
  }
  if (degree) {
    earned += 5
    evidence.push(`Qualification wording detected: '${degree[0].trim()}'.`)
  } else {
    evidence.push('No recognisable degree/qualification wording.')
    fixes.push({ text: "State the qualification explicitly, e.g. 'B.S. in Computer Science, 2020'.", points: 5 })
  }
  return criterion(
    'education',
    'Education section',
    'Education is a structured field in every ATS.',
    earned,
    evidence,
    fixes,
  )
}

function checkSkills(ctx: Ctx): CriterionResult {
  let earned = 0
  const evidence: string[] = []
  const fixes: { text: string; points: number }[] = []
  const hasHeading = ctx.headingKeys.includes('skills')
  if (hasHeading) {
    earned += 4
    evidence.push("A 'Skills' section heading is present.")
  } else {
    evidence.push("No 'Skills' heading found.")
    fixes.push({ text: "Add a dedicated 'Skills' section for your tools and technologies.", points: 4 })
  }
  const n = ctx.skillItems.length
  if (n >= 8) {
    earned += 6
    evidence.push(`${n} distinct skills listed.`)
  } else if (n >= 4) {
    earned += 3
    evidence.push(`Only ${n} skills listed.`)
    fixes.push({ text: 'List at least 8 concrete, role-relevant skills.', points: 3 })
  } else {
    evidence.push('Fewer than 4 concrete skills detected.')
    fixes.push({
      text: 'List 8+ concrete skills (languages, frameworks, tools), comma- or line-separated.',
      points: 6,
    })
  }
  return criterion(
    'skills',
    'Skills section',
    'The skills list is the densest keyword source on the resume.',
    earned,
    evidence,
    fixes,
  )
}

function checkTextPurity(ctx: Ctx): CriterionResult {
  const evidence: string[] = []
  const fixes: { text: string; points: number }[] = []
  const dense = ctx.text.replace(/\s/g, '')
  const letters = ctx.text.match(/\p{L}/gu) ?? []
  if (ctx.wordCount === 0 || dense.length === 0) {
    return criterion(
      'text_purity',
      'Text layer / parseability',
      'If no text can be extracted, the file is an image and the ATS sees a blank application.',
      0,
      ['No extractable text at all — the file is probably a scan or image.'],
      [{ text: 'Export a text-based PDF or DOCX, not a scanned/flattened image.', points: 10 }],
    )
  }
  const alnumRatio = (dense.match(/[\p{L}\p{N}]/gu) ?? []).length / dense.length
  const capsRatio = letters.length ? (ctx.text.match(/\p{Lu}/gu) ?? []).length / letters.length : 0
  let earned = CRITERION_MAX
  if (alnumRatio < 0.55) {
    earned -= 4
    evidence.push(
      `Only ${Math.round(alnumRatio * 100)}% of characters are letters or digits — a lot of symbols/noise.`,
    )
    fixes.push({ text: 'Remove ASCII-art, borders and long symbol runs; keep text and simple bullets.', points: 4 })
  }
  if (capsRatio > 0.6 && letters.length > 200) {
    earned -= 3
    evidence.push(`${Math.round(capsRatio * 100)}% of letters are uppercase — all-caps text parses and reads poorly.`)
    fixes.push({ text: 'Use normal sentence/title case instead of ALL CAPS.', points: 3 })
  }
  if (ctx.wordCount > 0 && ctx.wordCount < 50) {
    earned -= 3
    evidence.push(`Only ${ctx.wordCount} words of text were extracted.`)
  }
  if (earned === CRITERION_MAX) evidence.push('Clean text layer — parses as plain, readable text.')
  return criterion(
    'text_purity',
    'Text layer / parseability',
    'Everything else depends on the ATS reading the file as ordinary text.',
    earned,
    evidence,
    fixes,
  )
}

// ── aggregation ────────────────────────────────────────────────────────────

function gradeFor(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

function ratingFor(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  if (score >= 50) return 'Needs work'
  return 'Poor'
}

// Documented anchors: score -> estimated % chance of clearing a typical
// keyword + parse filter. Linearly interpolated between anchors.
const PASS_RATE_ANCHORS: [number, number][] = [
  [0, 3],
  [40, 16],
  [50, 28],
  [60, 42],
  [70, 60],
  [80, 76],
  [90, 88],
  [100, 96],
]

export function estimateAtsPassRate(score: number): number {
  const s = Math.max(0, Math.min(100, score))
  for (let i = 0; i < PASS_RATE_ANCHORS.length - 1; i++) {
    const [x0, y0] = PASS_RATE_ANCHORS[i]
    const [x1, y1] = PASS_RATE_ANCHORS[i + 1]
    if (s <= x1) {
      const t = x1 === x0 ? 0 : (s - x0) / (x1 - x0)
      return Math.round(y0 + t * (y1 - y0))
    }
  }
  return PASS_RATE_ANCHORS[PASS_RATE_ANCHORS.length - 1][1]
}

export interface AnalyzeOptions {
  jobDescription?: string
  hasTables?: boolean
  hasColumns?: boolean
}

export function analyzeAtsCompatibility(
  resumeText: string,
  options: AnalyzeOptions = {},
): AtsCompatibilityReport {
  const text = resumeText ?? ''
  const lines = text.split('\n')
  const words = text.split(/\s+/).filter(Boolean)
  const skillsBody = sectionBody(lines, 'skills')
  const ctx: Ctx = {
    text,
    lower: text.toLowerCase(),
    lines,
    wordCount: words.length,
    headingKeys: detectHeadingKeys(lines),
    skillsBody,
    skillItems: splitSkillItems(skillsBody),
    educationBody: sectionBody(lines, 'education'),
    jobDescription: options.jobDescription ?? '',
    hasTables: Boolean(options.hasTables),
    hasColumns: Boolean(options.hasColumns),
    hasEmail: false,
  }

  const criteria = [
    checkSectionHeaders(ctx),
    checkContactInfo(ctx),
    checkDates(ctx),
    checkEncoding(ctx),
    checkKeywords(ctx),
    checkTables(ctx),
    checkLength(ctx),
    checkEducation(ctx),
    checkSkills(ctx),
    checkTextPurity(ctx),
  ]

  const overallScore = criteria.reduce((sum, c) => sum + c.earned, 0)
  const byId = Object.fromEntries(criteria.map((c) => [c.id, c]))

  let passRate = estimateAtsPassRate(overallScore)
  if (byId.text_purity.earned === 0) passRate = 0
  if (!ctx.hasEmail) passRate = Math.min(passRate, 35)
  if (!ctx.headingKeys.includes('experience')) passRate = Math.min(passRate, 45)

  const severityOf: Record<CriterionStatus, FixSeverity> = { fail: 'high', warn: 'medium', pass: 'low' }
  const prioritizedFixes: PrioritizedFix[] = []
  const seen = new Set<string>()
  for (const c of criteria) {
    if (c.status === 'pass') continue
    for (const fix of c.fixes) {
      const key = fix.text.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      prioritizedFixes.push({ category: c.label, severity: severityOf[c.status], text: fix.text, points: fix.points })
    }
  }
  prioritizedFixes.sort(
    (a, b) => (a.severity === 'high' ? 0 : 1) - (b.severity === 'high' ? 0 : 1) || b.points - a.points,
  )

  return {
    overallScore,
    grade: gradeFor(overallScore),
    rating: ratingFor(overallScore),
    estimatedAtsPassRate: passRate,
    wordCount: ctx.wordCount,
    summary: {
      passed: criteria.filter((c) => c.status === 'pass').length,
      warnings: criteria.filter((c) => c.status === 'warn').length,
      failed: criteria.filter((c) => c.status === 'fail').length,
    },
    criteria,
    prioritizedFixes,
  }
}
