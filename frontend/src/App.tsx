
import React, { useState, useEffect, useCallback } from "react";

import { useState, useEffect, useCallback } from "react";

import axios from "axios";
import "./index.css";
import { AtsScore } from "./AtsScore";
import { useAnalysisHistory, type AnalysisEntry } from "./hooks/useAnalysisHistory";
import { HistorySidebar } from "./HistorySidebar";
import { useAuth } from "./hooks/useAuth";
import { AuthModal } from "./AuthModal";
import { Footer } from "./Footer";
import { ActionPlanChecklist } from './components/ActionPlanChecklist'

import AnalysisSkeleton from "./components/AnalysisSkeleton/AnalysisSkeleton";
import { InfoTooltip } from "./components/InfoTooltip";
import { SkillWordCloud } from "./components/SkillWordCloud";
import { useTheme } from "./hooks/useTheme";
import { useAddressedSuggestions } from "./hooks/useAddressedSuggestions";
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


type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
  } catch {
    // localStorage / matchMedia can throw in restricted privacy modes
  }
  return "light";

}

function highlightSkills(text: string, skills: string[]): React.ReactNode[] {
  if (!text) return [];
  if (skills.length === 0) return [text];

  // Sort longest first so multi-word skills (e.g. "machine learning") match before shorter ones
  const sorted = [...skills].sort((a, b) => b.length - a.length);
  const escaped = sorted.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // \b works for alphanumeric boundaries; for symbols like c++ we use lookahead/lookbehind
  const pattern = new RegExp(`(?<![\\w])(${escaped.join('|')})(?![\\w])`, 'gi');
  const parts = text.split(pattern);
  const skillSet = new Set(skills.map(s => s.toLowerCase()));

  return parts.map((part, i) =>
    skillSet.has(part.toLowerCase())
      ? <mark key={i} className="skill-highlight">{part}</mark>
      : part
  );
}

function ResumePreview({ text, skills }: { text: string; skills: string[] }) {
  if (!text) return null;
  return (
    <div className="resume-preview mt-4">

      <h4>
        <FileText size={16} /> Resume Text Preview
      </h4>
      <pre className="resume-preview__body">{highlightSkills(text, skills)}</pre>
    </div>
  )
}

function App() {
  const { theme, toggleTheme } = useTheme();

      <h4>📄 Resume Text Preview</h4>
      <pre className="resume-preview__body">
        {highlightSkills(text, skills)}
      </pre>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);


  // Validation States
  const [fileError, setFileError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);


  // Component States

  const [targetRole, setTargetRole] = useState("Frontend Developer");
  const [matchedSkills, setMatchedSkills] = useState<string[]>([]);
  const [missingSkills, setMissingSkills] = useState<string[]>([]);
  const [showAllSkills, setShowAllSkills] = useState(false);

  const [analysisSource, setAnalysisSource] = useState<"sample" | "upload" | null>(null);
  const [jobDesc, setJobDesc] = useState("");
  const [resumeText, setResumeText] = useState<string>("");
  const [activeFileName, setActiveFileName] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  // Custom Hook for Interactive Checklist Suggestions
  const { addressedSuggestions, setAddressedSuggestions, toggleSuggestion } =
    useAddressedSuggestions(activeFileName, suggestions.length);

  let currentStep: 1 | 2 | 3 = 1;
  if (loading) {
    currentStep = 2;
  } else if (!loading && score !== null) {
    currentStep = 3;
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

  // Reset analysis helper
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
    setAnalysisSource(null);
    setActiveFileName("");
    setFileError(null);
    setRoleError(null);
  }, [setAddressedSuggestions]);

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

  const [copied, setCopied] = useState(false);
  const [analysisSource, setAnalysisSource] = useState<"sample" | "upload" | null>(null);
  const [resumeText, setResumeText] = useState<string>("");

  // Retry state
  const [retryCount, setRetryCount] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Auth
  const { user, signup, login, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // History
  const { entries, deleteEntry, clearHistory, setEntries } = useAnalysisHistory();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeFileName, setActiveFileName] = useState("");

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

  const fetchDbHistory = useCallback(async (token: string) => {
    try {
      const res = await axios.get(`${backendUrl}/api/history/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dbEntries: AnalysisEntry[] = res.data.map((item: {
        id: number; file_name: string; score: number; skills_found: string[];
        suggestions: string[]; matched_skills: string[]; missing_skills: string[];
        target_role: string; created_at: string;
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
      }));
      setEntries(dbEntries);
    } catch { /* silently ignore */ }
  }, [backendUrl, setEntries]);

  useEffect(() => {
    if (user) fetchDbHistory(user.token);
  }, [user, fetchDbHistory]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // persistence is best-effort; ignore if storage is unavailable
    }
  }, [theme]);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);

    }
  }, [cooldownRemaining]);


  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const getRetryDelay = (attemptNumber: number): number => {
    // Exponential backoff: 2^attemptNumber seconds, capped at 30 seconds
    const delay = Math.pow(2, attemptNumber);
    return Math.min(delay, 30);
  };



  const runAnalysis = async (fileToAnalyze: File, source: "sample" | "upload") => {
    try {
      setLoading(true);
      setAnalysisSource(source);
      const formData = new FormData();
      formData.append("file", fileToAnalyze);
      formData.append("role", targetRole);

      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
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

      // Reset retry state on success
      setRetryCount(0);
      setCooldownRemaining(0);

      if (user) {
        await fetchDbHistory(user.token);
      }
    } catch (error: unknown) {
      console.error(error);

      let errorMsg = "Unknown error";

      if (axios.isAxiosError(error)) {
        errorMsg =
          error.response?.data?.error ??
          error.message;
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }

      alert(
        source === "sample"
          ? `Sample analysis failed: ${errorMsg}`
          : `Upload failed: ${errorMsg}`
      );

      setLoading(false);

      // Increment retry count and set cooldown
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      setCooldownRemaining(getRetryDelay(newRetryCount));
    }
  };

  const uploadResume = async () => {
    if (!file) {
      alert("Please upload resume");
      return;
    }
    if (cooldownRemaining > 0) {
      return; // Prevent retry during cooldown
    }
    await runAnalysis(file, "upload");
  };

  const handleSampleResume = async () => {
    if (cooldownRemaining > 0) {
      return; // Prevent retry during cooldown
    }

    try {
      setLoading(true);
      setAnalysisSource("sample");

      const response = await fetch("/sample-resume.pdf");

      if (!response.ok) {
        throw new Error("Failed to load sample resume PDF");
      }

      const blob = await response.blob();

      const sampleFile = new File(
        [blob],
        "sample-resume.pdf",
        { type: "application/pdf" }
      );

      await runAnalysis(sampleFile, "sample");

      setActiveFileName(sampleFile.name);
    } catch (error: unknown) {
      console.error(error);
      alert("Could not load sample resume");
      setLoading(false);
    }
  };

  const resetAnalysis = () => {
    setFile(null);
    setScore(null);
    setSkills([]);
    setSuggestions([]);
    setMatchedSkills([]);
    setMissingSkills([]);
    setResumeText("");
    setShowAllSkills(false);
    setCopied(false);
    setAnalysisSource(null);
    setActiveFileName("");
    setRetryCount(0);
    setCooldownRemaining(0);
  };

  const copySuggestionsToClipboard = () => {
    if (suggestions.length === 0) return;
    const plainTextSuggestions = suggestions.map((s: string) => `• ${s}`).join("\n");
    navigator.clipboard.writeText(plainTextSuggestions)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => console.error("Failed to copy text: ", err));
  };

  const selectHistoryEntry = (entry: AnalysisEntry) => {
    setScore(entry.score);
    setSkills(entry.skills);
    setSuggestions(entry.suggestions);
    setMatchedSkills(entry.matchedSkills);
    setMissingSkills(entry.missingSkills);
    setTargetRole(entry.targetRole);
    setActiveFileName(entry.fileName);
    setShowAllSkills(false);
    setCopied(false);
    setHistoryOpen(false);
  };

  return (
    <>
      <HistorySidebar
        entries={entries}
        onSelect={selectHistoryEntry}
        onDelete={deleteEntry}
        onClear={clearHistory}
        isOpen={historyOpen}
        onToggle={() => setHistoryOpen((v) => !v)}
      />

      <div className="container mt-5">
        <div className="main-card text-center">
          {/* Theme toggle */}
          <button
            type="button"
            className="app-btn theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            aria-pressed={theme === "dark"}
          >
            {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
          </button>

          {/* Auth bar */}
          <div className="auth-bar">
            {user ? (
              <>
                <span className="auth-username">👤 {user.username}</span>
                <button className="auth-bar-btn" onClick={logout}>Logout</button>
              </>
            ) : (
              <button className="auth-bar-btn" onClick={() => setShowAuthModal(true)}>🔐 Login / Sign Up</button>
            )}
          </div>

          {showAuthModal && (
            <AuthModal
              onSignup={signup}
              onLogin={login}
              onClose={() => setShowAuthModal(false)}
            />
          )}

          <h1 className="mb-4">🚀 AI Resume Analyzer</h1>

          {/* Role Selector Dropdown */}
          <div className="mb-4">
            <label htmlFor="roleSelect" style={{ marginRight: "10px", fontWeight: "600", color: "#fff" }}>
              Target Career Track:
            </label>
            <select
              id="roleSelect"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #ccc" }}
            >
              <option value="Frontend Developer">Frontend Developer</option>
              <option value="Backend Developer">Backend Developer</option>
              <option value="Data Analyst">Data Analyst</option>
            </select>
          </div>

          <div
            className={`upload-box mb-3${isDragging ? " dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                setFile(e.dataTransfer.files[0]);
              }
            }}
          >
            <input
              type="file"
              id="fileUpload"
              hidden
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                if (e.target.files) setFile(e.target.files[0]);
              }}
            />
            <label htmlFor="fileUpload" className="upload-label">
              <span className="upload-icon-wrapper" aria-hidden="true">📄</span>
              <span className="upload-text-primary">
                Drag & Drop Resume or <span className="upload-text-browse">Click to Browse</span>
              </span>
              {file ? (
                <span className="upload-text-secondary" style={{ display: "block", marginTop: "4px" }}>
                  Selected: {file.name}
                </span>
              ) : (
                <span className="upload-text-secondary">Supports PDF, DOCX, TXT up to 10MB</span>
              )}
            </label>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", alignItems: "center" }} className="mb-3">
            <button
              className="analyze-btn"
              onClick={uploadResume}
              disabled={loading || cooldownRemaining > 0}
            >
              {loading && analysisSource === "upload" ? "⏳ Extracting and analyzing resume text..." :
                cooldownRemaining > 0 ? `Retry available in ${cooldownRemaining}s` :
                  "🚀 Analyze Resume"}
            </button>
            <button
              className="secondary-btn"
              onClick={handleSampleResume}
              disabled={loading || cooldownRemaining > 0}
              type="button"
            >
              {loading && analysisSource === "sample" ? "⏳ Loading Sample..." :
                cooldownRemaining > 0 ? `Retry available in ${cooldownRemaining}s` :
                  "Try Sample Resume"}
            </button>
          </div>

          {/* Loading spinner — shown while the resume is being analyzed */}
          {loading && (
            <div
              className="loader"
              role="status"
              aria-live="polite"
              aria-label="Analyzing resume, please wait"
            >
              <span className="sr-only">Analyzing resume, please wait…</span>
            </div>
          )}

          {/* Results */}
          {score !== null && (
            <>
              {analysisSource === "sample" && (
                <div className="sample-notice-banner mb-4">
                  <span>ℹ️ Viewing Sample Resume Analysis</span>
                  <span style={{ fontWeight: "normal", fontSize: "13px" }}>
                    — This analysis is based on a bundled sample resume.
                  </span>
                </div>
              )}

              <AtsScore score={score} />

              <ResumePreview text={resumeText} skills={skills} />

              <h5 className="analysis-done">✅ Resume Analysis Complete</h5>
              {activeFileName && (
                <p style={{ fontSize: "13px", opacity: 0.7, marginTop: "-8px" }}>📄 {activeFileName}</p>
              )}

              {/* Skills container */}
              <div className="mt-4">
                <h4>Skills Found ({skills.length})</h4>
                {skills.length === 0 && <p>No skills detected</p>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
                  {(showAllSkills ? skills : skills.slice(0, 15)).map((skill: string, i: number) => (
                    <span key={i} className="skill-badge">{skill}</span>
                  ))}
                </div>
                {skills.length > 15 && (
                  <button
                    type="button"
                    className="app-btn app-btn--secondary"
                    style={{ marginTop: "16px" }}
                    onClick={() => setShowAllSkills(!showAllSkills)}
                  >
                    {showAllSkills ? "Show Less ▲" : `Show More (${skills.length - 15} more) ▼`}
                  </button>
                )}
              </div>

              {/* Skill gap matrix */}
              <div className="mt-4 p-3" style={{ background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                <h4>🎯 Skill Gap Matrix ({targetRole})</h4>
                <div style={{ display: "flex", justifyContent: "space-around", marginTop: "12px" }}>
                  <div>
                    <h6 style={{ color: "#22c55e" }}>Matched Skills</h6>
                    {matchedSkills.length === 0 ? <p style={{ fontSize: "12px" }}>None</p> : matchedSkills.map((s, i) => (
                      <span key={i} className="badge bg-success m-1">{s}</span>
                    ))}
                  </div>
                  <div>
                    <h6 style={{ color: "#ef4444" }}>Missing Skills</h6>
                    {missingSkills.length === 0 ? <p style={{ fontSize: "12px" }}>None</p> : missingSkills.map((s, i) => (
                      <span key={i} className="badge bg-danger m-1">{s}</span>
                    ))}
                  </div>
                </div>
              </div>

              {score !== null && (
                <ActionPlanChecklist
                  score={score}
                  targetRole={targetRole}
                  suggestions={suggestions}
                  missingSkills={missingSkills}
                />
              )}
              {/* SUGGESTIONS BOX WITH THE UTILITY BUTTON */}
              <div className="suggestion-box mt-4">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h4 style={{ margin: 0 }}>💡 Suggestions</h4>
                  {suggestions.length > 0 && (
                    <button
                      type="button"
                      className={`app-btn app-btn--accent${copied ? " is-success" : ""}`}
                      onClick={copySuggestionsToClipboard}
                    >
                      {copied ? "✅ Copied!" : "📋 Copy Suggestions"}
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
                </div>
              </div>

              {/* Suggestions Checklist Section */}
              <SuggestionsSection
                suggestions={suggestions}
                addressedSuggestions={addressedSuggestions}
                theme={theme}
                onToggleSuggestion={toggleSuggestion}
                onResetAnalysis={resetAnalysis}
                exportJSON={exportJSON}
                exportCSV={exportCSV}
              />
            </>
          )}
        </div>
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

                          <ActionPlanChecklist
                            score={score || 0}
                            targetRole={targetRole}
                            suggestions={suggestions}
                            missingSkills={missingSkills}
                            readabilityLabel={readabilityLabel}
                            coverLetterFeedback={coverLetterFeedback}
                            fileName={activeFileName}
                          />

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
                </div>

                {suggestions.map((s: string, i: number) => (
                  <div key={i} className="suggestion-item">📌 {s}</div>
                ))}

                {/* Reset Button */}
                <div style={{ marginTop: "24px", textAlign: "center" }}>
                  <button
                    type="button"
                    className="app-btn app-btn--secondary"
                    onClick={resetAnalysis}
                  >
                    🔄 Start New Analysis
                  </button>
                </div>
              </div>
            </>
          )}   {/* closes the conditional block */}
        </div> {/* closes .main-card */}
      </div> {/* closes .container */}

      <Footer />  {/* footer should be outside main container */}

    </>
  ); {/* closes the return fragment */ }
} {/* closes App function */ }

export default App;
