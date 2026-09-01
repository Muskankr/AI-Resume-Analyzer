import { jsPDF } from 'jspdf'

export interface ActionItem {
  id: string
  text: string
  category: 'Skill Gap' | 'Readability' | 'Cover Letter' | 'Formatting'
  priority: 'High' | 'Medium' | 'Low'
  estimatedImpact: number
  reason: string
  resourceUrl?: string
}

export interface ActionPlanParams {
  score: number
  targetRole?: string
  suggestions?: string[]
  missingSkills?: string[]
  readabilityLabel?: string | null
  readabilityScore?: number
  coverLetterFeedback?: {
    length?: { status?: string; feedback?: string }
    tone?: { suggestions?: string[] }
    relevance?: { suggestions?: string[] }
  } | null
  fileName?: string
}

const SKILL_LEARNING_RESOURCES: Record<string, string> = {
  react: 'https://react.dev/learn',
  javascript: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
  typescript: 'https://www.typescriptlang.org/docs/',
  html: 'https://developer.mozilla.org/en-US/docs/Learn/HTML',
  css: 'https://developer.mozilla.org/en-US/docs/Learn/CSS',
  node: 'https://nodejs.org/en/learn',
  express: 'https://expressjs.com/',
  python: 'https://www.learnpython.org/',
  django: 'https://docs.djangoproject.com/en/stable/intro/tutorial01/',
  flask: 'https://flask.palletsprojects.com/en/stable/tutorial/',
  java: 'https://dev.java/learn/',
  spring: 'https://spring.io/guides',
  c: 'https://www.programiz.com/c-programming',
  cpp: 'https://www.learncpp.com/',
  csharp: 'https://learn.microsoft.com/dotnet/csharp/',
  sql: 'https://www.w3schools.com/sql/',
  mysql: 'https://dev.mysql.com/doc/',
  mongodb: 'https://www.mongodb.com/docs/',
  postgresql: 'https://www.postgresql.org/docs/',
  docker: 'https://docs.docker.com/get-started/',
  kubernetes: 'https://kubernetes.io/docs/tutorials/',
  git: 'https://git-scm.com/doc',
  github: 'https://docs.github.com/',
  aws: 'https://skillbuilder.aws/',
  azure: 'https://learn.microsoft.com/training/azure/',
  firebase: 'https://firebase.google.com/docs',
  nextjs: 'https://nextjs.org/learn',
  tailwind: 'https://tailwindcss.com/docs',
  bootstrap: 'https://getbootstrap.com/docs/',
  redux: 'https://redux.js.org/tutorials/essentials/part-1-overview-concepts',
}

export interface ActionPlanData {
  targetRole: string
  score: number
  items: ActionItem[]
  totalPotentialGain: number
  fileName?: string
}

export function generateActionPlan(params: ActionPlanParams): ActionPlanData {
  const {
    score,
    targetRole = 'General Candidate',
    suggestions = [],
    missingSkills = [],
    readabilityLabel,
    readabilityScore,
    coverLetterFeedback,
    fileName,
  } = params

  const items: ActionItem[] = []
  let idCounter = 1

  // 1. Process Missing Skills (High impact on ATS score)
  missingSkills.forEach((skill, index) => {
    let priority: 'High' | 'Medium' | 'Low' = 'High'
    let impact = 12

    if (index === 0) {
      priority = 'High'
      impact = 15
    } else if (index < 3) {
      priority = 'High'
      impact = 12
    } else if (index < 6) {
      priority = 'Medium'
      impact = 8
    } else {
      priority = 'Low'
      impact = 5
    }

    const formattedSkill = skill.charAt(0).toUpperCase() + skill.slice(1)
    items.push({
      id: `ap-${idCounter++}`,
      text: `Add projects or technical experience demonstrating ${formattedSkill}`,
      category: 'Skill Gap',
      priority,
      estimatedImpact: impact,
      reason: `Missing critical skill '${formattedSkill}' required for ${targetRole}`,
      resourceUrl: SKILL_LEARNING_RESOURCES[skill.toLowerCase()],
    })
  })

  // 2. Readability improvements
  if (readabilityLabel === 'dense' || (readabilityScore !== undefined && readabilityScore < 40)) {
    items.push({
      id: `ap-${idCounter++}`,
      text: 'Simplify sentence structures & use bullet points to fix dense text readability',
      category: 'Readability',
      priority: 'High',
      estimatedImpact: 10,
      reason: 'Low reading ease score reduces ATS parsing accuracy and recruiter scan speed',
    })
  } else if (readabilityLabel === 'moderate') {
    items.push({
      id: `ap-${idCounter++}`,
      text: 'Optimize formatting and spacing for cleaner section breakdown',
      category: 'Readability',
      priority: 'Medium',
      estimatedImpact: 6,
      reason: 'Moderate readability score can be improved with clearer formatting',
    })
  }

  // 3. Additional generic suggestions not covered by missing skills
  suggestions.forEach((sug) => {
    // Avoid duplicate skill suggestions
    const isSkillSug = missingSkills.some((m) => sug.toLowerCase().includes(m.toLowerCase()))
    if (!isSkillSug) {
      items.push({
        id: `ap-${idCounter++}`,
        text: sug,
        category: 'Formatting',
        priority: 'Medium',
        estimatedImpact: 7,
        reason: 'General ATS layout and content optimization recommendation',
      })
    }
  })

  // 4. Cover Letter feedback suggestions
  if (coverLetterFeedback) {
    const toneSugs = coverLetterFeedback.tone?.suggestions || []
    const relSugs = coverLetterFeedback.relevance?.suggestions || []
    const allCL = [...toneSugs, ...relSugs]

    allCL.forEach((sug) => {
      items.push({
        id: `ap-${idCounter++}`,
        text: `Cover Letter: ${sug}`,
        category: 'Cover Letter',
        priority: 'Medium',
        estimatedImpact: 6,
        reason: 'Aligns cover letter tone & targeted keywords with position requirements',
      })
    })
  }

  // Fallback if items list is empty
  if (items.length === 0) {
    items.push({
      id: `ap-${idCounter++}`,
      text: 'Review achievements and quantify results with metrics/percentages',
      category: 'Formatting',
      priority: 'Medium',
      estimatedImpact: 5,
      reason: 'Quantified metrics improve resume strength and ATS impact score',
    })
  }

  // Rank items by estimated impact descending (highest impact first)
  items.sort((a, b) => b.estimatedImpact - a.estimatedImpact)

  const sumImpact = items.reduce((acc, item) => acc + item.estimatedImpact, 0)
  const totalPotentialGain = Math.min(100 - score, Math.max(5, sumImpact))

  return {
    targetRole,
    score,
    items,
    totalPotentialGain,
    fileName,
  }
}

export function formatActionPlanMarkdown(data: ActionPlanData): string {
  const currentDate = new Date().toISOString().split('T')[0]
  const potentialScore = Math.min(100, data.score + data.totalPotentialGain)

  let md = `# Prioritized Action Plan Checklist\n\n`
  md += `**Target Role:** ${data.targetRole}\n`
  md += `**Current ATS Score:** ${data.score}%\n`
  md += `**Potential ATS Score:** ${potentialScore}% (+${data.totalPotentialGain}% estimated gain)\n`
  if (data.fileName) {
    md += `**Resume File:** ${data.fileName}\n`
  }
  md += `**Generated Date:** ${currentDate}\n\n`
  md += `> **Top Priority Rule:** Complete the top 3 items below first for the biggest score impact!\n\n`
  md += `---\n\n`

  const highItems = data.items.filter((i) => i.priority === 'High')
  const medItems = data.items.filter((i) => i.priority === 'Medium')
  const lowItems = data.items.filter((i) => i.priority === 'Low')

  if (highItems.length > 0) {
    md += `## 🚀 High Priority (Immediate Impact)\n\n`
    highItems.forEach((item) => {
      md += `- [ ] **[+${item.estimatedImpact}% Impact]** ${item.text}\n`
      md += `  *Reason: ${item.reason}*\n\n`
    })
  }

  if (medItems.length > 0) {
    md += `## ⚡ Medium Priority\n\n`
    medItems.forEach((item) => {
      md += `- [ ] **[+${item.estimatedImpact}% Impact]** ${item.text}\n`
      md += `  *Reason: ${item.reason}*\n\n`
    })
  }

  if (lowItems.length > 0) {
    md += `## 💡 Low Priority\n\n`
    lowItems.forEach((item) => {
      md += `- [ ] **[+${item.estimatedImpact}% Impact]** ${item.text}\n`
      md += `  *Reason: ${item.reason}*\n\n`
    })
  }

  md += `---\n`
  md += `*Generated by AI Resume Analyzer — Prioritized Action Plan Checklist*\n`

  return md
}

export function exportActionPlanMarkdown(data: ActionPlanData): void {
  const markdownText = formatActionPlanMarkdown(data)
  const blob = new Blob([markdownText], { type: 'text/markdown;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `resume-action-plan-${data.targetRole.toLowerCase().replace(/\s+/g, '-')}.md`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportActionPlanPdf(data: ActionPlanData): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const MARGIN = 15
  const PAGE_WIDTH = 210
  const MAX_WIDTH = PAGE_WIDTH - MARGIN * 2
  let y = 18

  const addHeading = (text: string, size = 16) => {
    doc.setFontSize(size)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text(text, MARGIN, y)
    y += size * 0.4 + 4
  }

  const addText = (text: string, size = 10, isBold = false, color = [51, 65, 85]) => {
    doc.setFontSize(size)
    doc.setFont('helvetica', isBold ? 'bold' : 'normal')
    doc.setTextColor(color[0], color[1], color[2])
    const lines = doc.splitTextToSize(text, MAX_WIDTH)
    for (const line of lines) {
      if (y > 275) {
        doc.addPage()
        y = 18
      }
      doc.text(line, MARGIN, y)
      y += size * 0.4 + 2
    }
  }

  // Header Banner
  doc.setFillColor(99, 102, 241) // primary purple/indigo
  doc.rect(MARGIN, y, MAX_WIDTH, 14, 'F')
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('PRIORITIZED ACTION PLAN CHECKLIST', MARGIN + 4, y + 9)
  y += 20

  // Metadata block
  const potentialScore = Math.min(100, data.score + data.totalPotentialGain)
  addHeading(`Target Role: ${data.targetRole}`, 14)
  addText(
    `Current ATS Score: ${data.score}%   |   Potential Score: ${potentialScore}% (+${data.totalPotentialGain}% Impact Gain)`,
    10,
    true,
    [16, 185, 129]
  )
  if (data.fileName) {
    addText(`Resume File: ${data.fileName}`, 9, false, [100, 116, 139])
  }
  y += 4

  // Highlight Box
  doc.setFillColor(241, 245, 249)
  doc.rect(MARGIN, y, MAX_WIDTH, 12, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('Do these top priority items first for the biggest score impact!', MARGIN + 4, y + 7.5)
  y += 18

  // Checklist Items
  addHeading('Action Checklist', 12)

  data.items.forEach((item) => {
    if (y > 265) {
      doc.addPage()
      y = 18
    }

    // Checkbox square
    doc.setLineWidth(0.4)
    doc.setDrawColor(100, 116, 139)
    doc.rect(MARGIN, y, 4, 4)

    // Priority badge text
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')

    let priorityColor = [225, 29, 72] // Red for High
    if (item.priority === 'Medium') priorityColor = [217, 119, 6] // Amber
    if (item.priority === 'Low') priorityColor = [79, 70, 229] // Blue

    doc.setTextColor(priorityColor[0], priorityColor[1], priorityColor[2])
    const priorityTag = `[${item.priority.toUpperCase()} | +${item.estimatedImpact}% ATS]`
    doc.text(priorityTag, MARGIN + 6, y + 3.2)

    // Item main text
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(15, 23, 42)
    const tagWidth = doc.getTextWidth(priorityTag) + 2
    const availableWidth = MAX_WIDTH - 6 - tagWidth
    const textLines = doc.splitTextToSize(item.text, availableWidth)

    textLines.forEach((line: string, lineIdx: number) => {
      if (lineIdx === 0) {
        doc.text(line, MARGIN + 6 + tagWidth, y + 3.2)
      } else {
        y += 4.5
        doc.text(line, MARGIN + 6, y + 3.2)
      }
    })
    y += 5.5

    // Reason subtext
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 116, 139)
    const reasonLines = doc.splitTextToSize(`Reason: ${item.reason}`, MAX_WIDTH - 6)
    reasonLines.forEach((rLine: string) => {
      doc.text(rLine, MARGIN + 6, y)
      y += 3.8
    })

    y += 3
  })

  // Footer
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text('AI Resume Analyzer — Prioritized Action Plan', MARGIN, 285)

  const fileSafeLabel = data.targetRole.toLowerCase().replace(/[^\w.-]/g, '_')
  doc.save(`resume-action-plan-${fileSafeLabel || 'checklist'}.pdf`)
}
