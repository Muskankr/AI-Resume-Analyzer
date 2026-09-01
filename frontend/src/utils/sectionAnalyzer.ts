/**
 * Section Analyzer — parse raw resume text into labelled sections and
 * score each one on content-quality signals.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface ResumeSection {
  /** Machine-readable key. */
  key: string
  /** Display label (e.g. "Professional Experience"). */
  label: string
  /** Emoji icon for the card header. */
  icon: string
  /** Raw text content of the section. */
  content: string
  /** Word count for this section. */
  wordCount: number
  /** Quality score 0-100. */
  score: number
  /** Quality grade. */
  grade: 'Excellent' | 'Good' | 'Fair' | 'Weak' | 'Missing'
  /** List of short actionable tips. */
  tips: string[]
}

export interface SectionAnalysisInput {
  resumeText: string
  skills: string[]
}

// ── Section detection patterns ───────────────────────────────────────────────

interface SectionDef {
  key: string
  label: string
  icon: string
  /** Regex that matches the heading line (case-insensitive). */
  pattern: RegExp
  /** Minimum expected word count for a "complete" section. */
  minWords: number
  /** Keywords that boost the quality score. */
  powerWords: string[]
}

const SECTION_DEFS: SectionDef[] = [
  {
    key: 'summary',
    label: 'Professional Summary',
    icon: '📋',
    pattern: /(?:^|\n)\s*(?:professional\s+)?summary\b/i,
    minWords: 30,
    powerWords: ['experienced', 'skilled', 'passionate', 'results', 'proven', 'expertise', 'specializing', 'background', 'track record'],
  },
  {
    key: 'experience',
    label: 'Work Experience',
    icon: '💼',
    pattern: /(?:^|\n)\s*(?:professional\s+)?experience\b/i,
    minWords: 60,
    powerWords: ['managed', 'led', 'built', 'designed', 'implemented', 'improved', 'reduced', 'increased', 'delivered', 'launched', 'scaled', 'automated'],
  },
  {
    key: 'education',
    label: 'Education',
    icon: '🎓',
    pattern: /(?:^|\n)\s*education\b/i,
    minWords: 15,
    powerWords: ['university', 'college', 'bachelor', 'master', 'phd', 'degree', 'gpa', 'honors', 'cum laude', 'dean'],
  },
  {
    key: 'skills',
    label: 'Skills',
    icon: '🧩',
    pattern: /(?:^|\n)\s*(?:technical\s+)?skills?\b/i,
    minWords: 10,
    powerWords: [],
  },
  {
    key: 'projects',
    label: 'Projects',
    icon: '🚀',
    pattern: /(?:^|\n)\s*projects?\b/i,
    minWords: 30,
    powerWords: ['built', 'deployed', 'open source', 'github', 'production', 'users', 'npm', 'maintained', 'contributed'],
  },
  {
    key: 'certifications',
    label: 'Certifications',
    icon: '📜',
    pattern: /(?:^|\n)\s*certifications?\b/i,
    minWords: 5,
    powerWords: ['aws', 'azure', 'google', 'certified', 'professional', 'associate', 'specialist'],
  },
  {
    key: 'awards',
    label: 'Awards & Honors',
    icon: '🏆',
    pattern: /(?:^|\n)\s*(?:awards?|honors?|achievements?)\b/i,
    minWords: 10,
    powerWords: ['winner', 'first place', 'top', 'best', 'award', 'honor', 'scholarship', 'recognition'],
  },
]

// ── Scoring helpers ──────────────────────────────────────────────────────────

/** Count action-verb bullet points. */
function countActionBullets(text: string): { total: number; actionBullets: number } {
  const lines = text.split('\n').map((l) => l.trim())
  const bullets = lines.filter((l) => /^[•\-\*\u2022\u25CF]/.test(l))
  if (bullets.length === 0) return { total: 0, actionBullets: 0 }

  const verbs = new Set([
    'achieved', 'administered', 'analyzed', 'automated', 'built',
    'collaborated', 'consolidated', 'coordinated', 'created', 'debugged',
    'delivered', 'deployed', 'designed', 'developed', 'drove',
    'eliminated', 'engineered', 'established', 'executed', 'expanded',
    'facilitated', 'generated', 'grew', 'guided', 'implemented',
    'improved', 'increased', 'influenced', 'initiated', 'integrated',
    'introduced', 'launched', 'led', 'leveraged', 'maintained',
    'managed', 'mentored', 'migrated', 'modernized', 'negotiated',
    'optimized', 'orchestrated', 'overhauled', 'oversaw', 'perfected',
    'performed', 'pioneered', 'planned', 'prioritized', 'produced',
    'programmed', 'proposed', 'reduced', 'refactored', 'resolved',
    'revamped', 'scaled', 'simplified', 'spearheaded', 'standardized',
    'streamlined', 'strengthened', 'supervised', 'transformed',
    'troubleshot', 'unified', 'upgraded', 'utilized',
  ])

  let actionBullets = 0
  for (const b of bullets) {
    const cleaned = b.replace(/^[•\-\*\u2022\u25CF\u25CB\s]+/, '')
    const first = cleaned.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? ''
    if (verbs.has(first)) actionBullets++
  }
  return { total: bullets.length, actionBullets }
}

/** Count lines with measurable data (digits, %, $). */
function countQuantified(text: string): { total: number; quantified: number } {
  const lines = text.split('\n').map((l) => l.trim())
  const bullets = lines.filter((l) => /^[•\-\*\u2022\u25CF]/.test(l))
  if (bullets.length === 0) return { total: 0, quantified: 0 }
  const quantified = bullets.filter((b) => /\d/.test(b)).length
  return { total: bullets.length, quantified }
}

/** Score a section 0–100. */
function scoreSection(def: SectionDef, content: string): { score: number; tips: string[] } {
  const tips: string[] = []
  const words = content.trim().split(/\s+/).length
  const wcScore = Math.min(100, (words / def.minWords) * 60)

  if (words < def.minWords * 0.5) {
    tips.push(`Too short (${words} words) — aim for ${def.minWords}+ words.`)
  } else if (words < def.minWords) {
    tips.push(`Consider expanding (${words}/${def.minWords} words).`)
  }

  // Action verbs
  const { total: bulletTotal, actionBullets } = countActionBullets(content)
  const verbRatio = bulletTotal > 0 ? actionBullets / bulletTotal : 0
  const verbScore = bulletTotal > 0 ? verbRatio * 40 : 20

  if (bulletTotal > 0 && verbRatio < 0.5) {
    tips.push(`Only ${Math.round(verbRatio * 100)}% of bullets use action verbs — aim for 70%+.`)
  }

  // Quantification
  const { quantified } = countQuantified(content)
  const quantRatio = bulletTotal > 0 ? quantified / bulletTotal : 0
  const quantScore = bulletTotal > 0 ? quantRatio * 30 : 15

  if (bulletTotal > 0 && quantRatio < 0.3) {
    tips.push(`Only ${Math.round(quantRatio * 100)}% of bullets include metrics — add numbers.`)
  }

  // Power words
  const lower = content.toLowerCase()
  const powerHits = def.powerWords.filter((w) => lower.includes(w)).length
  const powerScore = def.powerWords.length > 0
    ? (powerHits / def.powerWords.length) * 30
    : 15

  if (powerHits === 0 && def.powerWords.length > 0) {
    tips.push('Consider using stronger industry-relevant keywords.')
  }

  const raw = wcScore + verbScore + quantScore + powerScore
  const score = Math.round(Math.min(100, Math.max(0, raw)))

  return { score, tips }
}

// ── Main parser ──────────────────────────────────────────────────────────────

/**
 * Split resume text into sections and score each one.
 *
 * The parser scans for known heading patterns and captures text between
 * consecutive headings. Unrecognised leading text is labelled "Header".
 */
export function analyzeSections(input: SectionAnalysisInput): ResumeSection[] {
  const { resumeText } = input
  if (!resumeText?.trim()) return []

  // Find all heading positions
  const headings: Array<{ idx: number; def: SectionDef }> = []
  for (const def of SECTION_DEFS) {
    const match = resumeText.match(def.pattern)
    if (match && match.index !== undefined) {
      headings.push({ idx: match.index, def })
    }
  }

  // Sort by position
  headings.sort((a, b) => a.idx - b.idx)

  const sections: ResumeSection[] = []

  // Extract text between headings
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].idx
    const end = i + 1 < headings.length ? headings[i + 1].idx : resumeText.length
    const content = resumeText.slice(start, end).trim()
    const def = headings[i].def
    const { score, tips } = scoreSection(def, content)
    const wordCount = content.split(/\s+/).length

    let grade: ResumeSection['grade'] = 'Missing'
    if (score >= 80) grade = 'Excellent'
    else if (score >= 60) grade = 'Good'
    else if (score >= 40) grade = 'Fair'
    else if (score > 0) grade = 'Weak'

    sections.push({
      key: def.key,
      label: def.label,
      icon: def.icon,
      content,
      wordCount,
      score,
      grade,
      tips,
    })
  }

  // Flag missing sections
  for (const def of SECTION_DEFS) {
    if (!headings.find((h) => h.def.key === def.key)) {
      sections.push({
        key: def.key,
        label: def.label,
        icon: def.icon,
        content: '',
        wordCount: 0,
        score: 0,
        grade: 'Missing',
        tips: [`Section not detected — consider adding "${def.label}".`],
      })
    }
  }

  return sections
}

/**
 * Compute an overall section-health score (average of non-missing sections,
 * or 0 if none found).
 */
export function overallSectionScore(sections: ResumeSection[]): number {
  const scored = sections.filter((s) => s.grade !== 'Missing')
  if (scored.length === 0) return 0
  return Math.round(scored.reduce((sum, s) => sum + s.score, 0) / scored.length)
}
