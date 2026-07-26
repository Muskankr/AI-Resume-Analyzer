import React, { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import NotFound from './components/NotFound'
import axios from 'axios'
import './index.css'
import { AtsScore } from './AtsScore'
import { useAnalysisHistory, type AnalysisEntry } from './hooks/useAnalysisHistory'
import { HistorySidebar } from './HistorySidebar'
import { useAuth } from './hooks/useAuth'
import { AuthModal } from './AuthModal'
import { Footer } from './Footer'
import AnalysisSkeleton from './components/AnalysisSkeleton/AnalysisSkeleton'
import { InfoTooltip } from './components/InfoTooltip'
import { SkillWordCloud } from './components/SkillWordCloud'
import {
  FileText,
  Loader2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Target,
  Info,
  HelpCircle,
  X,
} from 'lucide-react'
import { Navbar } from './components/Navbar'
import EmptyState from './components/EmptyState'
import { StepProgress } from './components/StepProgress'
import { OnboardingTour } from './components/OnboardingTour'
import { HowItWorks } from './components/HowItWorks'
import { CompareVersions } from './components/CompareVersions/CompareVersions'
import { SkillChip } from './components/SkillChip'
import {
  requestNotificationPermission,
  sendAnalysisCompleteNotification,
} from './utils/notification'
import { ProgressBar } from './components/ProgressBar/ProgressBar'
import { UndoToast } from './components/UndoToast/UndoToast'
type Theme = 'light' | 'dark'

interface UndoState {
  file: File | null
  score: number | null
  skills: string[]
  suggestions: string[]
  matchedSkills: string[]
  missingSkills: string[]
  resumeText: string
  analysisSource: 'sample' | 'upload' | null
  activeFileName: string
  targetRole: string
}

const DEFAULT_TITLE = 'AI Resume Analyzer'
const READY_TITLE = '✅ Analysis Ready — AI Resume Analyzer'

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
  } catch {
    // localStorage / matchMedia can throw in restricted privacy modes
  }
  return 'light'
}

function highlightSkills(text: string, skills: string[]): React.ReactNode[] {
  if (!text) return []
  if (skills.length === 0) return [text]

  const sorted = [...skills].sort((a, b) => b.length - a.length)
  const escaped = sorted.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`(?<![\\w])(${escaped.join('|')})(?![\\w])`, 'gi')
  const parts = text.split(pattern)
  const skillSet = new Set(skills.map((s) => s.toLowerCase()))

  return parts.map((part, i) =>
    skillSet.has(part.toLowerCase()) ? (
      <mark key={i} className="skill-highlight">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

function ResumePreview({ text, skills }: { text: string; skills: string[] }) {
  if (!text) return null
  return (
    <div className="resume-preview mt-4">
      <h4>
        <FileText size={16} /> Resume Text Preview
      </h4>
      <pre className="resume-preview__body">{highlightSkills(text, skills)}</pre>
    </div>
  )
}

interface SuggestionCardProps {
  text: string
  index: number
  backendUrl?: string
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ text, index, backendUrl = '' }) => {
  const [copied, setCopied] = React.useState(false)
  const [voted, setVoted] = React.useState<'up' | 'down' | null>(null)
  const [isVoting, setIsVoting] = React.useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleVote = async (vote: 'up' | 'down') => {
    if (voted !== null || isVoting) return
    setIsVoting(true)
    try {
      await axios.post(`${backendUrl}/api/suggestion-feedback/`, {
        suggestion: text,
        vote,
        index,
      })
      setVoted(vote)
    } catch (err) {
      console.error('Failed to send suggestion feedback:', err)
      setVoted(vote)
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <div className="suggestion-card">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{ fontSize: '16px' }}>💡</span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#5eead4',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Recommendation #{index + 1}
          </span>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--font-size-sm)',
            color: 'var(--card-text)',
            lineHeight: '1.6',
          }}
        >
          {text}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid var(--step-card-border)',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        {/* Feedback Widget */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {voted === null ? (
            <>
              <span
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  fontWeight: '500',
                }}
              >
                Was this helpful?
              </span>
              <button
                type="button"
                onClick={() => handleVote('up')}
                disabled={isVoting}
                title="Helpful"
                aria-label="Vote helpful"
                style={{
                  background: 'var(--btn-secondary-bg)',
                  border: '1px solid var(--btn-secondary-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  color: 'var(--card-text)',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s ease',
                }}
              >
                👍
              </button>
              <button
                type="button"
                onClick={() => handleVote('down')}
                disabled={isVoting}
                title="Not helpful"
                aria-label="Vote not helpful"
                style={{
                  background: 'var(--btn-secondary-bg)',
                  border: '1px solid var(--btn-secondary-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  color: 'var(--card-text)',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s ease',
                }}
              >
                👎
              </button>
            </>
          ) : (
            <span
              style={{
                fontSize: '0.78rem',
                color: voted === 'up' ? '#4ade80' : '#f87171',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {voted === 'up' ? 'Thanks for your feedback! 👍' : 'Thanks for your feedback! 👎'}
            </span>
          )}
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="suggestion-copy-btn"
          aria-label="Copy recommendation text"
        >
          {copied ? '✅ Copied' : '📋 Copy Text'}
        </button>
      </div>
    </div>
  )
}

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [retryAfter, setRetryAfter] = useState<number | null>(null)
  const [retryDisabled, setRetryDisabled] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [undoState, setUndoState] = useState<UndoState | null>(null)
  const [showUndoToast, setShowUndoToast] = useState(false)

  // Validation States
  const [fileError, setFileError] = useState<string | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)

  const [showShortcutHelp, setShowShortcutHelp] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [showExportDropdown, setShowExportDropdown] = useState(false)

  const [targetRole, setTargetRole] = useState('Frontend Developer')
  const [matchedSkills, setMatchedSkills] = useState<string[]>([])
  const [missingSkills, setMissingSkills] = useState<string[]>([])
  const [showAllSkills, setShowAllSkills] = useState(false)
  const [copied, setCopied] = useState(false)
  const [analysisSource, setAnalysisSource] = useState<'sample' | 'upload' | null>(null)
  const [jobDesc, setJobDesc] = useState('')
  const [resumeText, setResumeText] = useState<string>('')
  const [activeFileName, setActiveFileName] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<'history' | 'notifications'>('history')
  const [compareOpen, setCompareOpen] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState<number>(0)
  const [analysisStageLabel, setAnalysisStageLabel] = useState<string>('')
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file')
  const [resumeUrl, setResumeUrl] = useState<string>('')
  const [urlError, setUrlError] = useState<string | null>(null)

  let currentStep: 1 | 2 | 3 = 1
  if (loading) {
    currentStep = 2
  } else if (!loading && score !== null) {
    currentStep = 3
  }

  const { user, signup, login, logout } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  const {
    entries,
    unreadCount,
    lastViewedTimestamp,
    markAllAsViewed,
    addEntry,
    deleteEntry,
    clearHistory,
    setEntries,
  } = useAnalysisHistory()

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

  const handleDeleteEntry = async (id: string) => {
    if (user) {
      try {
        await axios.delete(`${backendUrl}/api/history/${id}/`, {
          headers: { Authorization: `Bearer ${user.token}` },
        })
      } catch (error) {
        console.error('Failed to delete from database', error)
      }
    }
    deleteEntry(id)
  }

  const MAX_CHARS = 2000
  const isClose = jobDesc.length >= MAX_CHARS * 0.9
  const isOver = jobDesc.length > MAX_CHARS

  const handleClearAll = async () => {
    if (user) {
      try {
        await axios.delete(`${backendUrl}/api/history/clear/`, {
          headers: { Authorization: `Bearer ${user.token}` },
        })
      } catch (error) {
        console.error('Failed to clear database history', error)
      }
    }
    clearHistory()
  }

  const fetchDbHistory = useCallback(
    async (token: string) => {
      try {
        const res = await axios.get(`${backendUrl}/api/history/`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const dbEntries: AnalysisEntry[] = res.data.map(
          (item: {
            id: string | number
            created_at: string | number
            score: number
            skills_found: string[]
            suggestions: string[]
            matched_skills: string[]
            missing_skills: string[]
            target_role: string
            file_name: string
          }) => ({
            id: String(item.id),
            timestamp: new Date(item.created_at).getTime(),
            score: item.score,
            skills: item.skills_found,
            suggestions: item.suggestions,
            matchedSkills: item.matched_skills,
            missingSkills: item.missing_skills,
            targetRole: item.target_role,
            fileName: item.file_name,
          })
        )
        const uniqueDbEntries = dbEntries.filter(
          (entry, index, self) =>
            index ===
            self.findIndex((t) => t.fileName === entry.fileName && t.score === entry.score)
        )
        setEntries(uniqueDbEntries)
      } catch {
        /* silently ignore */
      }
    },
    [backendUrl, setEntries]
  )

  useEffect(() => {
    if (user) fetchDbHistory(user.token)
  }, [user, fetchDbHistory])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // Ignore localStorage access restrictions in private browsing modes
    }
  }, [theme])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        document.title = DEFAULT_TITLE
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const resetAnalysis = useCallback(() => {
    if (score !== null || skills.length > 0) {
      setUndoState({
        file,
        score,
        skills,
        suggestions,
        matchedSkills,
        missingSkills,
        resumeText,
        analysisSource,
        activeFileName,
        targetRole,
      })
      setShowUndoToast(true)
    }

    setFile(null)
    setScore(null)
    setSkills([])
    setSuggestions([])
    setMatchedSkills([])
    setMissingSkills([])
    setResumeText('')
    setShowAllSkills(false)
    setCopied(false)
    setAnalysisSource(null)
    setActiveFileName('')
    setShowExportDropdown(false)
    setFileError(null)
    setRoleError(null)
  }, [
    file,
    score,
    skills,
    suggestions,
    matchedSkills,
    missingSkills,
    resumeText,
    analysisSource,
    activeFileName,
    targetRole,
  ])

  const handleUndoReset = useCallback(() => {
    if (undoState) {
      setFile(undoState.file)
      setScore(undoState.score)
      setSkills(undoState.skills)
      setSuggestions(undoState.suggestions)
      setMatchedSkills(undoState.matchedSkills)
      setMissingSkills(undoState.missingSkills)
      setResumeText(undoState.resumeText)
      setAnalysisSource(undoState.analysisSource)
      setActiveFileName(undoState.activeFileName)
      setTargetRole(undoState.targetRole)
      setUndoState(null)
      setShowUndoToast(false)
    }
  }, [undoState])

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const modifier = event.altKey

      if (modifier && event.key.toLowerCase() === 'u') {
        event.preventDefault()
        document.getElementById('fileUpload')?.click()
      }

      if (modifier && event.key.toLowerCase() === 'r') {
        event.preventDefault()
        resetAnalysis()
      }

      if (event.key === 'Escape') {
        setShowAuthModal(false)
        setHistoryOpen(false)
        setShowShortcutHelp(false)
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [resetAnalysis])

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const runAnalysis = async (
    fileToAnalyze: File | null,
    source: 'sample' | 'upload',
    url?: string
  ) => {
    try {
      setLoading(true)
      setAnalysisSource(source)
      setAnalysisProgress(25)
      setAnalysisStageLabel(
        url ? 'Fetching document from URL...' : 'Stage 1/3: Extracting text from document...'
      )

      const formData = new FormData()
      if (fileToAnalyze) {
        formData.append('file', fileToAnalyze)
      }
      if (url) {
        formData.append('url', url)
      }
      formData.append('role', targetRole)
      formData.append('job_description', jobDesc)

      const stageTimer1 = setTimeout(() => {
        setAnalysisProgress(60)
        setAnalysisStageLabel('Stage 2/3: Detecting & matching skills...')
      }, 500)

      const stageTimer2 = setTimeout(() => {
        setAnalysisProgress(90)
        setAnalysisStageLabel('Stage 3/3: Generating ATS score & recommendations...')
      }, 1000)

      const headers = user ? { Authorization: `Bearer ${user.token}` } : {}
      const res = await axios.post(`${backendUrl}/api/upload/`, formData, { headers })

      clearTimeout(stageTimer1)
      clearTimeout(stageTimer2)

      setAnalysisProgress(100)
      setAnalysisStageLabel('Analysis complete!')

      setScore(res.data.score)
      setSkills(res.data.skills_found || [])
      setSuggestions(res.data.suggestions || [])
      setMatchedSkills(res.data.matched_skills || [])
      setMissingSkills(res.data.missing_skills || [])
      setResumeText(res.data.resume_text || '')
      const fileName = fileToAnalyze ? fileToAnalyze.name : url ? 'Imported Resume' : 'Resume'
      setActiveFileName(fileName)

      // Change the browser tab title only if the user is on another tab
      if (document.hidden) {
        document.title = READY_TITLE
      }

      setLoading(false)

      if (user) {
        await fetchDbHistory(user.token)
      } else {
        addEntry({
          score: res.data.score,
          skills: res.data.skills_found || [],
          suggestions: res.data.suggestions || [],
          matchedSkills: res.data.matched_skills || [],
          missingSkills: res.data.missing_skills || [],
          targetRole: targetRole,
          fileName: fileName,
        })
      }

      // Send native browser notification if tab is hidden / unfocused
      sendAnalysisCompleteNotification(fileName)
    } catch (error: unknown) {
      console.error(error)
      let errorMsg = 'Unknown error'
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          const retryHeader = error.response.headers['retry-after']

          const retrySeconds = Number(retryHeader) || Number(error.response.data?.retry_after) || 30

          setRetryAfter(retrySeconds)
          setRetryDisabled(true)

          let remaining = retrySeconds

          const timer = setInterval(() => {
            remaining--

            setRetryAfter(remaining)

            if (remaining <= 0) {
              clearInterval(timer)
              setRetryDisabled(false)
              setRetryAfter(null)
            }
          }, 1000)

          errorMsg = `Too many requests. Please wait ${retrySeconds}s before trying again.`
        } else {
          errorMsg = error.response?.data?.error ?? error.message
        }
      }
      if (!(axios.isAxiosError(error) && error.response?.status === 429)) {
        alert(
          source === 'sample' ? `Sample analysis failed: ${errorMsg}` : `Upload failed: ${errorMsg}`
        )
      }

      setLoading(false)
    }
  }

  const uploadResume = async () => {
    let hasError = false

    if (!targetRole || targetRole.trim() === '') {
      setRoleError('Target career track is required.')
      hasError = true
    } else {
      setRoleError(null)
    }

    if (uploadMode === 'file') {
      if (!file) {
        setFileError('Please upload a resume file before analyzing.')
        hasError = true
      } else {
        setFileError(null)
      }
    } else {
      if (!resumeUrl || resumeUrl.trim() === '') {
        setUrlError('Please enter a shareable link (Google Drive, Dropbox, or PDF URL).')
        hasError = true
      } else if (
        !resumeUrl.trim().startsWith('http://') &&
        !resumeUrl.trim().startsWith('https://')
      ) {
        setUrlError('URL must start with http:// or https://')
        hasError = true
      } else {
        setUrlError(null)
      }
    }

    if (hasError) return

    await requestNotificationPermission()
    if (uploadMode === 'file') {
      await runAnalysis(file!, 'upload')
    } else {
      await runAnalysis(null, 'upload', resumeUrl.trim())
    }
  }

  const handleSampleResume = async () => {
    try {
      await requestNotificationPermission()
      setLoading(true)
      setAnalysisSource('sample')
      const response = await fetch('/sample-resume.pdf')
      if (!response.ok) {
        throw new Error('Failed to load sample resume PDF')
      }
      const blob = await response.blob()
      const sampleFile = new File([blob], 'sample-resume.pdf', { type: 'application/pdf' })
      await runAnalysis(sampleFile, 'sample')
      setActiveFileName(sampleFile.name)
    } catch (error: unknown) {
      console.error(error)
      alert('Could not load sample resume')
      setLoading(false)
    }
  }

  const copySuggestionsToClipboard = () => {
    if (suggestions.length === 0) return
    const plainTextSuggestions = suggestions.map((s: string) => `• ${s}`).join('\n')
    navigator.clipboard
      .writeText(plainTextSuggestions)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch((err) => console.error('Failed to copy text: ', err))
  }

  const getExportTimestamp = () => {
    const pad = (n: number) => n.toString().padStart(2, '0')
    const d = new Date()
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(
      d.getMinutes()
    )}-${pad(d.getSeconds())}`
  }

  const exportJSON = () => {
    const data = { score, skills, suggestions }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resume-analysis-${getExportTimestamp()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportDropdown(false)
  }

  const exportCSV = () => {
    const escapeCSV = (str: string) => `"${str.replace(/"/g, '""')}"`
    const header = 'score,skills,suggestions\n'
    const row = `${score},${escapeCSV(skills.join(','))},${escapeCSV(suggestions.join(','))}\n`
    const blob = new Blob([header + row], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resume-analysis-${getExportTimestamp()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportDropdown(false)
  }

  const selectHistoryEntry = (entry: AnalysisEntry) => {
    setScore(entry.score)
    setSkills(entry.skills)
    setSuggestions(entry.suggestions)
    setMatchedSkills(entry.matchedSkills)
    setMissingSkills(entry.missingSkills)
    setTargetRole(entry.targetRole)
    setActiveFileName(entry.fileName)
    setShowAllSkills(false)
    setCopied(false)
    setHistoryOpen(false)
    setShowExportDropdown(false)
  }

  const handleLogout = () => {
    logout()
    clearHistory()
  }

  const [heroWords] = useState(['ATS Filters.', 'Recruiters.', 'The Competition.'])
  const [currentWordIdx, setCurrentWordIdx] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentWord = heroWords[currentWordIdx]
    let timeout: ReturnType<typeof setTimeout>

    if (!isDeleting && charCount < currentWord.length) {
      timeout = setTimeout(() => setCharCount(c => c + 1), 80)
    } else if (!isDeleting && charCount === currentWord.length) {
      timeout = setTimeout(() => setIsDeleting(true), 2000)
    } else if (isDeleting && charCount > 0) {
      timeout = setTimeout(() => setCharCount(c => c - 1), 40)
    } else if (isDeleting && charCount === 0) {
      setIsDeleting(false)
      setCurrentWordIdx((idx) => (idx + 1) % heroWords.length)
    }

    return () => clearTimeout(timeout)
  }, [charCount, isDeleting, currentWordIdx, heroWords])

  return (
    <>
      {/* Floating Background Orbs */}
      <div className="floating-orb floating-orb--1" />
      <div className="floating-orb floating-orb--2" />
      <div className="floating-orb floating-orb--3" />
      <div className="floating-shape floating-shape--cube" />
      <div className="floating-shape floating-shape--circle" />
      <div className="floating-shape floating-shape--triangle" />
      <div className="floating-shape floating-shape--diamond" />
      <div className="gradient-mesh" />

      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <OnboardingTour />
      <HistorySidebar
        entries={entries}
        unreadCount={unreadCount}
        lastViewedTimestamp={lastViewedTimestamp}
        onMarkAllAsViewed={markAllAsViewed}
        activeFileName={activeFileName}
        onSelect={selectHistoryEntry}
        onDelete={handleDeleteEntry}
        onClear={handleClearAll}
        isOpen={historyOpen}
        onToggle={() => setHistoryOpen((v) => !v)}
        onCompare={() => setCompareOpen(true)}
        activeTab={sidebarTab}
        onTabChange={setSidebarTab}
      />

      {compareOpen && (
        <CompareVersions
          entries={entries}
          token={user?.token}
          onClose={() => setCompareOpen(false)}
        />
      )}

      <Navbar
        theme={theme}
        toggleTheme={toggleTheme}
        user={user}
        onLogin={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        onHistoryClick={() => {
          setSidebarTab('history')
          setHistoryOpen(true)
        }}
        onNotificationsClick={() => {
          setSidebarTab('notifications')
          setHistoryOpen(true)
          if (markAllAsViewed) {
            markAllAsViewed()
          }
        }}
        unreadCount={unreadCount}
      />
      <Routes>
        <Route
          path="/"
          element={
            <main id="main-content" className="landing-page">
              <div className="grid-overlay" />
              {showAuthModal && (
                <AuthModal
                  onSignup={signup}
                  onLogin={login}
                  onClose={() => setShowAuthModal(false)}
                />
              )}

              <div className={score === null && !loading ? 'hero-container' : 'app-container'}>
                <div className={score === null && !loading ? 'hero-left' : ''}>
                  {score === null && !loading && (
                    <section className="hero-intro" aria-label="Introduction">
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                        <span className="hero-badge" style={{ marginBottom: 0 }}>
                          ⭐ AI Powered Resume Optimization
                        </span>
                      </div>

                      <h1
                        className="app-main-title gradient-text-animated"
                        style={{
                          fontSize: 'clamp(2.8rem, 6vw, 4.8rem)',
                          lineHeight: '1.1',
                          fontWeight: 800,
                          marginTop: '18px',
                          marginBottom: '16px',
                        }}
                      >
                        Beat{' '}
                        <span style={{ position: 'relative' }}>
                          {heroWords[currentWordIdx].substring(0, charCount)}
                          <span
                            style={{
                              display: 'inline-block',
                              width: '3px',
                              height: '0.8em',
                              background: '#2dd4bf',
                              marginLeft: '2px',
                              animation: 'none',
                              verticalAlign: 'text-top',
                              opacity: isDeleting ? 0.5 : 1,
                            }}
                          />
                        </span>
                        <br />
                        Land More Interviews.
                      </h1>

                      <p
                        className="hero-description"
                        style={{
                          maxWidth: '760px',
                          margin: '0 auto 30px',
                          fontSize: '1.15rem',
                          textAlign: 'center',
                        }}
                      >
                        Analyze your resume with AI, discover missing skills, improve ATS
                        compatibility and receive personalized recommendations in seconds.
                      </p>

                      <div className="hero-stats">
                        <div className="bounce-in bounce-in-delay-1">
                          <h2>50K+</h2>
                          <span>Resumes Reviewed</span>
                        </div>

                        <div className="bounce-in bounce-in-delay-2">
                          <h2>95%</h2>
                          <span>ATS Accuracy</span>
                        </div>

                        <div className="bounce-in bounce-in-delay-3">
                          <h2>24/7</h2>
                          <span>AI Available</span>
                        </div>
                      </div>
                    </section>
                  )}

                  {(loading || score !== null) && <StepProgress currentStep={currentStep} />}

                  <section className="analyzer-card analyzer-form-section glass-card-premium bounce-in" aria-label="Resume Analyzer Form">
                    {/* STEP 1: Target Career Track */}
                    <div
                      className="mb-4 p-0 role-selector-container"
                      style={{
                        background: 'transparent',
                        border: 'none',
                      }}
                    >
                      <label
                        htmlFor="roleSelect"
                        style={{
                          display: 'block',
                          marginBottom: '12px',
                          fontWeight: '600',
                          color: 'var(--input-text)',
                          fontSize: 'var(--font-size-sm)',
                        }}
                      >
                        🎯 Target Career Track
                      </label>
                      <div className="custom-select-container">
                        <select
                          id="roleSelect"
                          value={targetRole}
                          onChange={(e) => {
                            setTargetRole(e.target.value)
                            if (e.target.value.trim() !== '') setRoleError(null)
                          }}
                          className="custom-select-element"
                        >
                          <option value="Frontend Developer">Frontend Developer</option>
                          <option value="Backend Developer">Backend Developer</option>
                          <option value="Data Analyst">Data Analyst</option>
                        </select>
                      </div>
                      {roleError && (
                        <div
                          style={{
                            color: '#f43f5e',
                            fontSize: '13px',
                            marginTop: '8px',
                            fontWeight: '500',
                            textAlign: 'center',
                          }}
                        >
                          ⚠️ {roleError}
                        </div>
                      )}
                    </div>

                    {/* STEP 2: Upload File / Link & Job Description */}
                    <div className="mb-5">
                      {/* Mode Switcher Tabs */}
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          justifyContent: 'center',
                          marginBottom: '16px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setUploadMode('file')
                            setUrlError(null)
                          }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            background:
                              uploadMode === 'file' ? '#14b8a6' : 'var(--btn-secondary-bg)',
                            color: uploadMode === 'file' ? '#fff' : 'var(--btn-secondary-text)',
                            border: uploadMode === 'file' ? '1px solid transparent' : '1px solid var(--btn-secondary-border)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          📄 Local File Upload
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadMode('url')
                            setFileError(null)
                          }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            background:
                              uploadMode === 'url' ? '#14b8a6' : 'var(--btn-secondary-bg)',
                            color: uploadMode === 'url' ? '#fff' : 'var(--btn-secondary-text)',
                            border: uploadMode === 'url' ? '1px solid transparent' : '1px solid var(--btn-secondary-border)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          🔗 Import via Link
                        </button>
                      </div>

                      {uploadMode === 'file' ? (
                        <div
                          className="upload-box mb-3"
                          style={{ width: '100%', maxWidth: '100%' }}
                        >
                          <input
                            type="file"
                            id="fileUpload"
                            hidden
                            accept=".pdf,.docx"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              if (e.target.files && e.target.files[0]) {
                                setFile(e.target.files[0])
                                setFileError(null)
                              }
                            }}
                          />
                          <label
                            htmlFor="fileUpload"
                            style={{
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              width: '100%',
                            }}
                          >
                            {file ? (
                              <>
                                <div className="upload-icon-container" style={{ color: 'var(--color-primary)' }}>
                                  <CheckCircle size={36} />
                                </div>
                                <div className="upload-title" style={{ wordBreak: 'break-all', padding: '0 10px' }}>
                                  {file.name}
                                </div>
                                <div className="upload-subtitle">
                                  {(file.size / (1024 * 1024)).toFixed(2)} MB • Click to change file
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="upload-icon-container">
                                  <FileText size={36} />
                                </div>
                                <div className="upload-title">
                                  Drag & Drop Resume or Click to Browse
                                </div>
                                <div className="upload-subtitle">
                                  Supports PDF and DOCX formats (Max 5MB)
                                </div>
                              </>
                            )}
                          </label>
                        </div>
                      ) : (
                        <div className="mb-3" style={{ textAlign: 'left' }}>
                          <label
                            htmlFor="resumeUrlInput"
                            style={{
                              fontWeight: '600',
                              display: 'block',
                              marginBottom: '8px',
                              color: 'var(--card-text)',
                              fontSize: '0.85rem',
                            }}
                          >
                            Paste Shareable Link (Google Drive / Dropbox / Direct PDF)
                          </label>
                          <input
                            type="url"
                            id="resumeUrlInput"
                            value={resumeUrl}
                            onChange={(e) => {
                              setResumeUrl(e.target.value)
                              if (e.target.value.trim() !== '') setUrlError(null)
                            }}
                            placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              borderRadius: 'var(--radius-md)',
                              background: 'var(--input-bg)',
                              color: 'var(--input-text)',
                              border: '1px solid var(--input-border)',
                              fontSize: '0.9rem',
                            }}
                          />
                          <span
                            style={{
                              fontSize: '0.78rem',
                              color: 'var(--text-muted)',
                              marginTop: '6px',
                              display: 'block',
                            }}
                          >
                            ℹ️ Note: Make sure link permissions are set to "Anyone with the link can
                            view".
                          </span>
                        </div>
                      )}

                      {fileError && uploadMode === 'file' && (
                        <div
                          style={{
                            color: '#f43f5e',
                            fontSize: '13px',
                            marginTop: '-4px',
                            marginBottom: '16px',
                            fontWeight: '500',
                            textAlign: 'center',
                          }}
                        >
                          ⚠️ {fileError}
                        </div>
                      )}

                      {urlError && uploadMode === 'url' && (
                        <div
                          style={{
                            color: '#f43f5e',
                            fontSize: '13px',
                            marginTop: '4px',
                            marginBottom: '16px',
                            fontWeight: '500',
                            textAlign: 'center',
                          }}
                        >
                          ⚠️ {urlError}
                        </div>
                      )}

                      {/* Optional Job Description */}
                      <div className="mb-4" style={{ textAlign: 'left' }}>
                        <label
                          htmlFor="jobDescription"
                          style={{
                            fontWeight: '600',
                            display: 'block',
                            marginBottom: '8px',
                            color: 'var(--input-text)',
                          }}
                        >
                          Job Description (Optional)
                        </label>
                        <textarea
                          id="jobDescription"
                          className="custom-textarea"
                          value={jobDesc}
                          onChange={(e) => setJobDesc(e.target.value)}
                          placeholder="Paste the job description here..."
                          style={{
                            width: '100%',
                            minHeight: '100px',
                            padding: '12px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--input-bg)',
                            color: 'var(--input-text)',
                            border: '1px solid var(--input-border)',
                          }}
                        />
                        <div
                          style={{
                            textAlign: 'right',
                            color: isOver ? '#f43f5e' : isClose ? '#f59e0b' : 'inherit',
                            opacity: isOver || isClose ? 1 : 0.7,
                            fontSize: '0.85rem',
                            marginTop: '5px',
                            fontWeight: isOver ? 'bold' : 'normal',
                          }}
                        >
                          {jobDesc.length} / {MAX_CHARS} characters
                        </div>
                      </div>

                      {/* STEP 3: Action Buttons */}
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '12px',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                        className="action-buttons"
                      >
                        <button
                          className="analyze-btn"
                          onClick={uploadResume}
                          disabled={loading || retryDisabled}
                          style={{ minHeight: '44px', flex: '1 1 200px', maxWidth: '100%' }}
                        >
                          {loading && analysisSource === 'upload'
                            ? '⏳ Extracting...'
                            : '🚀 Analyze Resume'}
                        </button>

                        <button
                          className="secondary-btn"
                          onClick={handleSampleResume}
                          disabled={loading || retryDisabled}
                          type="button"
                          style={{ minHeight: '44px', flex: '1 1 200px', maxWidth: '100%' }}
                        >
                          {loading && analysisSource === 'sample' ? (
                            <>
                              <Loader2 size={15} className="spin" /> Loading...
                            </>
                          ) : (
                            'Try Sample Resume'
                          )}
                        </button>
                      </div>
                      {retryDisabled && retryAfter !== null && (
                        <p
                          style={{
                            color: '#f43f5e',
                            marginTop: '10px',
                            fontWeight: 600,
                            textAlign: 'center',
                          }}
                        >
                          Too many requests. Please wait {retryAfter}s before trying again.
                        </p>
                      )}
                    </div>
                  </section>
                </div>
              </div>

              {/* Loading Skeleton & Determinate Progress Bar */}
              {loading && (
                <section className="my-4" aria-live="polite" aria-label="Analysis Progress">
                  <ProgressBar progress={analysisProgress} stageLabel={analysisStageLabel} />
                  <AnalysisSkeleton />
                </section>
              )}

              {/* Empty State / How It Works */}
              {score === null && !loading && (
                <section style={{ paddingBottom: '2rem' }} aria-label="About the Resume Analyzer">
                  <EmptyState />
                  <div className="mt-4">
                    <HowItWorks />
                  </div>
                </section>
              )}

              {/* Results Display Panel */}
              {score !== null && !loading && (
                <section aria-label="Analysis Results">
                  {analysisSource === 'sample' && (
                    <div
                      className="sample-notice-banner mb-4"
                      style={{ padding: '10px', wordBreak: 'break-word' }}
                    >
                      <span>
                        <Info size={15} /> Viewing Sample Resume Analysis
                      </span>
                      <span style={{ fontWeight: 'normal', fontSize: '13px', display: 'block' }}>
                        — This analysis is based on a bundled sample resume.
                      </span>
                    </div>
                  )}

                  <div id="ats-score">
                    <AtsScore score={score} />
                  </div>

                  <ResumePreview text={resumeText} skills={skills} />

                  <h5 className="analysis-done mt-3">
                    <CheckCircle size={18} /> Resume Analysis Complete
                  </h5>
                  {activeFileName && (
                    <p
                      style={{
                        fontSize: '13px',
                        opacity: 0.7,
                        marginTop: '-8px',
                        wordBreak: 'break-all',
                      }}
                    >
                      <FileText size={13} /> {activeFileName}
                    </p>
                  )}

                  {/* Skills Section */}
                  <section className="results-subcard mt-4 glass-card-premium results-enter" aria-labelledby="skills-found-heading">
                    <h4 id="skills-found-heading" style={{ textAlign: 'center', marginBottom: '16px' }}>Skills Found ({skills.length})</h4>
                    {skills.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No skills detected</p>}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        justifyContent: 'center',
                      }}
                    >
                      {(showAllSkills ? skills : skills.slice(0, 15)).map(
                        (skill: string, i: number) => (
                          <SkillChip key={i} skill={skill} type="detected" />
                        )
                      )}
                    </div>
                    {skills.length > 15 && (
                      <button
                        type="button"
                        className="app-btn app-btn--secondary"
                        style={{ marginTop: '16px', minHeight: '44px' }}
                        onClick={() => setShowAllSkills(!showAllSkills)}
                      >
                        {showAllSkills ? (
                          <>
                            <ChevronUp size={15} /> Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown size={15} /> Show More ({skills.length - 15} more)
                          </>
                        )}
                      </button>
                    )}
                  </section>

                  {/* Word Cloud */}
                  <SkillWordCloud skills={skills} />

                  {/* Skill Gap Matrix */}
                  <section
                    className="results-subcard mt-4 glass-card-premium results-enter"
                    style={{ animationDelay: '0.15s' }}
                    aria-labelledby="skill-gap-heading"
                  >
                    <h4
                      id="skill-gap-heading"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        textAlign: 'center',
                        gap: '6px',
                        marginBottom: '20px',
                      }}
                    >
                      <Target size={18} /> Skill Gap Matrix ({targetRole})
                      <InfoTooltip content="Shows which required skills are already in your resume and which important skills are missing." />
                    </h4>
                    <div
                      className="skill-gap-layout"
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '30px',
                        justifyContent: 'space-around',
                        marginTop: '12px',
                      }}
                    >
                      <div style={{ flex: '1 1 200px', minWidth: '200px', textAlign: 'center' }}>
                            <h6 style={{ color: '#10b981', fontSize: '1rem', fontWeight: '600', marginBottom: '12px' }}>Matched Skills</h6>
                        {matchedSkills.length === 0 ? (
                          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>None</p>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '6px',
                              justifyContent: 'center',
                            }}
                          >
                            {matchedSkills.map((s, i) => (
                              <SkillChip key={i} skill={s} type="matched" targetRole={targetRole} />
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ flex: '1 1 200px', minWidth: '200px', textAlign: 'center' }}>
                        <h6 style={{ color: '#f43f5e', fontSize: '1rem', fontWeight: '600', marginBottom: '12px' }}>Missing Skills</h6>
                        {missingSkills.length === 0 ? (
                          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>None</p>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '6px',
                              justifyContent: 'center',
                            }}
                          >
                            {missingSkills.map((s, i) => (
                              <SkillChip key={i} skill={s} type="missing" targetRole={targetRole} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Upgraded Suggestions Section */}
                  <section className="results-subcard mt-5 glass-card-premium results-enter" style={{ animationDelay: '0.3s' }}>
                    <div className="suggestion-box mt-4" style={{ padding: '15px' }}>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '10px',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '12px',
                        }}
                      >
                        <h4 id="suggestions-heading" style={{ margin: 0 }}>
                          💡 Suggestions
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                          {suggestions.length > 0 && (
                            <button
                              type="button"
                              className={`app-btn app-btn--accent${copied ? ' is-success' : ''}`}
                              onClick={copySuggestionsToClipboard}
                              style={{ minHeight: '44px', padding: '8px 16px', fontSize: '13px' }}
                            >
                              {copied ? '✅ Copied!' : '📋 Copy All'}
                            </button>
                          )}

                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <button
                              type="button"
                              className="app-btn app-btn--secondary"
                              onClick={() => setShowExportDropdown(!showExportDropdown)}
                              style={{ minHeight: '44px' }}
                            >
                              Export ▼
                            </button>
                            {showExportDropdown && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  right: 0,
                                  marginTop: '4px',
                                  backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                                  border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                                  borderRadius: '6px',
                                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                  zIndex: 10,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  minWidth: '120px',
                                  overflow: 'hidden',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={exportJSON}
                                  style={{
                                    padding: '8px 12px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: theme === 'dark' ? '#f3f4f6' : '#111827',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                                  }}
                                >
                                  Export JSON
                                </button>
                                <button
                                  type="button"
                                  onClick={exportCSV}
                                  style={{
                                    padding: '8px 12px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: theme === 'dark' ? '#f3f4f6' : '#111827',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Export CSV
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {suggestions.length === 0 ? (
                        <p
                          style={{
                            color: '#64748b',
                            fontStyle: 'italic',
                            fontSize: 'var(--font-size-sm)',
                            textAlign: 'left',
                            margin: '16px 0 0 0',
                          }}
                        >
                          No actionable layout suggestions generated for the current profile
                          structure matrix.
                        </p>
                      ) : (
                        <div className="suggestions-grid">
                          {suggestions.map((suggestion, index) => (
                            <SuggestionCard
                              key={index}
                              text={suggestion}
                              index={index}
                              backendUrl={backendUrl}
                            />
                          ))}
                        </div>
                      )}

                      <div style={{ marginTop: '24px', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="app-btn app-btn--secondary"
                          onClick={resetAnalysis}
                          style={{ minHeight: '44px', width: '100%', maxWidth: '250px' }}
                        >
                          <RefreshCw size={15} /> Start New Analysis
                        </button>
                      </div>
                    </div>
                  </section>
                </section>
              )}
            </main>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {/* Floating Back to Top Button */}
      <button
        type="button"
        className={`fab-btn back-to-top${showBackToTop ? ' back-to-top--visible' : ''}`}
        onClick={scrollToTop}
        aria-label="Back to top"
        title="Back to top"
      >
        ↑
      </button>

      <Footer />

      {/* Keyboard Shortcuts Help Button & Overlay */}
      <button
        className="fab-btn shortcut-help-trigger"
        onClick={() => setShowShortcutHelp(!showShortcutHelp)}
        title="Toggle Keyboard Shortcuts Help"
        aria-label="Toggle keyboard shortcuts help menu"
        aria-expanded={showShortcutHelp}
      >
        {showShortcutHelp ? <X size={20} /> : <HelpCircle size={20} />}
      </button>

      {showShortcutHelp && (
        <div className="shortcut-overlay-card">
          <h5
            style={{
              margin: '0 0 12px 0',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ⌨️ Keyboard Quick Actions
          </h5>
          <div className="shortcut-row">
            <span style={{ color: '#94a3b8' }}>Upload Resume</span>
            <span className="shortcut-key-badge">Alt + U</span>
          </div>
          <div className="shortcut-row">
            <span style={{ color: '#94a3b8' }}>Reset Analysis</span>
            <span className="shortcut-key-badge">Alt + R</span>
          </div>
          <div className="shortcut-row">
            <span style={{ color: '#94a3b8' }}>Close Modals / Sidebar</span>
            <span className="shortcut-key-badge">Esc</span>
          </div>
          <p
            style={{
              margin: '12px 0 0 0',
              fontSize: '11px',
              color: '#64748b',
              fontStyle: 'italic',
            }}
          >
            Press <kbd style={{ color: '#5eead4' }}>Esc</kbd> at any point to clear this helper
            overlay panel.
          </p>
        </div>
      )}

      {showUndoToast && (
        <UndoToast
          message="Analysis reset."
          durationSeconds={5}
          onUndo={handleUndoReset}
          onClose={() => {
            setShowUndoToast(false)
            setUndoState(null)
          }}
        />
      )}
    </>
  )
}

export default App
