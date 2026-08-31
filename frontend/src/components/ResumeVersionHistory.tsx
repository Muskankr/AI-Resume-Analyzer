import { useState, useMemo, useCallback } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

type VersionStatus = 'current' | 'archived' | 'draft' | 'baseline'
type ChangeType = 'added' | 'removed' | 'modified' | 'unchanged'
type DiffView = 'unified' | 'split' | 'stats'
type ComparisonMode = 'timeline' | 'side-by-side' | 'table'
type SectionType = 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'awards'

interface ResumeVersion {
  id: string
  version: string
  name: string
  status: VersionStatus
  createdAt: string
  updatedAt: string
  author: string
  size: number
  wordCount: number
  sections: ResumeSection[]
  tags: string[]
  notes: string
  score: number
  atsScore: number
}

interface ResumeSection {
  id: string
  type: SectionType
  title: string
  content: string
  wordCount: number
  lastModified: string
}

interface VersionDiff {
  sectionType: SectionType
  changeType: ChangeType
  oldContent: string
  newContent: string
  lineChanges: number
  wordChanges: number
  details: DiffDetail[]
}

interface DiffDetail {
  lineNumber: number
  type: ChangeType
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

interface VersionComparison {
  versionA: ResumeVersion
  versionB: ResumeVersion
  diffs: VersionDiff[]
  totalChanges: number
  additions: number
  deletions: number
  modifications: number
}

interface VersionTimeline {
  date: string
  versions: ResumeVersion[]
  events: TimelineEvent[]
}

interface TimelineEvent {
  type: 'created' | 'modified' | 'scored' | 'tagged' | 'rolled-back'
  description: string
  timestamp: string
}

interface RollbackResult {
  success: boolean
  fromVersion: string
  toVersion: string
  restoredAt: string
  warnings: string[]
}

interface StatsSummary {
  totalVersions: number
  avgScore: number
  scoreTrend: number
  avgWords: number
  avgAtsScore: number
  totalChanges: number
}

// ─── Sample Data ────────────────────────────────────────────────────────────

const SAMPLE_VERSIONS: ResumeVersion[] = [
  {
    id: 'v8', version: '8.0', name: 'Final — Senior Engineer Target', status: 'current',
    createdAt: '2026-08-28T14:30:00', updatedAt: '2026-08-28T14:30:00', author: 'Anubhuti Sharma',
    size: 48200, wordCount: 687, tags: ['final', 'senior', 'targeted'], notes: 'Polished for senior frontend roles at FAANG',
    score: 92, atsScore: 96,
    sections: [
      { id: 's8-1', type: 'summary', title: 'Professional Summary', content: 'Senior Frontend Engineer with 4+ years of experience building high-performance React applications serving 10M+ users. Expert in TypeScript, Next.js, and modern web architecture. Led migration reducing bundle size by 42% and improved Core Web Vitals to 95+ scores. Passionate about developer experience and accessible design.', wordCount: 58, lastModified: '2026-08-28T14:30:00' },
      { id: 's8-2', type: 'experience', title: 'Experience', content: 'Senior Frontend Developer @ TechCorp (2024-Present): Led team of 5 engineers, architected micro-frontend platform serving 2M DAU. Reduced build times 60% with Turborepo migration. Implemented design system used across 12 products.\nFrontend Developer @ StartupXYZ (2022-2024): Built real-time collaboration features with WebSocket integration. Optimized React rendering achieving 45% performance improvement. Mentored 3 junior developers.', wordCount: 89, lastModified: '2026-08-25T10:00:00' },
      { id: 's8-3', type: 'skills', title: 'Technical Skills', content: 'React, TypeScript, Next.js, Node.js, GraphQL, Tailwind CSS, PostgreSQL, Docker, AWS (Lambda/S3/CloudFront), Cypress, Playwright, Turborepo, Vite, WebSockets, Design Systems, Accessibility (WCAG 2.1)', wordCount: 34, lastModified: '2026-08-28T14:00:00' },
      { id: 's8-4', type: 'projects', title: 'Projects', content: 'Enterprise Design System: Built component library with 80+ accessible components, Storybook documentation, and automated visual regression testing. Reduced design-to-code time 55%.\nReal-time Analytics Dashboard: WebSocket-powered dashboard processing 100K events/sec with D3.js visualizations and custom charting library.', wordCount: 56, lastModified: '2026-08-20T09:00:00' },
    ],
  },
  {
    id: 'v7', version: '7.0', name: 'Performance Optimization Focus', status: 'archived',
    createdAt: '2026-08-20T11:15:00', updatedAt: '2026-08-20T11:15:00', author: 'Anubhuti Sharma',
    size: 45100, wordCount: 652, tags: ['performance', 'optimization'], notes: 'Added performance metrics and bundle optimization experience',
    score: 85, atsScore: 88,
    sections: [
      { id: 's7-1', type: 'summary', title: 'Professional Summary', content: 'Frontend Developer with 3+ years of experience building React applications. Strong focus on performance optimization and developer tooling. Improved application load times by 40% through code splitting and lazy loading strategies.', wordCount: 40, lastModified: '2026-08-18T09:00:00' },
      { id: 's7-2', type: 'experience', title: 'Experience', content: 'Frontend Developer @ TechCorp (2024-Present): Led performance optimization initiative reducing LCP from 4.2s to 1.1s. Implemented code splitting reducing initial bundle 55%.\nFrontend Developer @ StartupXYZ (2022-2024): Built real-time collaboration features. Optimized React rendering achieving 45% performance improvement.', wordCount: 65, lastModified: '2026-08-15T14:00:00' },
      { id: 's7-3', type: 'skills', title: 'Technical Skills', content: 'React, TypeScript, Next.js, Node.js, GraphQL, Tailwind CSS, PostgreSQL, Docker, Lighthouse, Webpack, Vite, Cypress', wordCount: 22, lastModified: '2026-08-20T11:00:00' },
    ],
  },
  {
    id: 'v6', version: '6.0', name: 'ATS-Optimized Version', status: 'archived',
    createdAt: '2026-08-12T09:45:00', updatedAt: '2026-08-12T09:45:00', author: 'Anubhuti Sharma',
    size: 38900, wordCount: 580, tags: ['ats', 'optimized'], notes: 'Restructured for ATS parsing with keyword density improvements',
    score: 78, atsScore: 94,
    sections: [
      { id: 's6-1', type: 'summary', title: 'Professional Summary', content: 'Frontend Developer with 3+ years experience in React, TypeScript, and modern web technologies. Proven track record in building scalable applications and optimizing performance. Strong communicator and team player.', wordCount: 32, lastModified: '2026-08-10T08:00:00' },
      { id: 's6-2', type: 'experience', title: 'Experience', content: 'Frontend Developer @ TechCorp (2024-Present): Developed and maintained React applications. Improved performance metrics. Collaborated with design team.\nJunior Developer @ StartupXYZ (2022-2024): Built responsive web applications. Implemented new features and fixed bugs.', wordCount: 42, lastModified: '2026-08-08T11:00:00' },
    ],
  },
  {
    id: 'v5', version: '5.0', name: 'Project Portfolio Added', status: 'archived',
    createdAt: '2026-08-01T16:00:00', updatedAt: '2026-08-01T16:00:00', author: 'Anubhuti Sharma',
    size: 36200, wordCount: 510, tags: ['projects', 'portfolio'], notes: 'Added detailed project descriptions with impact metrics',
    score: 72, atsScore: 75,
    sections: [
      { id: 's5-1', type: 'summary', title: 'Professional Summary', content: 'Frontend Developer passionate about building great user experiences with React and TypeScript. 3 years of professional experience.', wordCount: 20, lastModified: '2026-07-28T10:00:00' },
      { id: 's5-2', type: 'projects', title: 'Projects', content: 'E-commerce Platform: Full-stack React app with Stripe integration.\nTask Manager: Kanban-style board with drag-and-drop.', wordCount: 18, lastModified: '2026-08-01T16:00:00' },
    ],
  },
  {
    id: 'v4', version: '4.0', name: 'Skills Section Expanded', status: 'archived',
    createdAt: '2026-07-20T13:30:00', updatedAt: '2026-07-20T13:30:00', author: 'Anubhuti Sharma',
    size: 32100, wordCount: 445, tags: ['skills', 'technical'], notes: 'Expanded technical skills with proficiency levels',
    score: 65, atsScore: 70,
    sections: [
      { id: 's4-1', type: 'skills', title: 'Technical Skills', content: 'JavaScript, React, HTML, CSS, Git, Node.js, MongoDB', wordCount: 10, lastModified: '2026-07-20T13:30:00' },
    ],
  },
  {
    id: 'v3', version: '3.0', name: 'Experience Quantified', status: 'archived',
    createdAt: '2026-07-10T10:00:00', updatedAt: '2026-07-10T10:00:00', author: 'Anubhuti Sharma',
    size: 28500, wordCount: 380, tags: ['quantified', 'metrics'], notes: 'Added numbers and metrics to experience bullets',
    score: 58, atsScore: 62,
    sections: [
      { id: 's3-1', type: 'experience', title: 'Experience', content: 'Frontend Developer @ TechCorp (2024-Present): Built React apps used by 500K users. Reduced page load time by 30%.\nJunior Developer @ StartupXYZ (2022-2024): Created 15+ features for main product. Fixed 200+ bugs.', wordCount: 42, lastModified: '2026-07-10T10:00:00' },
    ],
  },
  {
    id: 'v2', version: '2.0', name: 'First Structured Draft', status: 'archived',
    createdAt: '2026-06-28T09:15:00', updatedAt: '2026-06-28T09:15:00', author: 'Anubhuti Sharma',
    size: 22300, wordCount: 290, tags: ['draft', 'structured'], notes: 'First properly structured resume with clear sections',
    score: 42, atsScore: 48,
    sections: [
      { id: 's2-1', type: 'summary', title: 'Summary', content: 'Web developer with experience in React and JavaScript.', wordCount: 9, lastModified: '2026-06-28T09:15:00' },
    ],
  },
  {
    id: 'v1', version: '1.0', name: 'Original Upload', status: 'baseline',
    createdAt: '2026-06-15T14:00:00', updatedAt: '2026-06-15T14:00:00', author: 'Anubhuti Sharma',
    size: 18700, wordCount: 185, tags: ['original', 'baseline'], notes: 'Original resume upload — the starting point',
    score: 28, atsScore: 35,
    sections: [
      { id: 's1-1', type: 'summary', title: 'About Me', content: 'I know web dev and React.', wordCount: 6, lastModified: '2026-06-15T14:00:00' },
    ],
  },
]

const SAMPLE_TIMELINE: VersionTimeline[] = [
  {
    date: '2026-08-28', versions: [SAMPLE_VERSIONS[0]],
    events: [
      { type: 'created', description: 'Created version 8.0 — Final Senior Engineer Target', timestamp: '2026-08-28T14:30:00' },
      { type: 'scored', description: 'Score improved from 85 → 92 (+7 pts)', timestamp: '2026-08-28T14:31:00' },
    ],
  },
  {
    date: '2026-08-20', versions: [SAMPLE_VERSIONS[1]],
    events: [
      { type: 'created', description: 'Created version 7.0 — Performance Optimization Focus', timestamp: '2026-08-20T11:15:00' },
      { type: 'tagged', description: 'Tagged: performance, optimization', timestamp: '2026-08-20T11:16:00' },
    ],
  },
  {
    date: '2026-08-12', versions: [SAMPLE_VERSIONS[2]],
    events: [
      { type: 'created', description: 'Created version 6.0 — ATS-Optimized Version', timestamp: '2026-08-12T09:45:00' },
      { type: 'scored', description: 'ATS score improved from 75 → 94 (+19 pts)', timestamp: '2026-08-12T09:46:00' },
    ],
  },
  {
    date: '2026-08-01', versions: [SAMPLE_VERSIONS[3]],
    events: [
      { type: 'created', description: 'Created version 5.0 — Project Portfolio Added', timestamp: '2026-08-01T16:00:00' },
    ],
  },
  {
    date: '2026-07-20', versions: [SAMPLE_VERSIONS[4]],
    events: [
      { type: 'created', description: 'Created version 4.0 — Skills Section Expanded', timestamp: '2026-07-20T13:30:00' },
    ],
  },
  {
    date: '2026-07-10', versions: [SAMPLE_VERSIONS[5]],
    events: [
      { type: 'created', description: 'Created version 3.0 — Experience Quantified', timestamp: '2026-07-10T10:00:00' },
    ],
  },
  {
    date: '2026-06-28', versions: [SAMPLE_VERSIONS[6]],
    events: [
      { type: 'created', description: 'Created version 2.0 — First Structured Draft', timestamp: '2026-06-28T09:15:00' },
    ],
  },
  {
    date: '2026-06-15', versions: [SAMPLE_VERSIONS[7]],
    events: [
      { type: 'created', description: 'Uploaded original resume (v1.0)', timestamp: '2026-06-15T14:00:00' },
    ],
  },
]

// ─── Utility Functions ──────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function timeAgo(dateStr: string): string {
  const now = new Date('2026-08-30T12:00:00')
  const d = new Date(dateStr)
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function getStatusColor(status: VersionStatus): string {
  switch (status) {
    case 'current': return '#10b981'
    case 'draft': return '#f59e0b'
    case 'archived': return '#6b7280'
    case 'baseline': return '#3b82f6'
  }
}

function getStatusBg(status: VersionStatus): string {
  switch (status) {
    case 'current': return 'rgba(16,185,129,0.15)'
    case 'draft': return 'rgba(245,158,11,0.15)'
    case 'archived': return 'rgba(107,114,128,0.15)'
    case 'baseline': return 'rgba(59,130,246,0.15)'
  }
}

function getEventIcon(type: TimelineEvent['type']): string {
  switch (type) {
    case 'created': return '📝'
    case 'modified': return '✏️'
    case 'scored': return '📊'
    case 'tagged': return '🏷️'
    case 'rolled-back': return '⏪'
  }
}

function generateDiff(oldText: string, newText: string): DiffDetail[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const details: DiffDetail[] = []
  let oldLine = 1
  let newLine = 1

  const maxLen = Math.max(oldLines.length, newLines.length)
  for (let i = 0; i < maxLen; i++) {
    const oldLineText = oldLines[i]
    const newLineText = newLines[i]

    if (oldLineText === undefined) {
      details.push({ lineNumber: i + 1, type: 'added', content: newLineText, newLineNumber: newLine++ })
    } else if (newLineText === undefined) {
      details.push({ lineNumber: i + 1, type: 'removed', content: oldLineText, oldLineNumber: oldLine++ })
    } else if (oldLineText !== newLineText) {
      details.push({ lineNumber: i + 1, type: 'removed', content: oldLineText, oldLineNumber: oldLine++ })
      details.push({ lineNumber: i + 1, type: 'added', content: newLineText, newLineNumber: newLine++ })
    } else {
      details.push({ lineNumber: i + 1, type: 'unchanged', content: oldLineText, oldLineNumber: oldLine++, newLineNumber: newLine++ })
    }
  }
  return details
}

function compareVersions(a: ResumeVersion, b: ResumeVersion): VersionComparison {
  const sectionTypes: SectionType[] = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'awards']
  const diffs: VersionDiff[] = []
  let additions = 0, deletions = 0, modifications = 0

  for (const type of sectionTypes) {
    const sectionA = a.sections.find(s => s.type === type)
    const sectionB = b.sections.find(s => s.type === type)

    const contentA = sectionA?.content || ''
    const contentB = sectionB?.content || ''

    if (contentA === contentB) continue

    let changeType: ChangeType = 'unchanged'
    if (!sectionA && sectionB) { changeType = 'added'; additions++ }
    else if (sectionA && !sectionB) { changeType = 'removed'; deletions++ }
    else if (contentA !== contentB) { changeType = 'modified'; modifications++ }

    if (changeType !== 'unchanged') {
      const details = generateDiff(contentA, contentB)
      diffs.push({
        sectionType: type,
        changeType,
        oldContent: contentA,
        newContent: contentB,
        lineChanges: details.filter(d => d.type !== 'unchanged').length,
        wordChanges: Math.abs(contentB.split(/\s+/).length - contentA.split(/\s+/).length),
        details,
      })
    }
  }

  return { versionA: a, versionB: b, diffs, totalChanges: additions + deletions + modifications, additions, deletions, modifications }
}

// ─── Components ─────────────────────────────────────────────────────────────

function DiffLine({ detail }: { detail: DiffDetail }) {
  const bgColor = detail.type === 'added' ? 'rgba(16,185,129,0.12)' : detail.type === 'removed' ? 'rgba(239,68,68,0.12)' : 'transparent'
  const prefix = detail.type === 'added' ? '+' : detail.type === 'removed' ? '-' : ' '
  const prefixColor = detail.type === 'added' ? '#10b981' : detail.type === 'removed' ? '#ef4444' : '#6b7280'

  return (
    <div style={{ display: 'flex', background: bgColor, padding: '2px 8px', fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: '12px', lineHeight: '20px' }}>
      <span style={{ width: '30px', color: '#6b7280', textAlign: 'right', marginRight: '12px', userSelect: 'none', fontSize: '11px' }}>
        {detail.oldLineNumber || detail.newLineNumber || ''}
      </span>
      <span style={{ width: '16px', color: prefixColor, fontWeight: '700', textAlign: 'center' }}>{prefix}</span>
      <span style={{ flex: 1, color: detail.type === 'unchanged' ? '#94a3b8' : '#e2e8f0' }}>{detail.content}</span>
    </div>
  )
}

function SplitDiff({ oldContent, newContent }: { oldContent: string; newContent: string }) {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  const maxLen = Math.max(oldLines.length, newLines.length)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px' }}>
      <div style={{ background: 'rgba(239,68,68,0.05)', borderRadius: '8px 0 0 8px', overflow: 'hidden' }}>
        <div style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.1)', fontSize: '11px', fontWeight: '600', color: '#ef4444' }}>← Previous</div>
        {oldLines.map((line, i) => (
          <div key={i} style={{ display: 'flex', padding: '2px 8px', fontFamily: 'monospace', fontSize: '12px', lineHeight: '20px', background: newLines[i] !== undefined && line !== newLines[i] ? 'rgba(239,68,68,0.08)' : 'transparent' }}>
            <span style={{ width: '24px', color: '#6b7280', textAlign: 'right', marginRight: '8px', fontSize: '10px' }}>{i + 1}</span>
            <span style={{ flex: 1, color: '#e2e8f0' }}>{line}</span>
          </div>
        ))}
      </div>
      <div style={{ background: 'rgba(16,185,129,0.05)', borderRadius: '0 8px 8px 0', overflow: 'hidden' }}>
        <div style={{ padding: '6px 12px', background: 'rgba(16,185,129,0.1)', fontSize: '11px', fontWeight: '600', color: '#10b981' }}>Updated →</div>
        {newLines.map((line, i) => (
          <div key={i} style={{ display: 'flex', padding: '2px 8px', fontFamily: 'monospace', fontSize: '12px', lineHeight: '20px', background: oldLines[i] !== undefined && line !== oldLines[i] ? 'rgba(16,185,129,0.08)' : 'transparent' }}>
            <span style={{ width: '24px', color: '#6b7280', textAlign: 'right', marginRight: '8px', fontSize: '10px' }}>{i + 1}</span>
            <span style={{ flex: 1, color: '#e2e8f0' }}>{line}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ResumeVersionHistory() {
  const [activeTab, setActiveTab] = useState<'timeline' | 'versions' | 'compare' | 'diff' | 'stats'>('timeline')
  const [selectedVersions, setSelectedVersions] = useState<string[]>([])
  const [diffView, setDiffView] = useState<DiffView>('unified')
  const [compareMode, setCompareMode] = useState<ComparisonMode>('side-by-side')
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showRollbackModal, setShowRollbackModal] = useState<string | null>(null)
  const [rollbackResult, setRollbackResult] = useState<RollbackResult | null>(null)

  const versions = useMemo(() => SAMPLE_VERSIONS, [])

  const currentVersion = useMemo(() => versions.find(v => v.status === 'current')!, [versions])

  const comparison = useMemo(() => {
    if (selectedVersions.length === 2) {
      const vA = versions.find(v => v.id === selectedVersions[0])!
      const vB = versions.find(v => v.id === selectedVersions[1])!
      return compareVersions(vA, vB)
    }
    return null
  }, [selectedVersions, versions])

  const stats: StatsSummary = useMemo(() => ({
    totalVersions: versions.length,
    avgScore: Math.round(versions.reduce((s, v) => s + v.score, 0) / versions.length),
    scoreTrend: versions[0].score - versions[versions.length - 1].score,
    avgWords: Math.round(versions.reduce((s, v) => s + v.wordCount, 0) / versions.length),
    avgAtsScore: Math.round(versions.reduce((s, v) => s + v.atsScore, 0) / versions.length),
    totalChanges: versions.reduce((s, v) => s + v.sections.length, 0),
  }), [versions])

  const filteredVersions = useMemo(() => {
    if (!searchQuery) return versions
    const q = searchQuery.toLowerCase()
    return versions.filter(v => v.name.toLowerCase().includes(q) || v.tags.some(t => t.includes(q)) || v.version.includes(q))
  }, [versions, searchQuery])

  const handleVersionSelect = useCallback((id: string) => {
    setSelectedVersions(prev => {
      if (prev.includes(id)) return prev.filter(v => v !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }, [])

  const handleRollback = useCallback((versionId: string) => {
    const target = versions.find(v => v.id === versionId)!
    setRollbackResult({
      success: true,
      fromVersion: currentVersion.version,
      toVersion: target.version,
      restoredAt: new Date().toISOString(),
      warnings: [
        'Unsaved changes in current version will be archived',
        'Score may differ from historical values',
        'Some section formatting may need manual adjustment',
      ],
    })
    setShowRollbackModal(versionId)
  }, [versions, currentVersion])

  // ─── Styles ─────────────────────────────────────────────────────────────

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

  const tabs = [
    { id: 'timeline' as const, label: 'Timeline', icon: '📅' },
    { id: 'versions' as const, label: 'All Versions', icon: '📋' },
    { id: 'compare' as const, label: 'Compare', icon: '🔀' },
    { id: 'diff' as const, label: 'Diff View', icon: '📝' },
    { id: 'stats' as const, label: 'Statistics', icon: '📊' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px', background: 'linear-gradient(135deg, #3b82f6, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            📄 Version History
          </h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>
            Track every change, compare versions, and rollback when needed
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ padding: '6px 14px', borderRadius: '10px', background: getStatusBg(currentVersion.status), color: getStatusColor(currentVersion.status), fontSize: '12px', fontWeight: '600' }}>
            ● Current: v{currentVersion.version}
          </span>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            {versions.length} versions • {stats.scoreTrend > 0 ? '+' : ''}{stats.scoreTrend} score trend
          </span>
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

      {/* ═══ TIMELINE TAB ═══ */}
      {activeTab === 'timeline' && (
        <div style={{ maxWidth: '800px' }}>
          {SAMPLE_TIMELINE.map((entry, i) => (
            <div key={i} style={{ display: 'flex', gap: '20px', marginBottom: '8px' }}>
              {/* Timeline column */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '120px', paddingTop: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: i === 0 ? '#10b981' : '#94a3b8' }}>{formatDate(entry.date)}</span>
                {i < SAMPLE_TIMELINE.length - 1 && (
                  <div style={{ width: '2px', flex: 1, background: 'rgba(255,255,255,0.08)', minHeight: '40px', marginTop: '8px' }} />
                )}
              </div>

              {/* Events column */}
              <div style={{ flex: 1, paddingBottom: '20px' }}>
                {entry.events.map((event, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px' }}>{getEventIcon(event.type)}</span>
                    <div>
                      <div style={{ fontSize: '13px', color: '#e2e8f0' }}>{event.description}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>{formatTime(event.timestamp)}</div>
                    </div>
                  </div>
                ))}
                {entry.versions.map(v => (
                  <div key={v.id} style={{ ...cardStyle, marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => { setExpandedVersion(expandedVersion === v.id ? null : v.id); setActiveTab('versions'); }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '700', fontSize: '14px' }}>v{v.version}</span>
                        <span style={{ padding: '2px 8px', borderRadius: '8px', background: getStatusBg(v.status), color: getStatusColor(v.status), fontSize: '10px', fontWeight: '600' }}>{v.status}</span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{v.name}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                        Score: <strong style={{ color: v.score >= 80 ? '#10b981' : v.score >= 60 ? '#f59e0b' : '#ef4444' }}>{v.score}</strong> • ATS: <strong style={{ color: v.atsScore >= 80 ? '#10b981' : '#f59e0b' }}>{v.atsScore}</strong> • {v.wordCount} words
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: '11px', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); handleVersionSelect(v.id) }}>
                        {selectedVersions.includes(v.id) ? '✓ Selected' : 'Compare'}
                      </button>
                      {v.status !== 'current' && v.status !== 'baseline' && (
                        <button style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontSize: '11px', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); handleRollback(v.id) }}>
                          ⏪ Rollback
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ ALL VERSIONS TAB ═══ */}
      {activeTab === 'versions' && (
        <div>
          <div style={{ ...cardStyle, marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input type="text" placeholder="🔍 Search versions..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: '13px', outline: 'none' }} />
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{filteredVersions.length} versions</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {filteredVersions.map(v => {
              const isExpanded = expandedVersion === v.id
              const isSelected = selectedVersions.includes(v.id)

              return (
                <div key={v.id} style={{
                  ...cardStyle,
                  border: isSelected ? '1px solid rgba(59,130,246,0.4)' : v.status === 'current' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                }} onClick={() => setExpandedVersion(isExpanded ? null : v.id)}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '20px', fontWeight: '800', color: getStatusColor(v.status) }}>v{v.version}</span>
                        <span style={{ padding: '3px 10px', borderRadius: '8px', background: getStatusBg(v.status), color: getStatusColor(v.status), fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>{v.status}</span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0' }}>{v.name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: v.score >= 80 ? '#10b981' : v.score >= 60 ? '#f59e0b' : '#ef4444' }}>{v.score}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>ATS: {v.atsScore}</div>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${v.score}%`, background: v.score >= 80 ? '#10b981' : v.score >= 60 ? '#f59e0b' : '#ef4444', borderRadius: '2px' }} />
                    </div>
                  </div>

                  {/* Meta */}
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#94a3b8', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <span>📅 {timeAgo(v.updatedAt)}</span>
                    <span>📝 {v.wordCount} words</span>
                    <span>📦 {fileSize(v.size)}</span>
                    <span>📑 {v.sections.length} sections</span>
                  </div>

                  {/* Tags */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    {v.tags.map(tag => (
                      <span key={tag} style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: '10px' }}>#{tag}</span>
                    ))}
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: '4px' }}>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontStyle: 'italic' }}>{v.notes}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {v.sections.map(s => (
                          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span style={{ color: '#e2e8f0' }}>{s.title}</span>
                            <span style={{ color: '#6b7280' }}>{s.wordCount} words</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: '11px', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); handleVersionSelect(v.id) }}>
                          {isSelected ? '✓ Selected' : 'Select to Compare'}
                        </button>
                        {v.status !== 'current' && v.status !== 'baseline' && (
                          <button style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontSize: '11px', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); handleRollback(v.id) }}>
                            ⏪ Rollback to v{v.version}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {selectedVersions.length === 2 && (
            <div style={{ ...cardStyle, marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                Comparing {versions.find(v => v.id === selectedVersions[0])!.version} → {versions.find(v => v.id === selectedVersions[1])!.version}
              </span>
              <button style={{ padding: '8px 20px', borderRadius: '10px', background: '#3b82f6', color: '#fff', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer' }} onClick={() => setActiveTab('diff')}>
                View Diff →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ COMPARE TAB ═══ */}
      {activeTab === 'compare' && (
        <div>
          {/* Version Selector */}
          <div style={{ ...cardStyle, marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Version A (older)</label>
                <select value={selectedVersions[0] || ''} onChange={e => handleVersionSelect(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: '13px' }}>
                  <option value="">Select version...</option>
                  {versions.slice().reverse().map(v => (
                    <option key={v.id} value={v.id}>v{v.version} — {v.name}</option>
                  ))}
                </select>
              </div>
              <span style={{ fontSize: '24px', color: '#3b82f6', marginTop: '16px' }}>→</span>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Version B (newer)</label>
                <select value={selectedVersions[1] || ''} onChange={e => handleVersionSelect(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: '13px' }}>
                  <option value="">Select version...</option>
                  {versions.slice().reverse().map(v => (
                    <option key={v.id} value={v.id}>v{v.version} — {v.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {comparison && (
            <>
              {/* Comparison Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                {[
                  { label: 'Total Changes', value: comparison.totalChanges, color: '#3b82f6' },
                  { label: 'Additions', value: comparison.additions, color: '#10b981' },
                  { label: 'Deletions', value: comparison.deletions, color: '#ef4444' },
                  { label: 'Modifications', value: comparison.modifications, color: '#f59e0b' },
                ].map((stat, i) => (
                  <div key={i} style={{ ...cardStyle, textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Score Comparison */}
              <div style={{ ...cardStyle, marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>v{comparison.versionA.version} Score</div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: comparison.versionA.score >= 80 ? '#10b981' : '#f59e0b' }}>{comparison.versionA.score}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', color: comparison.versionB.score > comparison.versionA.score ? '#10b981' : '#ef4444' }}>
                      {comparison.versionB.score > comparison.versionA.score ? '📈' : '📉'}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: comparison.versionB.score > comparison.versionA.score ? '#10b981' : '#ef4444' }}>
                      {comparison.versionB.score > comparison.versionA.score ? '+' : ''}{comparison.versionB.score - comparison.versionA.score}
                    </div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>v{comparison.versionB.version} Score</div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: comparison.versionB.score >= 80 ? '#10b981' : '#f59e0b' }}>{comparison.versionB.score}</div>
                  </div>
                </div>
              </div>

              {/* Section Diffs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {comparison.diffs.map((diff, i) => (
                  <div key={i} style={{ ...cardStyle }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '8px', background: diff.changeType === 'added' ? 'rgba(16,185,129,0.15)' : diff.changeType === 'removed' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: diff.changeType === 'added' ? '#10b981' : diff.changeType === 'removed' ? '#ef4444' : '#f59e0b', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
                          {diff.changeType}
                        </span>
                        <span style={{ fontWeight: '700', fontSize: '14px', textTransform: 'capitalize' }}>{diff.sectionType}</span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>±{diff.lineChanges} lines • ±{diff.wordChanges} words</span>
                    </div>
                    <SplitDiff oldContent={diff.oldContent || '(empty)'} newContent={diff.newContent || '(empty)'} />
                  </div>
                ))}
              </div>
            </>
          )}

          {!comparison && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔀</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#e2e8f0', marginBottom: '4px' }}>Select two versions to compare</div>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>Choose versions from the dropdowns above to see a detailed comparison</div>
            </div>
          )}
        </div>
      )}

      {/* ═══ DIFF VIEW TAB ═══ */}
      {activeTab === 'diff' && (
        <div>
          {/* View Toggle */}
          <div style={{ ...cardStyle, marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>View:</span>
            {(['unified', 'split', 'stats'] as DiffView[]).map(view => (
              <button key={view} style={btnStyle(diffView === view)} onClick={() => setDiffView(view)}>
                {view === 'unified' ? '📝 Unified' : view === 'split' ? '↔️ Split' : '📊 Stats'}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#94a3b8' }}>
              {selectedVersions.length === 2 ? `v${versions.find(v => v.id === selectedVersions[0])?.version} → v${versions.find(v => v.id === selectedVersions[1])?.version}` : 'Select versions in Versions tab'}
            </span>
          </div>

          {comparison ? (
            diffView === 'stats' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {comparison.diffs.map((diff, i) => (
                  <div key={i} style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '8px', background: diff.changeType === 'added' ? 'rgba(16,185,129,0.15)' : diff.changeType === 'removed' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: diff.changeType === 'added' ? '#10b981' : diff.changeType === 'removed' ? '#ef4444' : '#f59e0b', fontSize: '10px', fontWeight: '700' }}>
                        {diff.changeType}
                      </span>
                      <span style={{ fontWeight: '700', textTransform: 'capitalize' }}>{diff.sectionType}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '12px' }}>
                      <div style={{ textAlign: 'center', padding: '8px', borderRadius: '8px', background: 'rgba(16,185,129,0.08)' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>+{diff.details.filter(d => d.type === 'added').length}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>Added</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '8px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#ef4444' }}>-{diff.details.filter(d => d.type === 'removed').length}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>Removed</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '8px', borderRadius: '8px', background: 'rgba(59,130,246,0.08)' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#3b82f6' }}>{diff.wordChanges}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>Words Δ</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {comparison.diffs.map((diff, i) => (
                  <div key={i} style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '8px', background: diff.changeType === 'added' ? 'rgba(16,185,129,0.15)' : diff.changeType === 'removed' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: diff.changeType === 'added' ? '#10b981' : diff.changeType === 'removed' ? '#ef4444' : '#f59e0b', fontSize: '10px', fontWeight: '700' }}>
                        {diff.changeType}
                      </span>
                      <span style={{ fontWeight: '700', textTransform: 'capitalize' }}>{diff.sectionType}</span>
                      <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: 'auto' }}>±{diff.lineChanges} lines</span>
                    </div>
                    {diffView === 'split' ? (
                      <SplitDiff oldContent={diff.oldContent || '(empty)'} newContent={diff.newContent || '(empty)'} />
                    ) : (
                      <div style={{ borderRadius: '8px', overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
                        {diff.details.map((d, j) => <DiffLine key={j} detail={d} />)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📝</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#e2e8f0', marginBottom: '4px' }}>No diff to display</div>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>Select two versions in the Versions tab, then come back here</div>
            </div>
          )}
        </div>
      )}

      {/* ═══ STATISTICS TAB ═══ */}
      {activeTab === 'stats' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Score Progression */}
          <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>📈 Score Progression Over Time</h3>
            <svg width="100%" height="200" viewBox="0 0 700 200">
              {/* Grid */}
              {[0, 25, 50, 75, 100].map(v => (
                <g key={v}>
                  <line x1="50" y1={180 - (v / 100) * 160} x2="680" y2={180 - (v / 100) * 160} stroke="rgba(255,255,255,0.05)" />
                  <text x="45" y={184 - (v / 100) * 160} textAnchor="end" fill="rgba(148,163,184,0.5)" fontSize="10">{v}</text>
                </g>
              ))}
              {/* Lines */}
              {(() => {
                const sorted = [...versions].reverse()
                const getX = (i: number) => 80 + (i / (sorted.length - 1)) * 580
                const getY = (v: number) => 180 - (v / 100) * 160

                const scorePath = sorted.map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(v.score)}`).join(' ')
                const atsPath = sorted.map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(v.atsScore)}`).join(' ')

                return (
                  <>
                    <path d={scorePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                    <path d={atsPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6,3" />
                    {sorted.map((v, i) => (
                      <g key={v.id}>
                        <circle cx={getX(i)} cy={getY(v.score)} r="5" fill="#3b82f6" stroke="#0f172a" strokeWidth="2" />
                        <circle cx={getX(i)} cy={getY(v.atsScore)} r="5" fill="#10b981" stroke="#0f172a" strokeWidth="2" />
                        <text x={getX(i)} y={195} textAnchor="middle" fill="#6b7280" fontSize="10">v{v.version}</text>
                      </g>
                    ))}
                    {/* Legend */}
                    <circle cx="60" cy="15" r="4" fill="#3b82f6" />
                    <text x="70" y="19" fill="#94a3b8" fontSize="10">Resume Score</text>
                    <circle cx="170" cy="15" r="4" fill="#10b981" />
                    <text x="180" y="19" fill="#94a3b8" fontSize="10">ATS Score</text>
                  </>
                )
              })()}
            </svg>
          </div>

          {/* Quick Stats */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>📊 Summary Statistics</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Total Versions', value: stats.totalVersions, icon: '📋', color: '#3b82f6' },
                { label: 'Current Score', value: currentVersion.score, icon: '⭐', color: '#10b981' },
                { label: 'Score Improvement', value: `+${stats.scoreTrend}`, icon: '📈', color: '#10b981' },
                { label: 'Avg Word Count', value: stats.avgWords, icon: '📝', color: '#f59e0b' },
                { label: 'Avg ATS Score', value: stats.avgAtsScore, icon: '🤖', color: '#8b5cf6' },
              ].map((stat, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <span>{stat.icon}</span>
                    <span style={{ color: '#94a3b8' }}>{stat.label}</span>
                  </div>
                  <span style={{ fontWeight: '700', color: stat.color }}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Version Details Table */}
          <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>📋 Version Comparison Table</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    {['Version', 'Name', 'Score', 'ATS', 'Words', 'Size', 'Sections', 'Date'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#94a3b8', fontWeight: '600', fontSize: '11px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {versions.map(v => (
                    <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: '700', color: getStatusColor(v.status) }}>v{v.version}</td>
                      <td style={{ padding: '8px 12px', color: '#e2e8f0' }}>{v.name}</td>
                      <td style={{ padding: '8px 12px', color: v.score >= 80 ? '#10b981' : '#f59e0b', fontWeight: '700' }}>{v.score}</td>
                      <td style={{ padding: '8px 12px', color: '#8b5cf6', fontWeight: '700' }}>{v.atsScore}</td>
                      <td style={{ padding: '8px 12px', color: '#e2e8f0' }}>{v.wordCount}</td>
                      <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{fileSize(v.size)}</td>
                      <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{v.sections.length}</td>
                      <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{formatDate(v.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Growth Insights */}
          <div style={{ ...cardStyle, gridColumn: 'span 3' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>💡 Growth Insights</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {[
                { icon: '🚀', title: 'Fastest Improvement', desc: 'v5 → v6: +6 score from ATS optimization (+19 ATS pts)', color: '#10b981' },
                { icon: '📝', title: 'Most Words Added', desc: 'v4 → v5: +65 words from project portfolio expansion', color: '#3b82f6' },
                { icon: '🎯', title: 'Peak ATS Score', desc: 'v6 achieved 94 ATS score through keyword optimization', color: '#8b5cf6' },
                { icon: '⭐', title: 'Final Score', desc: `v8 reached ${currentVersion.score}/100 — ready for senior roles`, color: '#f59e0b' },
              ].map((insight, i) => (
                <div key={i} style={{ padding: '16px', borderRadius: '12px', background: `${insight.color}08`, border: `1px solid ${insight.color}20` }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{insight.icon}</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: insight.color, marginBottom: '4px' }}>{insight.title}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>{insight.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ ROLLBACK MODAL ═══ */}
      {showRollbackModal && rollbackResult && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowRollbackModal(null)}>
          <div style={{ background: '#1e293b', borderRadius: '20px', padding: '32px', maxWidth: '480px', width: '90%', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 16px', fontSize: '20px' }}>⏪ Confirm Rollback</h2>
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: '#f59e0b', marginBottom: '8px', fontWeight: '600' }}>⚠️ This will:</div>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#94a3b8' }}>
                <li>Restore v{rollbackResult.toVersion} as your current resume</li>
                <li>Archive current v{rollbackResult.fromVersion} as a backup</li>
              </ul>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>Warnings:</div>
              {rollbackResult.warnings.map((w, i) => (
                <div key={i} style={{ fontSize: '11px', color: '#f59e0b', padding: '4px 0' }}>• {w}</div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '13px' }} onClick={() => setShowRollbackModal(null)}>
                Cancel
              </button>
              <button style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#f59e0b', color: '#000', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }} onClick={() => {
                alert(`✅ Rollback complete! Now using v${rollbackResult.toVersion}`)
                setShowRollbackModal(null)
              }}>
                Confirm Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResumeVersionHistory
