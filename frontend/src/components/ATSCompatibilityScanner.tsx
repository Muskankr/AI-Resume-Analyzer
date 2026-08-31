import { useState, useMemo, useCallback } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

type SectionType = 'header' | 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'formatting'
type IssueSeverity = 'critical' | 'warning' | 'info' | 'pass'
type KeywordStatus = 'found' | 'partial' | 'missing' | 'overused'
type FileFormat = 'pdf' | 'docx' | 'txt' | 'rtf'

interface ATSSection {
  type: SectionType
  title: string
  score: number
  maxScore: number
  issues: ATSIssue[]
  keywords: ATSKeyword[]
  suggestions: string[]
}

interface ATSIssue {
  id: string
  severity: IssueSeverity
  message: string
  detail: string
  fix: string
  impact: number
}

interface ATSKeyword {
  word: string
  status: KeywordStatus
  frequency: number
  optimalFrequency: number
  importance: number
}

interface ATSReport {
  overallScore: number
  sections: ATSSection[]
  fileFormat: FileFormat
  fileSize: string
  wordCount: number
  pageCount: number
  parseable: boolean
  encoding: string
  fonts: string[]
  tables: boolean
  columns: boolean
  graphics: boolean
  headers: boolean
  dateConsistent: boolean
  contactInfo: boolean
  linksPresent: boolean
}

interface ATSCompareSystem {
  name: string
  icon: string
  score: number
  features: string[]
  compatibility: string
}

interface OptimizationTip {
  category: string
  icon: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  estimatedScoreGain: number
  effort: 'easy' | 'medium' | 'hard'
}

interface KeywordSuggestion {
  keyword: string
  category: string
  importance: number
  currentlyPresent: boolean
  context: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SECTION_MAP: Record<SectionType, { icon: string; color: string }> = {
  header:        { icon: '👤', color: '#3b82f6' },
  summary:       { icon: '📝', color: '#8b5cf6' },
  experience:    { icon: '💼', color: '#10b981' },
  education:     { icon: '🎓', color: '#f59e0b' },
  skills:        { icon: '🛠️', color: '#ef4444' },
  projects:      { icon: '🚀', color: '#ec4899' },
  certifications: { icon: '📜', color: '#06b6d4' },
  formatting:    { icon: '🎨', color: '#6b7280' },
}

const SEVERITY_MAP: Record<IssueSeverity, { color: string; bg: string; icon: string }> = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: '🚨' },
  warning:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '⚠️' },
  info:     { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: 'ℹ️' },
  pass:     { color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: '✅' },
}

const KEYWORD_STATUS_MAP: Record<KeywordStatus, { color: string; label: string; icon: string }> = {
  found:   { color: '#10b981', label: 'Found',   icon: '✅' },
  partial: { color: '#f59e0b', label: 'Partial', icon: '🔍' },
  missing: { color: '#ef4444', label: 'Missing', icon: '❌' },
  overused: { color: '#8b5cf6', label: 'Overused', icon: '🔄' },
}

// ─── Sample Data ────────────────────────────────────────────────────────────

const SAMPLE_REPORT: ATSReport = {
  overallScore: 74,
  fileFormat: 'pdf',
  fileSize: '48KB',
  wordCount: 687,
  pageCount: 2,
  parseable: true,
  encoding: 'UTF-8',
  fonts: ['Arial', 'Calibri'],
  tables: false,
  columns: false,
  graphics: true,
  headers: true,
  dateConsistent: true,
  contactInfo: true,
  linksPresent: false,
  sections: [
    {
      type: 'header', title: 'Contact & Header', score: 90, maxScore: 100,
      issues: [
        { id: 'h1', severity: 'pass', message: 'Name is prominent', detail: 'Your name appears as the first element', fix: '', impact: 0 },
        { id: 'h2', severity: 'pass', message: 'Email present', detail: 'Professional email detected', fix: '', impact: 0 },
        { id: 'h3', severity: 'pass', message: 'Phone number detected', detail: 'Standard US format found', fix: '', impact: 0 },
        { id: 'h4', severity: 'warning', message: 'No LinkedIn URL', detail: 'Many recruiters check LinkedIn profiles', fix: 'Add your LinkedIn profile URL', impact: 5 },
        { id: 'h5', severity: 'info', message: 'No GitHub URL', detail: 'For technical roles, a GitHub link is valuable', fix: 'Consider adding your GitHub profile', impact: 3 },
      ],
      keywords: [],
      suggestions: ['Add LinkedIn URL', 'Add portfolio/website link', 'Consider adding location (city, state)'],
    },
    {
      type: 'summary', title: 'Professional Summary', score: 65, maxScore: 100,
      issues: [
        { id: 's1', severity: 'critical', message: 'Summary too short', detail: 'Only 58 words — ATS systems prefer 50-100 words', fix: 'Expand to 75-100 words with more specific achievements', impact: 12 },
        { id: 's2', severity: 'warning', message: 'Missing target role keyword', detail: '"Senior Frontend Engineer" not found in summary', fix: 'Include your target job title in the first line', impact: 8 },
        { id: 's3', severity: 'warning', message: 'Quantify achievements', detail: 'Summary mentions "10M+ users" but lacks other metrics', fix: 'Add 2-3 more quantified results (%, $, time)', impact: 6 },
        { id: 's4', severity: 'info', message: 'No industry keywords', detail: 'Add industry-specific terms for better matching', fix: 'Include terms like "web applications", "scalable", "performance"', impact: 4 },
      ],
      keywords: [
        { word: 'React', status: 'found', frequency: 1, optimalFrequency: 2, importance: 10 },
        { word: 'TypeScript', status: 'found', frequency: 1, optimalFrequency: 2, importance: 9 },
        { word: 'Frontend', status: 'found', frequency: 1, optimalFrequency: 2, importance: 10 },
        { word: 'performance', status: 'missing', frequency: 0, optimalFrequency: 2, importance: 7 },
        { word: 'scalable', status: 'missing', frequency: 0, optimalFrequency: 1, importance: 6 },
      ],
      suggestions: ['Add "Senior Frontend Engineer" as target role', 'Include 2 more quantified achievements', 'Add performance-related keywords'],
    },
    {
      type: 'experience', title: 'Work Experience', score: 82, maxScore: 100,
      issues: [
        { id: 'e1', severity: 'pass', message: 'Consistent date format', detail: 'All dates follow same pattern', fix: '', impact: 0 },
        { id: 'e2', severity: 'pass', message: 'Action verbs detected', detail: 'Strong verbs: Led, Architected, Reduced, Implemented', fix: '', impact: 0 },
        { id: 'e3', severity: 'warning', message: 'Bullet points too long', detail: '3 bullets exceed 30 words — ATS may truncate', fix: 'Keep bullets under 25 words for ATS readability', impact: 5 },
        { id: 'e4', severity: 'info', message: 'Add more metrics', detail: '4 of 6 bullets have numbers, aim for all', fix: 'Quantify remaining bullets with specific metrics', impact: 4 },
      ],
      keywords: [
        { word: 'micro-frontend', status: 'found', frequency: 1, optimalFrequency: 1, importance: 8 },
        { word: 'Turborepo', status: 'found', frequency: 1, optimalFrequency: 1, importance: 6 },
        { word: 'WebSocket', status: 'found', frequency: 1, optimalFrequency: 1, importance: 7 },
        { word: 'CI/CD', status: 'missing', frequency: 0, optimalFrequency: 1, importance: 8 },
        { word: 'agile', status: 'missing', frequency: 0, optimalFrequency: 1, importance: 5 },
      ],
      suggestions: ['Shorten long bullets to <25 words', 'Add CI/CD experience mention', 'Quantify all bullet points'],
    },
    {
      type: 'skills', title: 'Skills Section', score: 88, maxScore: 100,
      issues: [
        { id: 'sk1', severity: 'pass', message: 'Skills section present', detail: 'Dedicated skills section detected', fix: '', impact: 0 },
        { id: 'sk2', severity: 'pass', message: 'Good keyword density', detail: '16 relevant skills listed', fix: '', impact: 0 },
        { id: 'sk3', severity: 'info', message: 'Consider grouping skills', detail: 'Group by category for better readability', fix: 'Organize into Frontend, Backend, DevOps, Tools categories', impact: 2 },
      ],
      keywords: [
        { word: 'React', status: 'found', frequency: 3, optimalFrequency: 2, importance: 10 },
        { word: 'TypeScript', status: 'found', frequency: 2, optimalFrequency: 2, importance: 9 },
        { word: 'Node.js', status: 'found', frequency: 1, optimalFrequency: 2, importance: 8 },
        { word: 'AWS', status: 'found', frequency: 1, optimalFrequency: 2, importance: 9 },
        { word: 'GraphQL', status: 'found', frequency: 1, optimalFrequency: 1, importance: 7 },
        { word: 'Kubernetes', status: 'missing', frequency: 0, optimalFrequency: 1, importance: 6 },
        { word: 'Redis', status: 'missing', frequency: 0, optimalFrequency: 1, importance: 5 },
      ],
      suggestions: ['Add Kubernetes if applicable', 'Group skills by category', 'Remove duplicate "React" mentions'],
    },
    {
      type: 'formatting', title: 'Formatting & Structure', score: 70, maxScore: 100,
      issues: [
        { id: 'f1', severity: 'warning', message: 'Graphics detected', detail: 'Charts or icons may not be parsed by ATS', fix: 'Remove any graphical elements and use text-only', impact: 8 },
        { id: 'f2', severity: 'warning', message: 'No links in document', detail: 'No hyperlinks detected — add portfolio/GitHub links', fix: 'Add clickable links to GitHub, LinkedIn, portfolio', impact: 4 },
        { id: 'f3', severity: 'pass', message: 'Standard fonts used', detail: 'Arial and Calibri are ATS-friendly', fix: '', impact: 0 },
        { id: 'f4', severity: 'pass', message: 'PDF format', detail: 'PDF is widely supported by ATS systems', fix: '', impact: 0 },
        { id: 'f5', severity: 'info', message: 'No tables or columns', detail: 'Simple single-column layout is optimal for ATS', fix: '', impact: 0 },
      ],
      keywords: [],
      suggestions: ['Remove graphics/icons if present', 'Add hyperlink URLs to profiles', 'Keep single-column layout'],
    },
    {
      type: 'education', title: 'Education', score: 85, maxScore: 100,
      issues: [
        { id: 'ed1', severity: 'pass', message: 'Degree and institution present', detail: 'B.Tech in Computer Science detected', fix: '', impact: 0 },
        { id: 'ed2', severity: 'info', message: 'Add GPA if 3.5+', detail: 'Strong GPA can help with early-career applications', fix: 'Include GPA if it strengthens your profile', impact: 2 },
      ],
      keywords: [],
      suggestions: ['Add GPA if above 3.5', 'Include relevant coursework if applicable'],
    },
  ],
}

const ATS_SYSTEMS: ATSCompareSystem[] = [
  { name: 'Taleo', icon: '🏢', score: 85, features: ['Keyword matching', 'Section parsing', 'Date extraction'], compatibility: 'Good' },
  { name: 'Greenhouse', icon: '🌿', score: 90, features: ['Semantic analysis', 'Skills extraction', 'PDF parsing'], compatibility: 'Excellent' },
  { name: 'Workday', icon: '📊', score: 78, features: ['Basic parsing', 'Format detection', 'Keyword search'], compatibility: 'Fair' },
  { name: 'Lever', icon: '🔧', score: 88, features: ['AI matching', 'Resume parsing', 'Custom fields'], compatibility: 'Very Good' },
  { name: 'iCIMS', icon: '📋', score: 75, features: ['Keyword search', 'Basic formatting', 'Export support'], compatibility: 'Fair' },
  { name: 'Jobvite', icon: '💼', score: 82, features: ['Talent network', 'Social parsing', 'Mobile-friendly'], compatibility: 'Good' },
]

const OPTIMIZATION_TIPS: OptimizationTip[] = [
  { category: 'Keywords', icon: '🔑', title: 'Add Missing Keywords', description: 'Include 5+ missing high-importance keywords from the job description into your summary and skills sections.', impact: 'high', estimatedScoreGain: 12, effort: 'easy' },
  { category: 'Metrics', icon: '📊', title: 'Quantify All Bullets', description: 'Add specific numbers to all experience bullet points — percentages, dollar amounts, team sizes, timeframes.', impact: 'high', estimatedScoreGain: 10, effort: 'medium' },
  { category: 'Length', icon: '📏', title: 'Optimize Summary Length', description: 'Expand your professional summary to 75-100 words with targeted keywords and achievements.', impact: 'high', estimatedScoreGain: 8, effort: 'easy' },
  { category: 'Formatting', icon: '🎨', title: 'Remove Graphics', description: 'Remove any charts, icons, or graphical elements that may confuse ATS parsers.', impact: 'medium', estimatedScoreGain: 6, effort: 'easy' },
  { category: 'Structure', icon: '📐', title: 'Standard Section Order', description: 'Use the standard order: Header → Summary → Experience → Education → Skills.', impact: 'medium', estimatedScoreGain: 5, effort: 'easy' },
  { category: 'Links', icon: '🔗', title: 'Add Profile Links', description: 'Include LinkedIn, GitHub, and portfolio URLs in your header section.', impact: 'medium', estimatedScoreGain: 4, effort: 'easy' },
  { category: 'Dates', icon: '📅', title: 'Consistent Date Format', description: 'Use the same date format throughout — "MMM YYYY" (e.g., "Jan 2024") is most ATS-friendly.', impact: 'low', estimatedScoreGain: 2, effort: 'easy' },
  { category: 'File', icon: '📄', title: 'Optimize File Name', description: 'Use "FirstName-LastName-Resume.pdf" as the filename for easier tracking.', impact: 'low', estimatedScoreGain: 1, effort: 'easy' },
]

const KEYWORD_SUGGESTIONS: KeywordSuggestion[] = [
  { keyword: 'React.js', category: 'Framework', importance: 10, currentlyPresent: true, context: 'Use "React.js" variant in addition to "React"' },
  { keyword: 'Next.js', category: 'Framework', importance: 9, currentlyPresent: true, context: 'Found in skills, add to summary for emphasis' },
  { keyword: 'CI/CD', category: 'DevOps', importance: 8, currentlyPresent: false, context: 'Add to experience bullets about deployment' },
  { keyword: 'agile/scrum', category: 'Methodology', importance: 7, currentlyPresent: false, context: 'Mention sprint/iteration experience' },
  { keyword: 'microservices', category: 'Architecture', importance: 7, currentlyPresent: false, context: 'Reference in system design experience' },
  { keyword: 'performance optimization', category: 'Skills', importance: 8, currentlyPresent: false, context: 'Add specific performance achievements' },
  { keyword: 'cross-functional', category: 'Soft Skills', importance: 6, currentlyPresent: false, context: 'Mention collaboration with design/product' },
  { keyword: 'technical debt', category: 'Process', importance: 6, currentlyPresent: false, context: 'Show experience reducing tech debt' },
  { keyword: 'code review', category: 'Process', importance: 5, currentlyPresent: false, context: 'Mention code review leadership' },
  { keyword: 'accessibility', category: 'Skills', importance: 7, currentlyPresent: false, context: 'Add WCAG/accessibility compliance experience' },
]

// ─── Utility Functions ──────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 90) return '#10b981'
  if (score >= 75) return '#3b82f6'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  if (score >= 50) return 'Needs Work'
  return 'Poor'
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ATSCompatibilityScanner() {
  const [activeTab, setActiveTab] = useState<'overview' | 'sections' | 'keywords' | 'systems' | 'optimize'>('overview')
  const [expandedSection, setExpandedSection] = useState<SectionType | null>(null)
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null)
  const [filterSeverity, setFilterSeverity] = useState<IssueSeverity | 'all'>('all')
  const [selectedSystem, setSelectedSystem] = useState<ATSCompareSystem | null>(null)

  const report = useMemo(() => SAMPLE_REPORT, [])

  const allIssues = useMemo(() => {
    return report.sections.flatMap(s => s.issues.map(i => ({ ...i, section: s.type })))
  }, [report])

  const filteredIssues = useMemo(() => {
    if (filterSeverity === 'all') return allIssues
    return allIssues.filter(i => i.severity === filterSeverity)
  }, [allIssues, filterSeverity])

  const totalIssues = useMemo(() => ({
    critical: allIssues.filter(i => i.severity === 'critical').length,
    warning: allIssues.filter(i => i.severity === 'warning').length,
    info: allIssues.filter(i => i.severity === 'info').length,
    pass: allIssues.filter(i => i.severity === 'pass').length,
    total: allIssues.length,
  }), [allIssues])

  const potentialScore = useMemo(() => {
    return Math.min(100, report.overallScore + allIssues.filter(i => i.severity !== 'pass').reduce((s, i) => s + i.impact, 0))
  }, [report, allIssues])

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'sections' as const, label: 'Section Analysis', icon: '📋' },
    { id: 'keywords' as const, label: 'Keywords', icon: '🔑' },
    { id: 'systems' as const, label: 'ATS Systems', icon: '🤖' },
    { id: 'optimize' as const, label: 'Optimize', icon: '🚀' },
  ]

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '20px',
    backdropFilter: 'blur(12px)',
  }

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: '10px',
    border: active ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.06)',
    background: active ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
    color: active ? '#3b82f6' : '#94a3b8',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s',
  })

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px', background: 'linear-gradient(135deg, #10b981, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🤖 ATS Compatibility Scanner
          </h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>Ensure your resume passes Applicant Tracking Systems with flying colors</p>
        </div>
        <div style={{ textAlign: 'center', padding: '12px 24px', borderRadius: '16px', background: `${getScoreColor(report.overallScore)}15`, border: `2px solid ${getScoreColor(report.overallScore)}40` }}>
          <div style={{ fontSize: '36px', fontWeight: '900', color: getScoreColor(report.overallScore) }}>{report.overallScore}</div>
          <div style={{ fontSize: '12px', color: getScoreColor(report.overallScore), fontWeight: '600' }}>{getScoreLabel(report.overallScore)}</div>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>ATS Score</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button key={tab.id} style={{ ...btnStyle(activeTab === tab.id), padding: '10px 20px' }} onClick={() => setActiveTab(tab.id)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          {/* Score Breakdown */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>📊 Section Score Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {report.sections.map(section => {
                const sec = SECTION_MAP[section.type]
                const scorePct = Math.round((section.score / section.maxScore) * 100)
                const criticalCount = section.issues.filter(i => i.severity === 'critical').length
                const warningCount = section.issues.filter(i => i.severity === 'warning').length

                return (
                  <div key={section.type} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}
                    onClick={() => { setExpandedSection(expandedSection === section.type ? null : section.type); setActiveTab('sections') }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{sec.icon}</span>
                        <span style={{ fontWeight: '600', fontSize: '13px' }}>{section.title}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {criticalCount > 0 && <span style={{ padding: '1px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '10px' }}>{criticalCount} critical</span>}
                        {warningCount > 0 && <span style={{ padding: '1px 6px', borderRadius: '4px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '10px' }}>{warningCount} warnings</span>}
                        <span style={{ fontSize: '16px', fontWeight: '800', color: getScoreColor(scorePct) }}>{scorePct}%</span>
                      </div>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${scorePct}%`, background: getScoreColor(scorePct), borderRadius: '3px', transition: 'width 0.5s' }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Potential Score */}
            <div style={{ marginTop: '16px', padding: '12px', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#10b981' }}>📈 Potential Score After Fixes</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Address all issues to reach your maximum ATS score</div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: getScoreColor(potentialScore) }}>{potentialScore}</div>
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* File Info */}
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 12px', fontSize: '14px' }}>📄 File Information</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Format', value: report.fileFormat.toUpperCase(), color: '#10b981' },
                  { label: 'Size', value: report.fileSize, color: '#3b82f6' },
                  { label: 'Words', value: report.wordCount.toString(), color: '#f59e0b' },
                  { label: 'Pages', value: report.pageCount.toString(), color: '#8b5cf6' },
                  { label: 'Encoding', value: report.encoding, color: '#ec4899' },
                  { label: 'Parseable', value: report.parseable ? 'Yes ✓' : 'No ✗', color: report.parseable ? '#10b981' : '#ef4444' },
                ].map((info, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#94a3b8' }}>{info.label}</span>
                    <span style={{ color: info.color, fontWeight: '600' }}>{info.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Issue Summary */}
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 12px', fontSize: '14px' }}>🔍 Issue Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Critical', count: totalIssues.critical, color: '#ef4444' },
                  { label: 'Warnings', count: totalIssues.warning, color: '#f59e0b' },
                  { label: 'Info', count: totalIssues.info, color: '#3b82f6' },
                  { label: 'Passed', count: totalIssues.pass, color: '#10b981' },
                ].map((stat, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '8px', borderRadius: '8px', background: `${stat.color}10` }}>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: stat.color }}>{stat.count}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Features Detected */}
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 12px', fontSize: '14px' }}>🏷️ Features Detected</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { label: 'Standard Fonts', value: report.fonts.join(', '), ok: true },
                  { label: 'No Tables', value: report.tables ? 'Tables found' : 'Clean layout', ok: !report.tables },
                  { label: 'Single Column', value: report.columns ? 'Multi-column' : 'Single column', ok: !report.columns },
                  { label: 'Consistent Dates', value: report.dateConsistent ? 'Yes' : 'Inconsistent', ok: report.dateConsistent },
                  { label: 'Contact Info', value: report.contactInfo ? 'Present' : 'Missing', ok: report.contactInfo },
                  { label: 'Profile Links', value: report.linksPresent ? 'Found' : 'Missing', ok: report.linksPresent },
                ].map((feat, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                    <span style={{ color: '#94a3b8' }}>{feat.label}</span>
                    <span style={{ color: feat.ok ? '#10b981' : '#f59e0b', fontWeight: '600' }}>{feat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SECTIONS TAB ═══ */}
      {activeTab === 'sections' && (
        <div>
          {/* Severity Filter */}
          <div style={{ ...cardStyle, marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>Filter:</span>
            {(['all', 'critical', 'warning', 'info', 'pass'] as const).map(s => (
              <button key={s} style={btnStyle(filterSeverity === s)} onClick={() => setFilterSeverity(s)}>
                {s === 'all' ? `All (${allIssues.length})` : `${SEVERITY_MAP[s].icon} ${s} (${allIssues.filter(i => i.severity === s).length})`}
              </button>
            ))}
          </div>

          {/* Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {report.sections.map(section => {
              const sec = SECTION_MAP[section.type]
              const isExpanded = expandedSection === section.type
              const sectionIssues = filteredIssues.filter(i => i.section === section.type)

              return (
                <div key={section.type} style={{ ...cardStyle, border: isExpanded ? `1px solid ${sec.color}30` : '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => setExpandedSection(isExpanded ? null : section.type)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>{sec.icon}</span>
                      <div>
                        <span style={{ fontWeight: '700', fontSize: '14px' }}>{section.title}</span>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{sectionIssues.length} issues found</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: getScoreColor(section.score) }}>{section.score}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>/ {section.maxScore}</div>
                      </div>
                      <span style={{ fontSize: '16px', color: '#94a3b8' }}>{isExpanded ? '▼' : '▶'}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '12px', paddingTop: '12px' }}>
                      {/* Issues */}
                      <div style={{ marginBottom: '12px' }}>
                        <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: '#94a3b8' }}>Issues:</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {section.issues.map(issue => {
                            const sev = SEVERITY_MAP[issue.severity]
                            return (
                              <div key={issue.id} style={{ padding: '10px', borderRadius: '8px', background: sev.bg, border: `1px solid ${sev.color}20`, cursor: 'pointer' }}
                                onClick={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>{sev.icon}</span>
                                    <span style={{ fontSize: '12px', fontWeight: '600', color: sev.color }}>{issue.message}</span>
                                  </div>
                                  {issue.impact > 0 && <span style={{ fontSize: '10px', color: '#94a3b8' }}>-{issue.impact}pts</span>}
                                </div>
                                {expandedIssue === issue.id && (
                                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8' }}>
                                    <div style={{ marginBottom: '4px' }}>{issue.detail}</div>
                                    {issue.fix && <div style={{ color: '#10b981' }}>💡 Fix: {issue.fix}</div>}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Keywords */}
                      {section.keywords.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: '#94a3b8' }}>Keywords:</h4>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {section.keywords.map(kw => {
                              const status = KEYWORD_STATUS_MAP[kw.status]
                              return (
                                <span key={kw.word} style={{ padding: '3px 10px', borderRadius: '8px', background: `${status.color}15`, color: status.color, fontSize: '11px', fontWeight: '600', border: `1px solid ${status.color}30` }}>
                                  {status.icon} {kw.word}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Suggestions */}
                      <div>
                        <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: '#10b981' }}>💡 Suggestions:</h4>
                        {section.suggestions.map((sug, i) => (
                          <div key={i} style={{ fontSize: '11px', color: '#94a3b8', padding: '2px 0' }}>→ {sug}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ KEYWORDS TAB ═══ */}
      {activeTab === 'keywords' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Found Keywords */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>✅ Found Keywords</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {KEYWORD_SUGGESTIONS.filter(k => k.currentlyPresent).map(kw => (
                <div key={kw.keyword} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.06)' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '10px', fontWeight: '700' }}>✓</span>
                  <span style={{ flex: 1, fontSize: '13px', fontWeight: '600' }}>{kw.keyword}</span>
                  <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', fontSize: '10px' }}>{kw.category}</span>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} style={{ width: '4px', height: '12px', borderRadius: '2px', background: i < kw.importance ? '#3b82f6' : 'rgba(255,255,255,0.05)' }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Missing Keywords */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>❌ Missing Keywords</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {KEYWORD_SUGGESTIONS.filter(k => !k.currentlyPresent).map(kw => (
                <div key={kw.keyword} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '10px', fontWeight: '700' }}>MISSING</span>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{kw.keyword}</span>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', fontSize: '10px' }}>{kw.category}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', paddingLeft: '12px' }}>💡 {kw.context}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Keyword Density */}
          <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>📊 Keyword Match Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {[
                { label: 'Found', count: KEYWORD_SUGGESTIONS.filter(k => k.currentlyPresent).length, total: KEYWORD_SUGGESTIONS.length, color: '#10b981', icon: '✅' },
                { label: 'Missing', count: KEYWORD_SUGGESTIONS.filter(k => !k.currentlyPresent).length, total: KEYWORD_SUGGESTIONS.length, color: '#ef4444', icon: '❌' },
                { label: 'Match Rate', count: Math.round((KEYWORD_SUGGESTIONS.filter(k => k.currentlyPresent).length / KEYWORD_SUGGESTIONS.length) * 100), total: 100, color: '#3b82f6', icon: '📈', suffix: '%' },
                { label: 'Impact if Added', count: '+18', total: 0, color: '#f59e0b', icon: '🚀', suffix: 'pts' },
              ].map((stat, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '16px', borderRadius: '12px', background: `${stat.color}08`, border: `1px solid ${stat.color}20` }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: stat.color }}>{stat.count}{stat.suffix || ''}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ ATS SYSTEMS TAB ═══ */}
      {activeTab === 'systems' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {ATS_SYSTEMS.map(system => {
              const isSelected = selectedSystem?.name === system.name
              return (
                <div key={system.name} style={{ ...cardStyle, cursor: 'pointer', border: isSelected ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.06)' }}
                  onClick={() => setSelectedSystem(isSelected ? null : system)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '24px' }}>{system.icon}</span>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '14px' }}>{system.name}</div>
                        <div style={{ fontSize: '11px', color: getScoreColor(system.score) }}>{system.compatibility}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: getScoreColor(system.score) }}>{system.score}</div>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                    <div style={{ height: '100%', width: `${system.score}%`, background: getScoreColor(system.score), borderRadius: '3px' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {system.features.map(f => (
                      <span key={f} style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', fontSize: '10px', color: '#94a3b8' }}>{f}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {selectedSystem && (
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>{selectedSystem.icon} {selectedSystem.name} Compatibility Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981' }}>{selectedSystem.score}%</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Parse Success Rate</div>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(59,130,246,0.08)', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#3b82f6' }}>{selectedSystem.features.length}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Features Detected</div>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#f59e0b' }}>{selectedSystem.compatibility}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Compatibility Rating</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ OPTIMIZE TAB ═══ */}
      {activeTab === 'optimize' && (
        <div>
          <div style={{ ...cardStyle, marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px' }}>🚀 Optimization Roadmap</h3>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Follow these steps in order for maximum impact</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', color: '#94a3b8' }}>Score: <span style={{ fontWeight: '800', color: getScoreColor(report.overallScore) }}>{report.overallScore}</span> → <span style={{ fontWeight: '800', color: getScoreColor(potentialScore) }}>{potentialScore}</span></div>
                <div style={{ fontSize: '11px', color: '#10b981' }}>+{potentialScore - report.overallScore} points possible</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {OPTIMIZATION_TIPS.sort((a, b) => {
              const priorityOrder = { high: 0, medium: 1, low: 2 }
              return priorityOrder[a.impact] - priorityOrder[b.impact]
            }).map((tip, i) => (
              <div key={i} style={{ ...cardStyle, borderTop: `3px solid ${tip.impact === 'high' ? '#ef4444' : tip.impact === 'medium' ? '#f59e0b' : '#3b82f6'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{tip.icon}</span>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px' }}>{tip.title}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{tip.category}</div>
                    </div>
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: '6px', background: tip.impact === 'high' ? 'rgba(239,68,68,0.15)' : tip.impact === 'medium' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)', color: tip.impact === 'high' ? '#ef4444' : tip.impact === 'medium' ? '#f59e0b' : '#3b82f6', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
                    {tip.impact} priority
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 12px' }}>{tip.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '10px', fontWeight: '700' }}>+{tip.estimatedScoreGain} pts</span>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', background: tip.effort === 'easy' ? 'rgba(16,185,129,0.1)' : tip.effort === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', color: tip.effort === 'easy' ? '#10b981' : tip.effort === 'medium' ? '#f59e0b' : '#ef4444', fontSize: '10px' }}>
                      {tip.effort === 'easy' ? '⚡ Easy' : tip.effort === 'medium' ? '🔧 Medium' : '🔨 Hard'}
                    </span>
                  </div>
                  <button style={{ padding: '6px 14px', borderRadius: '8px', background: '#3b82f6', color: '#fff', border: 'none', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                    onClick={() => alert(`✅ Tip marked as started: ${tip.title}`)}>
                    Start
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ATSCompatibilityScanner
