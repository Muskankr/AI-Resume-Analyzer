import { useMemo } from 'react'

/* ── Types ─────────────────────────────────────────────────── */

export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F'

export interface HealthDimension {
  key: string
  label: string
  score: number // 0-100
  grade: HealthGrade
  detail: string
  tips: string[]
}

export interface ResumeHealthData {
  overall: number
  overallGrade: HealthGrade
  dimensions: HealthDimension[]
  summary: string
  topAction: string
}

/* ── Pure helpers ───────────────────────────────────────────── */

function scoreToGrade(score: number): HealthGrade {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

const GRADE_COLORS: Record<HealthGrade, string> = {
  A: '#34d399',
  B: '#60a5fa',
  C: '#fbbf24',
  D: '#fb923c',
  F: '#f87171',
}

/* ── Dimension scorers ─────────────────────────────────────── */

function scoreLength(text: string): HealthDimension {
  const words = text.split(/\s+/).filter(Boolean).length
  let score: number
  let detail: string
  const tips: string[] = []

  if (words >= 300 && words <= 700) {
    score = 95
    detail = `Optimal length at ${words} words`
  } else if (words >= 200 && words < 300) {
    score = 70
    detail = `Slightly short at ${words} words`
    tips.push('Add 1-2 more bullet points to reach 300+ words')
  } else if (words > 700 && words <= 900) {
    score = 75
    detail = `A bit long at ${words} words`
    tips.push('Trim weak bullet points to stay under 700 words')
  } else if (words < 200) {
    score = 35
    detail = `Too short at ${words} words`
    tips.push('Add experience details, skills, and project descriptions')
    tips.push('Include at least 3-5 bullet points per role')
  } else {
    score = 50
    detail = `Too long at ${words} words — may overwhelm recruiters`
    tips.push('Cut filler words and redundant phrases')
    tips.push('Focus on quantified achievements rather than duties')
  }

  return { key: 'length', label: 'Length & Density', score, grade: scoreToGrade(score), detail, tips }
}

function scoreContactInfo(text: string): HealthDimension {
  const hasEmail = /[\w.+-]+@[\w.-]+\.\w{2,}/.test(text)
  const hasPhone = /[\+]?[\d\s\-\(\)]{7,15}/.test(text)
  const hasLinkedIn = /linkedin\.com/i.test(text)
  const hasGitHub = /github\.com/i.test(text)
  const hasUrl = /https?:\/\//i.test(text)

  const checks = [
    { name: 'Email', found: hasEmail },
    { name: 'Phone', found: hasPhone },
    { name: 'LinkedIn or website', found: hasLinkedIn || hasGitHub || hasUrl },
  ]

  const found = checks.filter((c) => c.found).length
  const score = Math.round((found / checks.length) * 100)
  const tips: string[] = []

  if (!hasEmail) tips.push('Add a professional email address')
  if (!hasPhone) tips.push('Include a phone number with country code')
  if (!hasLinkedIn && !hasGitHub && !hasUrl) tips.push('Add a LinkedIn profile or portfolio URL')

  const detail = `${found}/${checks.length} contact elements detected`

  return { key: 'contact', label: 'Contact Information', score, grade: scoreToGrade(score), detail, tips }
}

function scoreSections(text: string): HealthDimension {
  const sectionPatterns: [string, RegExp][] = [
    ['Summary', /\b(summary|objective|profile|about me)\b/i],
    ['Experience', /\b(experience|employment|work history)\b/i],
    ['Education', /\b(education|degree|university|college)\b/i],
    ['Skills', /\b(skills|competencies|technologies)\b/i],
  ]

  const found = sectionPatterns.filter(([, re]) => re.test(text))
  const score = Math.round((found.length / sectionPatterns.length) * 100)
  const missing = sectionPatterns.filter(([, re]) => !re.test(text)).map(([name]) => name)
  const tips: string[] = []

  if (missing.length > 0) {
    tips.push(`Add a ${missing.join(' and ')} section${missing.length > 1 ? 's' : ''}`)
  }
  if (found.length >= 3) {
    tips.push('Consider adding a Projects or Certifications section for extra impact')
  }

  return {
    key: 'sections',
    label: 'Section Structure',
    score,
    grade: scoreToGrade(score),
    detail: `${found.length}/${sectionPatterns.length} standard sections found`,
    tips,
  }
}

function scoreReadability(text: string): HealthDimension {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  const words = text.split(/\s+/).filter(Boolean)
  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1)
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / Math.max(words.length, 1)

  // Simple readability heuristic: ideal 12-20 words per sentence
  let sentenceScore = 100
  if (avgWordsPerSentence > 25) sentenceScore = Math.max(40, 100 - (avgWordsPerSentence - 25) * 4)
  else if (avgWordsPerSentence < 8) sentenceScore = Math.max(50, 100 - (8 - avgWordsPerSentence) * 8)

  // Average word length: ideal 4-6 chars
  let wordScore = 100
  if (avgWordLength > 7) wordScore = Math.max(50, 100 - (avgWordLength - 7) * 15)
  else if (avgWordLength < 3) wordScore = 70

  const score = Math.round(sentenceScore * 0.6 + wordScore * 0.4)
  const tips: string[] = []

  if (avgWordsPerSentence > 25) tips.push('Break long sentences into shorter, punchy statements')
  if (avgWordsPerSentence < 8) tips.push('Combine short fragments into complete sentences')
  if (avgWordLength > 7) tips.push('Replace jargon with simpler, more direct language')

  return {
    key: 'readability',
    label: 'Readability',
    score,
    grade: scoreToGrade(score),
    detail: `Avg ${avgWordsPerSentence.toFixed(1)} words/sentence, ${avgWordLength.toFixed(1)} chars/word`,
    tips,
  }
}

function scoreBulletPoints(text: string): HealthDimension {
  const lines = text.split('\n')
  const bulletLines = lines.filter((l) => /^\s*[•\-*▸►●○◆▪]\s/.test(l.trim()) || /^\s*\d+[.)]\s/.test(l.trim()))
  const totalLines = lines.filter((l) => l.trim().length > 0).length
  const bulletRatio = totalLines > 0 ? bulletLines.length / totalLines : 0

  const hasNumbers = bulletLines.filter((l) => /\d+[%$KkMm]|\d{2,}/.test(l)).length
  const quantifyRatio = bulletLines.length > 0 ? hasNumbers / bulletLines.length : 0

  let score: number
  const tips: string[] = []

  if (bulletRatio >= 0.4 && bulletRatio <= 0.8) {
    score = 85
  } else if (bulletRatio >= 0.2) {
    score = 65
    tips.push('Use more bullet points instead of paragraphs for scanability')
  } else {
    score = 40
    tips.push('Convert paragraph descriptions to bullet-point format')
  }

  // Boost for quantified achievements
  if (quantifyRatio >= 0.3) {
    score = Math.min(100, score + 15)
  } else if (bulletLines.length > 0) {
    score = Math.max(20, score - 5)
    tips.push('Add numbers and metrics to your bullet points (%, $, users, etc.)')
  }

  const detail = `${bulletLines.length} bullets, ${Math.round(quantifyRatio * 100)}% quantified`

  return { key: 'bullets', label: 'Bullet Quality', score: Math.min(100, score), grade: scoreToGrade(score), detail, tips }
}

/* ── Main computation ──────────────────────────────────────── */

function computeHealth(resumeText: string): ResumeHealthData {
  const text = resumeText || ''
  const dimensions: HealthDimension[] = [
    scoreLength(text),
    scoreContactInfo(text),
    scoreSections(text),
    scoreReadability(text),
    scoreBulletPoints(text),
  ]

  const overall = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length,
  )
  const overallGrade = scoreToGrade(overall)

  // Find weakest dimension for top action
  const weakest = [...dimensions].sort((a, b) => a.score - b.score)[0]
  const topAction = weakest.tips.length > 0
    ? weakest.tips[0]
    : 'Your resume is in great shape — keep refining!'

  const summaryMap: Record<HealthGrade, string> = {
    A: 'Excellent health — your resume is well-structured and optimized.',
    B: 'Good health with minor areas for improvement.',
    C: 'Average health — several dimensions could be strengthened.',
    D: 'Below average — focus on the weakest areas for the biggest impact.',
    F: 'Needs significant work across multiple dimensions.',
  }

  return {
    overall,
    overallGrade,
    dimensions,
    summary: summaryMap[overallGrade],
    topAction,
  }
}

/* ── React hook ────────────────────────────────────────────── */

export function useResumeHealth(resumeText: string): ResumeHealthData {
  return useMemo(() => computeHealth(resumeText), [resumeText])
}

export { GRADE_COLORS }
