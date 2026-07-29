import React, { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
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
import { TrackMatrix } from './components/TrackMatrix'
import { CoverLetterFeedbackPanel } from './components/CoverLetterFeedbackPanel'
import { SkillsLeaderboard } from './components/SkillsLeaderboard'
import { InterviewQuestionsPanel } from './components/InterviewQuestionsPanel'
import { ProfileModal } from './components/ProfileModal'
import { JdVisualizerPanel } from './components/JdVisualizerPanel'
import { ResetPasswordConfirmPage } from './components/ResetPasswordConfirmPage'
import type { TrackComparisons } from './components/TrackMatrix'
import {
  FileText,
  Loader2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Target,
  Info,

  Square,
} from "lucide-react";
import { Navbar } from "./components/Navbar";
import EmptyState from "./components/EmptyState";
import { StepProgress } from "./components/StepProgress";
import resultScreenshot from "./assets/screenshots/result.png";
import { OnboardingTour } from "./components/OnboardingTour";
import { HowItWorks } from "./components/HowItWorks";
import { CompareVersions } from "./components/CompareVersions/CompareVersions";
import { SkillChip } from "./components/SkillChip";

type Theme = "light" | "dark";

  HelpCircle,
  GitCompare,
  X,
} from 'lucide-react'
import { Navbar } from './components/Navbar'
import { TemplateGallery } from './components/TemplateGallery'
import EmptyState from './components/EmptyState'
import { CuratedTips } from './components/CuratedTips'
import { StepProgress } from './components/StepProgress'
import { OnboardingTour } from './components/OnboardingTour'
import { HowItWorks } from './components/HowItWorks'
import { CompareVersions } from './components/CompareVersions/CompareVersions'
import { CompareUploads } from './components/CompareVersions/CompareUploads'
import { SkillChip } from './components/SkillChip'
import {
  requestNotificationPermission,
  sendAnalysisCompleteNotification,
} from './utils/notification'
import { ProgressBar } from './components/ProgressBar/ProgressBar'
import { UndoToast } from './components/UndoToast/UndoToast'
import { FilePreview } from './components/FilePreview/FilePreview'
import { ShareResult } from './components/ShareResult'
import { SharedResultView } from './SharedResultView'
import CookieConsentBanner from './components/CookieConsentBanner'
import QuantifyNudges, { type QuantifyNudge } from './QuantifyNudges'
import AdminDashboard from './components/AdminDashboard'
import { ActionPlanChecklist } from './components/ActionPlanChecklist'
import {
  exportActionPlanMarkdown,
  exportActionPlanPdf,
  generateActionPlan,
} from './utils/actionPlanUtils'
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
  coverLetterText?: string
  coverLetterFeedback?: any
  interviewQuestions?: string[]
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

  text: string;
  index: number;
  isAddressed: boolean;
  onToggle: (index: number) => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ text, index, isAddressed, onToggle }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`suggestion-card ${isAddressed ? "suggestion-card--addressed" : ""}`}
      onClick={() => onToggle(index)}
      style={{
        cursor: "pointer",
        transition: "all 0.2s ease",
        opacity: isAddressed ? 0.65 : 1,
        borderLeft: isAddressed ? "4px solid #22c55e" : "4px solid #6366f1",
        background: isAddressed ? "rgba(34, 197, 94, 0.05)" : undefined,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
              {isAddressed ? (
                <CheckCircle size={18} color="#22c55e" />
              ) : (
                <Square size={18} color="#94a3b8" />
              )}
            </span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "700",
                color: isAddressed ? "#22c55e" : "#a5b4fc",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                textDecoration: isAddressed ? "line-through" : "none",
              }}
            >
              Recommendation #{index + 1}
            </span>
          </div>
          {isAddressed && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: "600",
                backgroundColor: "rgba(34, 197, 94, 0.15)",
                color: "#22c55e",
                padding: "2px 8px",
                borderRadius: "12px",
              }}
            >
              ✓ Addressed
            </span>
          )}

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

  const isQuantify = text.startsWith('QUANTIFY:')
  const displayText = isQuantify ? text.replace('QUANTIFY:', '').trim() : text

  return (
    <div className="suggestion-card" style={isQuantify ? { borderLeft: '4px solid #3b82f6' } : {}}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{ fontSize: '16px' }}>{isQuantify ? '📊' : '💡'}</span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: '700',
              color: isQuantify ? '#3b82f6' : 'var(--color-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {isQuantify ? 'Quantify Achievement' : `Recommendation #${index + 1}`}
          </span>

        </div>
        <p
          style={{
            margin: 0,

            fontSize: "var(--font-size-sm)",
            color: isAddressed ? "#94a3b8" : "#e2e8f0",
            lineHeight: "1.6",
            textDecoration: isAddressed ? "line-through" : "none",

            fontSize: 'var(--font-size-sm)',
            color: 'var(--body-text)',
            lineHeight: '1.6',

          }}
        >
          {displayText}
        </p>
      </div>


      <button
        onClick={handleCopy}
        className="suggestion-copy-btn"
        aria-label="Copy recommendation text"
        style={{ alignSelf: "flex-start" }}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid var(--surface-border)',
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
                  color: 'var(--muted-text)',
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
                  background: 'var(--surface-soft-bg)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  color: 'var(--body-text)',
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
                  background: 'var(--surface-soft-bg)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  color: 'var(--body-text)',
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
  const navigate = useNavigate()
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [useDefaultResume, setUseDefaultResume] = useState(false)
  const [defaultResumeName, setDefaultResumeName] = useState<string | null>(null)
  const [retryAfter, setRetryAfter] = useState<number | null>(null)
  const [retryDisabled, setRetryDisabled] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [quantifyNudges, setQuantifyNudges] = useState<QuantifyNudge[]>([])
  const [readabilityLabel, setReadabilityLabel] = useState<string | null>(null)
  const [undoState, setUndoState] = useState<UndoState | null>(null)
  const [showUndoToast, setShowUndoToast] = useState(false)

  // Interactive Checklist State
  const [addressedSuggestions, setAddressedSuggestions] = useState<number[]>([]);

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
  const [showGallery, setShowGallery] = useState(false)
  const [copied, setCopied] = useState(false)
  const [analysisSource, setAnalysisSource] = useState<'sample' | 'upload' | null>(null)
  const [shareId, setShareId] = useState<string | null>(null)
  const [jobDesc, setJobDesc] = useState('')
  const [resumeText, setResumeText] = useState<string>('')
  const [activeFileName, setActiveFileName] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareUploadsOpen, setCompareUploadsOpen] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState<number>(0)
  const [analysisStageLabel, setAnalysisStageLabel] = useState<string>('')
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file')
  const [trackComparisons, setTrackComparisons] = useState<TrackComparisons | null>(null)
  const [activeTab, setActiveTab] = useState<'detailed' | 'matrix' | 'cover_letter' | 'interview_questions'>('detailed')
  const [resumeUrl, setResumeUrl] = useState<string>('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Cover Letter States
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null)
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null)
  const [coverLetterText, setCoverLetterText] = useState<string>('')
  const [coverLetterFeedback, setCoverLetterFeedback] = useState<any>(null)

  // Interview Questions States
  const [interviewQuestions, setInterviewQuestions] = useState<string[]>([])

  // Standalone Job Description States
  const [activeFlow, setActiveFlow] = useState<'resume' | 'jd'>('resume')
  const [jdInputText, setJdInputText] = useState('')
  const [jdKeywords, setJdKeywords] = useState<any[]>([])
  const [jdLoading, setJdLoading] = useState(false)
  const [jdError, setJdError] = useState<string | null>(null)

  // History
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
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      const validTypes = ['.pdf', '.docx']
      const isValid = validTypes.some((ext) => droppedFile.name.toLowerCase().endsWith(ext))

      if (isValid) {
        setFile(droppedFile)
        setFileError(null)
      } else {
        setFileError('Only PDF and DOCX files are supported.')
      }
    }
  }

  let currentStep: 1 | 2 | 3 = 1
  if (loading) {
    currentStep = 2
  } else if (!loading && score !== null) {
    currentStep = 3
  }

  const { user, signup, login, logout, updateUserAvatar } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

  // Persistent localStorage key scoped to current session/file
  const storageKey = `addressed_suggestions_${activeFileName || 'default'}`;

  // Load addressed suggestions from localStorage when current resume changes
  useEffect(() => {
    if (activeFileName || suggestions.length > 0) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setAddressedSuggestions(JSON.parse(saved));
        } else {
          setAddressedSuggestions([]);
        }
      } catch {
        setAddressedSuggestions([]);
      }
    }
  }, [activeFileName, storageKey, suggestions.length]);

  // Sync state changes to localStorage
  const toggleSuggestion = (index: number) => {
    setAddressedSuggestions((prev) => {
      const updated = prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index];
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to persist addressed suggestions to localStorage", e);
      }
      return updated;
    });
  };

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
            cover_letter_text?: string
            cover_letter_feedback?: any
            interview_questions?: string[]
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
            coverLetterText: item.cover_letter_text,
            coverLetterFeedback: item.cover_letter_feedback,
            interviewQuestions: item.interview_questions,
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
    try {
      const savedName = localStorage.getItem('default_resume_name')
      if (savedName) {
        setDefaultResumeName(savedName)
      }
    } catch {
      /* ignore */
    }

    const params = new URLSearchParams(window.location.search)
    const urlRole = params.get('role')
    const urlJd = params.get('job_description')

    if (urlRole) {
      setTargetRole(urlRole)
    }
    if (urlJd) {
      setJobDesc(urlJd)
    }

    try {
      const savedName = localStorage.getItem('default_resume_name')
      if ((urlRole || urlJd) && savedName) {
        setUseDefaultResume(true)
      }
    } catch {
      /* ignore */
    }
  }, [])

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

    setFile(null);
    setScore(null);
    setSkills([]);
    setSuggestions([]);
    setAddressedSuggestions([]);
    setMatchedSkills([]);
    setMissingSkills([]);
    setResumeText("");
    setShowAllSkills(false);
    setCopied(false);
    setAnalysisSource(null);
    setActiveFileName("");
    setShowExportDropdown(false);
    setFileError(null);
    setRoleError(null);
  }, []);

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
        coverLetterText,
        coverLetterFeedback,
        interviewQuestions,
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
    setShareId(null)
    setActiveFileName('')
    setShowExportDropdown(false)
    setFileError(null)
    setRoleError(null)
    setCoverLetterFile(null)
    setCoverLetterError(null)
    setCoverLetterText('')
    setCoverLetterFeedback(null)
    setInterviewQuestions([])
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
    coverLetterText,
    coverLetterFeedback,
    interviewQuestions,
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
      setCoverLetterText(undoState.coverLetterText || '')
      setCoverLetterFeedback(undoState.coverLetterFeedback || null)
      setInterviewQuestions(undoState.interviewQuestions || [])
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

      setLoading(true);
      setAnalysisSource(source);
      setAddressedSuggestions([]);
      const formData = new FormData();
      formData.append("file", fileToAnalyze);
      formData.append("role", targetRole);
      formData.append("job_description", jobDesc);

      const headers = user ? { Authorization: `Bearer ${user.token}` } : {};
      const res = await axios.post(`${backendUrl}/api/upload/`, formData, { headers });

      setScore(res.data.score);
      setSkills(res.data.skills_found || []);
      setSuggestions(res.data.suggestions || []);
      setMatchedSkills(res.data.matched_skills || []);
      setMissingSkills(res.data.missing_skills || []);
      setResumeText(res.data.resume_text || "");
      setActiveFileName(fileToAnalyze.name);

      setLoading(false);

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
      if (coverLetterFile) {
        formData.append('cover_letter', coverLetterFile)
      }

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
      setQuantifyNudges(res.data.quantify_nudges || [])
      setMatchedSkills(res.data.matched_skills || [])
      setMissingSkills(res.data.missing_skills || [])
      setResumeText(res.data.resume_text || '')
      setCoverLetterText(res.data.cover_letter_text || '')
      setCoverLetterFeedback(res.data.cover_letter_feedback || null)
      setInterviewQuestions(res.data.interview_questions || [])

      setReadabilityLabel(res.data.readability_label ?? null)
      if (res.data.share_id) setShareId(res.data.share_id)
      setTrackComparisons(res.data.track_comparisons || null)
      setActiveTab('detailed')
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
          coverLetterText: res.data.cover_letter_text,
          coverLetterFeedback: res.data.cover_letter_feedback,
          interviewQuestions: res.data.interview_questions,
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
        if (
          axios.isAxiosError(error) &&
          error.response?.status === 400 &&
          uploadMode === 'url' &&
          source === 'upload'
        ) {
          setUrlError(errorMsg)
        } else {
          alert(
            source === 'sample'
              ? `Sample analysis failed: ${errorMsg}`
              : `Upload failed: ${errorMsg}`
          )
        }
      }

      setLoading(false)
    }
  }

  const runJdAnalysis = async () => {
    if (!jdInputText || !jdInputText.trim()) {
      setJdError('Job description cannot be empty.')
      return
    }
    setJdLoading(true)
    setJdError(null)
    setJdKeywords([])
    try {
      const res = await axios.post(`${backendUrl}/api/analyze-jd/`, {
        job_description: jdInputText,
      })
      setJdKeywords(res.data.keywords || [])
    } catch (err: any) {
      console.error(err)
      setJdError(err.response?.data?.error || 'Failed to analyze job description.')
    } finally {
      setJdLoading(false)
    }
  }

  const saveAsDefaultResume = (fileToSave: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        localStorage.setItem('default_resume_base64', reader.result as string)
        localStorage.setItem('default_resume_name', fileToSave.name)
        localStorage.setItem('default_resume_type', fileToSave.type)
        setDefaultResumeName(fileToSave.name)
        alert(`Successfully set "${fileToSave.name}" as your default resume!`)
      } catch (err) {
        alert('Failed to save default resume to local storage.')
      }
    }
    reader.readAsDataURL(fileToSave)
  }

  const uploadResume = async () => {
    let hasError = false

    if (!targetRole || targetRole.trim() === '') {
      setRoleError('Target career track is required.')
      hasError = true
    } else {
      setRoleError(null)
    }

    let fileToAnalyze: File | null = file

    if (uploadMode === 'file') {
      if (useDefaultResume) {
        try {
          const b64 = localStorage.getItem('default_resume_base64')
          const name = localStorage.getItem('default_resume_name')
          const type = localStorage.getItem('default_resume_type')
          if (b64 && name && type) {
            const byteString = atob(b64.split(',')[1])
            const ab = new ArrayBuffer(byteString.length)
            const ia = new Uint8Array(ab)
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i)
            }
            fileToAnalyze = new File([ab], name, { type })
            setFileError(null)
          } else {
            setFileError('No default resume is currently saved.')
            hasError = true
          }
        } catch {
          setFileError('Failed to load the default resume. Please upload manually.')
          hasError = true
        }
      } else if (!file) {
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
        try {
          new URL(resumeUrl.trim())
          setUrlError(null)
        } catch {
          setUrlError('Please enter a valid URL.')
          hasError = true
        }
      }
    }

    if (hasError) return

    await requestNotificationPermission()
    if (uploadMode === 'file') {
      await runAnalysis(fileToAnalyze, 'upload')
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
    setCoverLetterText(entry.coverLetterText || '')
    setCoverLetterFeedback(entry.coverLetterFeedback || null)
    setInterviewQuestions(entry.interviewQuestions || [])
    setShowAllSkills(false)
    setCopied(false)
    setHistoryOpen(false)
    setShowExportDropdown(false)
  }

  const handleLogout = () => {
    logout()
    clearHistory()
  }

  const completionPercentage = suggestions.length
    ? Math.round((addressedSuggestions.length / suggestions.length) * 100)
    : 0;

  return (
    <>
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
      />

      {compareOpen && (
        <CompareVersions
          entries={entries}
          token={user?.token}
          onClose={() => setCompareOpen(false)}
        />
      )}

      {compareUploadsOpen && (
        <CompareUploads
          targetRole={targetRole}
          jobDesc={jobDesc}
          onClose={() => setCompareUploadsOpen(false)}
        />
      )}

      <Navbar
        theme={theme}
        toggleTheme={toggleTheme}
        user={user}
        onLogin={() => setShowAuthModal(true)}
        onLogout={handleLogout}

      />
      <Routes>
        <Route path="/leaderboard" element={<SkillsLeaderboard onBack={() => navigate('/')} />} />
        <Route path="/admin" element={<AdminDashboard user={user} />} />
        <Route path="/shared/:shareId" element={<SharedResultView />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPasswordConfirmPage />} />
        <Route
          path="/"
          element={
            <main id="main-content" className="landing-page">
              {showAuthModal && (
                <AuthModal
                  onSignup={signup}
                  onLogin={login}
                  onClose={() => setShowAuthModal(false)}
                />
              )}

              {showProfileModal && user && (
                <ProfileModal
                  user={user}
                  onClose={() => setShowProfileModal(false)}
                  onAvatarUpdated={updateUserAvatar}
                />
              )}

              <div className={score === null && !loading ? 'hero-container' : ''}>
                <div className={score === null && !loading ? 'hero-left' : ''}>
                  {score === null && !loading && (
                    <section className="hero-intro" aria-label="Introduction">
                      <span className="hero-badge">⭐ AI Powered Resume Optimization</span>

                      <h1
                        className="app-main-title"
                        style={{
                          fontSize: 'clamp(2.8rem, 6vw, 4.8rem)',
                          lineHeight: '1.1',
                          fontWeight: 800,
                          marginTop: '18px',
                          marginBottom: '24px',
                        }}
                      >
                        Beat ATS Filters.
                        <br />
                        Land More Interviews.
                      </h1>

                      <div
                        style={{
                          display: 'flex',
                          gap: '12px',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                        className="mb-3"
                      >
                        <button className="analyze-btn" onClick={uploadResume} disabled={loading}>
                          {loading && analysisSource === 'upload'
                            ? '⏳ Extracting and analyzing resume text...'
                            : '🚀 Analyze Resume'}
                        </button>
                        <button
                          className="app-btn"
                          onClick={() => setShowGallery(true)}
                          title="Browse ATS-friendly resume templates"
                        >
                          📂 Template Gallery
                        </button>
                        <button
                          className="app-btn app-btn--secondary"
                          onClick={() => setCompareUploadsOpen(true)}
                        >
                          <GitCompare size={15} /> Compare 2 Resumes
                        </button>
                        <button
                          className="app-btn app-btn--secondary"
                          onClick={handleSampleResume}
                          disabled={loading}
                        >
                          {' '}
                          {loading && analysisSource === 'sample'
                            ? '⏳ Loading Sample...'
                            : 'Try Sample Resume'}
                        </button>
                      </div>
                      {showGallery && (
                        <div
                          className="mt-4"
                          style={{
                            textAlign: 'left',
                            background: 'var(--card-bg, #fff)',
                            padding: '20px',
                            borderRadius: '8px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '16px',
                            }}
                          >
                            <h3 style={{ margin: 0 }}>ATS Resume Templates</h3>
                            <button
                              onClick={() => setShowGallery(false)}
                              style={{
                                cursor: 'pointer',
                                background: 'transparent',
                                border: 'none',
                                fontSize: '16px',
                              }}
                            >
                              ❌
                            </button>
                          </div>
                          <TemplateGallery />
                        </div>
                      )}
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

                      <div
                        className="hero-stats"
                        style={{ color: theme === 'light' ? '#000000' : '#ffffff' }}
                      >
                        <div>
                          <h2>50K+</h2>
                          <span>Resumes Reviewed</span>
                        </div>

                        <div>
                          <h2>95%</h2>
                          <span>ATS Accuracy</span>
                        </div>

                        <div>
                          <h2>24/7</h2>
                          <span>AI Available</span>
                        </div>
                      </div>
                    </section>
                  )}

                  {(loading || score !== null) && <StepProgress currentStep={currentStep} />}

                  <section className="analyzer-form-section" aria-label="Resume Analyzer Form">
                    {/* Active Flow Switcher Tabs */}
                    {score === null && !loading && (
                      <div
                        style={{
                          display: 'flex',
                          gap: '12px',
                          justifyContent: 'center',
                          marginBottom: '24px',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                          paddingBottom: '12px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveFlow('resume')
                            setJdKeywords([])
                          }}
                          style={{
                            padding: '8px 20px',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            background:
                              activeFlow === 'resume'
                                ? 'var(--color-primary, #6366f1)'
                                : 'rgba(255, 255, 255, 0.05)',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          📄 Optimize Resume
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveFlow('jd')
                          }}
                          style={{
                            padding: '8px 20px',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            background:
                              activeFlow === 'jd'
                                ? 'var(--color-primary, #6366f1)'
                                : 'rgba(255, 255, 255, 0.05)',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          💼 Analyze Job Description
                        </button>
                      </div>
                    )}

                    {activeFlow === 'jd' && jdKeywords.length > 0 ? (
                      <JdVisualizerPanel
                        keywords={jdKeywords}
                        onBack={() => {
                          setJdKeywords([])
                          setJdInputText('')
                        }}
                      />
                    ) : activeFlow === 'jd' ? (
                      <div className="animate-fade-in">
                        <div
                          className="mb-4 p-4"
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid rgba(255,255,255,0.04)',
                            textAlign: 'left'
                          }}
                        >
                          <label
                            htmlFor="jdTextInput"
                            style={{
                              color: theme === 'light' ? '#000000' : '#ffffff',
                              display: 'block',
                              marginBottom: '12px',
                              fontWeight: '600',
                              fontSize: 'var(--font-size-sm)',
                            }}
                          >
                            📝 Paste the Job Description to extract and visualize key terms:
                          </label>
                          <textarea
                            id="jdTextInput"
                            rows={8}
                            value={jdInputText}
                            onChange={(e) => {
                              setJdInputText(e.target.value)
                              if (e.target.value.trim() !== '') setJdError(null)
                            }}
                            placeholder="Paste job description here..."
                            style={{
                              width: '100%',
                              padding: '12px',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              background: 'rgba(0,0,0,0.2)',
                              color: '#fff',
                              outline: 'none',
                              fontSize: '0.92rem',
                              lineHeight: '1.5',
                              resize: 'vertical'
                            }}
                          />
                          {jdError && (
                            <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px', fontWeight: '500' }}>
                              ⚠️ {jdError}
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                            <button
                              type="button"
                              className="analyze-btn"
                              onClick={runJdAnalysis}
                              disabled={jdLoading}
                              style={{ width: 'auto', minWidth: '200px' }}
                            >
                              {jdLoading ? '⏳ Analyzing Keywords...' : '🔍 Analyze JD Keywords'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* STEP 1: Target Career Track */}
                    <div
                      className="mb-4 p-4 role-selector-container"
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      <label
                        htmlFor="roleSelect"
                        style={{
                          color: theme === 'light' ? '#000000' : '#ffffff',
                          display: 'block',
                          marginBottom: '12px',
                          fontWeight: '600',
                          textAlign: 'center',
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
                            color: '#ef4444',
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
                              uploadMode === 'file' ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
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
                              uploadMode === 'file' ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          🔗 Import via Link
                        </button>
                      </div>

                      {uploadMode === 'file' ? (
                        <>
                          <div
                          className={`upload-box mb-3 ${isDragging ? 'dragging' : ''}`}
                          style={{ width: '100%', maxWidth: '100%' }}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                        >
                          <input
                            type="file"
                            id="fileUpload"
                            hidden
                            accept=".pdf,.docx"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              if (e.target.files && e.target.files[0]) {
                                const selectedFile = e.target.files[0]
                                const validTypes = ['.pdf', '.docx']
                                const isValid = validTypes.some((ext) =>
                                  selectedFile.name.toLowerCase().endsWith(ext)
                                )

                                if (isValid) {
                                  setFile(selectedFile)
                                  setFileError(null)
                                } else {
                                  setFileError('Only PDF and DOCX files are supported.')
                                }
                              }
                            }}
                          />
                          <label htmlFor="fileUpload" className="upload-label">
                            <div className="upload-icon-wrapper" aria-hidden="true">
                              {file ? (
                                <svg
                                  width="28"
                                  height="28"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                  <polyline points="14 2 14 8 20 8" />
                                  <path d="M9 15l2 2 4-4" />
                                </svg>
                              ) : (
                                <svg
                                  width="28"
                                  height="28"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="17 8 12 3 7 8" />
                                  <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                              )}
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              {useDefaultResume && defaultResumeName ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '1.5rem' }}>✅</span>
                                  <strong className="upload-file-name" style={{ color: '#4ade80' }}>
                                    Default Resume Pre-loaded: {defaultResumeName}
                                  </strong>
                                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                    (Uncheck the default option below to upload another file)
                                  </span>
                                </div>
                              ) : file ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                  <strong className="upload-file-name">{file.name}</strong>
                                  {defaultResumeName !== file.name && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        saveAsDefaultResume(file)
                                      }}
                                      style={{
                                        padding: '4px 10px',
                                        fontSize: '0.78rem',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--color-primary)',
                                        background: 'rgba(99, 102, 241, 0.1)',
                                        color: '#a5b4fc',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                      }}
                                    >
                                      💾 Save as Default
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <span className="upload-text-primary">
                                    Drag &amp; Drop Resume or{' '}
                                    <span className="upload-text-browse">Click to Browse</span>
                                  </span>
                                  <span className="upload-text-secondary">
                                    Supports PDF, DOCX, TXT up to 10MB
                                  </span>
                                </>
                              )}
                            </div>
                          </label>
                        </div>

                        {defaultResumeName && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              marginTop: '-8px',
                              marginBottom: '16px',
                              background: 'rgba(99, 102, 241, 0.05)',
                              border: '1px solid rgba(99, 102, 241, 0.2)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 14px'
                            }}
                          >
                            <input
                              type="checkbox"
                              id="useDefaultResume"
                              checked={useDefaultResume}
                              onChange={(e) => {
                                setUseDefaultResume(e.target.checked)
                                if (e.target.checked) {
                                  setFile(null)
                                  setFileError(null)
                                }
                              }}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <label
                              htmlFor="useDefaultResume"
                              style={{
                                color: '#e2e8f0',
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                fontWeight: '500',
                                userSelect: 'none'
                              }}
                            >
                              📂 Use saved default resume: <span style={{ color: '#a5b4fc', fontWeight: '600' }}>{defaultResumeName}</span>
                            </label>
                          </div>
                        )}
                        </>
                      ) : (
                        <div className="mb-3" style={{ textAlign: 'left' }}>
                          <label
                            htmlFor="resumeUrlInput"
                            style={{
                              fontWeight: '600',
                              display: 'block',
                              marginBottom: '8px',
                              color: '#e2e8f0',
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
                              background: 'rgba(255, 255, 255, 0.04)',
                              color: '#fff',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              fontSize: '0.9rem',
                            }}
                          />
                          <span
                            style={{
                              fontSize: '0.78rem',
                              color: 'rgba(255,255,255,0.6)',
                              marginTop: '6px',
                              display: 'block',
                            }}
                          >
                            ℹ️ Note: Make sure link permissions are set to "Anyone with the link can
                            view".
                          </span>
                        </div>
                      )}
                      {file && uploadMode === 'file' && (
                        <div className="mb-3">
                          <FilePreview file={file} />
                        </div>
                      )}
                      {fileError && uploadMode === 'file' && (
                        <div
                          style={{
                            color: '#ef4444',
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
                            color: '#ef4444',
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

                      {/* Optional Cover Letter Upload Slot */}
                      <div className="mb-4" style={{ textAlign: 'left' }}>
                        <label
                          htmlFor="coverLetterUpload"
                          style={{
                            fontWeight: '600',
                            display: 'block',
                            marginBottom: '8px',
                            color: '#e2e8f0',
                            fontSize: '0.85rem',
                          }}
                        >
                          ✉️ Cover Letter (Optional)
                        </label>
                        <div
                          className="cover-letter-upload-container"
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px dashed rgba(255, 255, 255, 0.1)',
                            borderRadius: 'var(--radius-md)',
                            padding: '12px 16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            transition: 'all 0.2s',
                          }}
                        >
                          <input
                            type="file"
                            id="coverLetterUpload"
                            hidden
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              if (e.target.files && e.target.files[0]) {
                                const clFile = e.target.files[0]
                                const validTypes = ['.pdf', '.docx', '.txt']
                                const isValid = validTypes.some(ext => clFile.name.toLowerCase().endsWith(ext))
                                if (isValid) {
                                  setCoverLetterFile(clFile)
                                  setCoverLetterError(null)
                                } else {
                                  setCoverLetterError('Only PDF, DOCX, and TXT files are supported.')
                                }
                              }
                            }}
                          />
                          <label
                            htmlFor="coverLetterUpload"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              cursor: 'pointer',
                              flex: 1,
                              margin: 0,
                            }}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                              <polyline points="22,6 12,13 2,6"/>
                            </svg>
                            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', userSelect: 'none' }}>
                              {coverLetterFile ? coverLetterFile.name : 'Upload optional Cover Letter (PDF, DOCX, TXT)'}
                            </span>
                          </label>
                          {coverLetterFile && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                setCoverLetterFile(null)
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'inline-flex',
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          )}
                        </div>
                        {coverLetterError && (
                          <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '6px', fontWeight: '500' }}>
                            ⚠️ {coverLetterError}
                          </div>
                        )}
                      </div>

                      {/* Optional Job Description */}
                      <div className="mb-4" style={{ textAlign: 'left' }}>
                        <label
                          htmlFor="jobDescription"
                          style={{
                            color: 'var(--text-primary)',
                            fontWeight: '600',
                            display: 'block',
                            marginBottom: '8px',
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
                            background: 'rgba(255, 255, 255, 0.02)',
                            color: 'inherit',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        />
                        <div
                          style={{
                            textAlign: 'right',
                            color: isOver ? '#ef4444' : isClose ? '#f97316' : 'inherit',
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
                            color: '#ef4444',
                            marginTop: '10px',
                            fontWeight: 600,
                            textAlign: 'center',
                          }}
                        >
                          Too many requests. Please wait {retryAfter}s before trying again.
                        </p>
                      )}
                    </div>
                  </>
                )}
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
                    <AtsScore
                      score={score}

                      readabilityLabel={readabilityLabel}
                    />
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

                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      marginTop: '16px',
                      marginBottom: '16px',
                      justifyContent: 'center',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveTab('detailed')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        background:
                          activeTab === 'detailed'
                            ? 'var(--color-primary, #6366f1)'
                            : 'rgba(255, 255, 255, 0.05)',
                        color: '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      Detailed View
                    </button>
                    {trackComparisons && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('matrix')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          background:
                            activeTab === 'matrix'
                              ? 'var(--color-primary, #6366f1)'
                              : 'rgba(255, 255, 255, 0.05)',
                          color: '#fff',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        Compare All Tracks
                      </button>
                    )}
                    {coverLetterFeedback && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('cover_letter')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          background: activeTab === 'cover_letter' ? 'var(--color-primary, #6366f1)' : 'rgba(255, 255, 255, 0.05)',
                          color: '#fff',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        ✉️ Cover Letter
                      </button>
                    )}
                    {interviewQuestions && interviewQuestions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('interview_questions')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          background: activeTab === 'interview_questions' ? 'var(--color-primary, #6366f1)' : 'rgba(255, 255, 255, 0.05)',
                          color: '#fff',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        💬 Interview Prep
                      </button>
                    )}
                  </div>

                  {activeTab === 'matrix' && trackComparisons ? (
                    <TrackMatrix
                      trackComparisons={trackComparisons}
                      activeRole={targetRole}
                      onRowClick={(role) => {
                        setTargetRole(role)
                        const comp = trackComparisons[role]
                        setScore(comp.score)
                        setMatchedSkills(comp.matched_skills)
                        setMissingSkills(comp.missing_skills)
                        setSuggestions(comp.suggestions)
                        setActiveTab('detailed')
                      }}
                    />
                  ) : activeTab === 'cover_letter' && coverLetterFeedback ? (
                    <CoverLetterFeedbackPanel feedback={coverLetterFeedback} />
                  ) : activeTab === 'interview_questions' && interviewQuestions && interviewQuestions.length > 0 ? (
                    <InterviewQuestionsPanel questions={interviewQuestions} />
                  ) : (
                    <>
                      {/* Skills Section */}

                  <section className="mt-4" aria-labelledby="skills-found-heading">
                    <h4 id="skills-found-heading">Skills Found ({skills.length})</h4>
                    {skills.length === 0 && <p>No skills detected</p>}
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


              {/* Upgraded Interactive Suggestions Checklist Section */}
              <div
                className="mt-5 p-4"
                style={{
                  background: "rgba(30, 30, 47, 0.4)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid rgba(255, 255, 255, 0.04)",
                }}
              >
                <div className="suggestion-box mt-4" style={{ padding: "15px" }}>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                      💡 Actionable Recommendations
                    </h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                      {suggestions.length > 0 && (
                        <button
                          type="button"
                          className={`app-btn app-btn--accent${copied ? " is-success" : ""}`}
                          onClick={copySuggestionsToClipboard}
                          style={{ minHeight: "44px", padding: "8px 16px", fontSize: "13px" }}
                        >
                          {copied ? "✅ Copied!" : "📋 Copy All"}
                        </button>
                      )}

                  {/* Word Cloud */}
                  <SkillWordCloud skills={skills} />


                  {/* Skill Gap Matrix */}
                  <section
                    className="mt-4 p-3"
                    style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}
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
                        gap: '20px',
                        justifyContent: 'space-around',
                        marginTop: '12px',
                      }}
                    >
                      <div style={{ flex: '1 1 140px', minWidth: '140px' }}>
                        <h6 style={{ color: '#22c55e' }}>Matched Skills</h6>
                        {matchedSkills.length === 0 ? (
                          <p style={{ fontSize: '12px' }}>None</p>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '4px',
                              justifyContent: 'center',
                            }}

                      <section className="mt-4" aria-labelledby="skills-found-heading">
                        <h4 id="skills-found-heading">Skills Found ({skills.length})</h4>
                        {skills.length === 0 && <p>No skills detected</p>}
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
                        className="mt-4 p-3"
                        style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}
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
                            gap: '20px',
                            justifyContent: 'space-around',
                            marginTop: '12px',
                          }}
                        >
                          <div style={{ flex: '1 1 140px', minWidth: '140px' }}>
                            <h6 style={{ color: '#22c55e' }}>Matched Skills</h6>
                            {matchedSkills.length === 0 ? (
                              <p style={{ fontSize: '12px' }}>None</p>
                            ) : (
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '4px',
                                  justifyContent: 'center',
                                }}
                              >
                                {matchedSkills.map((s, i) => (
                                  <SkillChip
                                    key={i}
                                    skill={s}
                                    type="matched"
                                    targetRole={targetRole}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </section>

                      {/* Upgraded Suggestions Section */}
                      <section
                        className="mt-5 p-4"
                        style={{
                          background: 'rgba(30, 30, 47, 0.4)',
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid rgba(255, 255, 255, 0.04)',
                        }}
                      >
                        {shareId && <ShareResult shareId={shareId} />}

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
                                  style={{
                                    minHeight: '44px',
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                  }}
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
                                      backgroundColor: 'var(--card-bg)',
                                      border: '1px solid var(--surface-border)',
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
                                        color: 'var(--body-text)',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid var(--surface-border)',
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
                                        color: 'var(--body-text)',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid var(--surface-border)',
                                      }}
                                    >
                                      Export CSV
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const plan = generateActionPlan({
                                          score: score || 0,
                                          targetRole,
                                          suggestions,
                                          missingSkills,
                                          readabilityLabel,
                                          coverLetterFeedback,
                                          fileName: activeFileName,
                                        })
                                        exportActionPlanMarkdown(plan)
                                        setShowExportDropdown(false)
                                      }}
                                      style={{
                                        padding: '8px 12px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--body-text)',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid var(--surface-border)',
                                      }}
                                    >
                                      Action Plan (.md)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const plan = generateActionPlan({
                                          score: score || 0,
                                          targetRole,
                                          suggestions,
                                          missingSkills,
                                          readabilityLabel,
                                          coverLetterFeedback,
                                          fileName: activeFileName,
                                        })
                                        exportActionPlanPdf(plan)
                                        setShowExportDropdown(false)
                                      }}
                                      style={{
                                        padding: '8px 12px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--body-text)',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Action Plan (.pdf)
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>


                  {/* Checklist Progress Bar Header */}
                  {suggestions.length > 0 && (
                    <div
                      style={{
                        marginBottom: "16px",
                        padding: "12px",
                        background: "rgba(255, 255, 255, 0.03)",
                        borderRadius: "8px",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#e2e8f0",
                          marginBottom: "8px",
                        }}
                      >
                        <span>Interactive Checklist Progress</span>
                        <span style={{ color: completionPercentage === 100 ? "#22c55e" : "#a5b4fc" }}>
                          {addressedSuggestions.length} of {suggestions.length} addressed ({completionPercentage}%)
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: "6px",
                          backgroundColor: "rgba(255, 255, 255, 0.1)",
                          borderRadius: "3px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${completionPercentage}%`,
                            height: "100%",
                            backgroundColor: completionPercentage === 100 ? "#22c55e" : "#6366f1",
                            transition: "width 0.3s ease-in-out, background-color 0.3s ease",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {suggestions.length === 0 ? (
                    <p
                      style={{
                        color: "#64748b",
                        fontStyle: "italic",
                        fontSize: "var(--font-size-sm)",
                        textAlign: "left",
                        margin: "16px 0 0 0",
                      }}
                    >
                      No actionable layout suggestions generated for the current profile structure matrix.
                    </p>
                  ) : (
                    <div className="suggestions-grid">
                      {suggestions.map((suggestion, index) => (
                        <SuggestionCard
                          key={index}
                          text={suggestion}
                          index={index}
                          isAddressed={addressedSuggestions.includes(index)}
                          onToggle={toggleSuggestion}
                        />
                      ))}
                    </div>
                  )}

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


                      <CuratedTips targetRole={targetRole} />

                          <QuantifyNudges nudges={quantifyNudges} />
                          <CuratedTips targetRole={targetRole} />

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
                    </>
                  )}
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
      <CookieConsentBanner />

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
            Press <kbd style={{ color: '#a5b4fc' }}>Esc</kbd> at any point to clear this helper
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
