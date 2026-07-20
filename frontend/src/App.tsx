import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./index.css";
import { AtsScore } from "./AtsScore";
import { useAnalysisHistory, type AnalysisEntry } from "./hooks/useAnalysisHistory";
import { HistorySidebar } from "./HistorySidebar";
import { useAuth } from "./hooks/useAuth";
import { AuthModal } from "./AuthModal";
import { Footer } from "./Footer";
import AnalysisSkeleton from "./components/AnalysisSkeleton/AnalysisSkeleton";
import { InfoTooltip } from "./components/InfoTooltip";
import { SkillWordCloud } from "./components/SkillWordCloud";
import {
  FileText,
  Loader2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Target,
  Info,
} from "lucide-react";
import { Navbar } from "./components/Navbar";
import EmptyState from "./components/EmptyState";
import { StepProgress } from "./components/StepProgress";
import resultScreenshot from "./assets/screenshots/result.png";
import { OnboardingTour } from "./components/OnboardingTour";
import { HowItWorks } from "./components/HowItWorks";
import { CompareVersions } from "./components/CompareVersions/CompareVersions";
import { SkillChip } from "./components/SkillChip";
import { requestNotificationPermission, sendAnalysisCompleteNotification } from "./utils/notification";

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

  const sorted = [...skills].sort((a, b) => b.length - a.length);
  const escaped = sorted.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(?<![\\w])(${escaped.join("|")})(?![\\w])`, "gi");
  const parts = text.split(pattern);
  const skillSet = new Set(skills.map((s) => s.toLowerCase()));

  return parts.map((part, i) =>
    skillSet.has(part.toLowerCase()) ? (
      <mark key={i} className="skill-highlight">
        {part}
      </mark>
    ) : (
      part
    )
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
  );
}

interface SuggestionCardProps {
  text: string;
  index: number;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ text, index }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="suggestion-card">
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          <span style={{ fontSize: "16px" }}>💡</span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: "700",
              color: "#a5b4fc",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Recommendation #{index + 1}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "#e2e8f0", lineHeight: "1.6" }}>
          {text}
        </p>
      </div>

      <button
        onClick={handleCopy}
        className="suggestion-copy-btn"
        aria-label="Copy recommendation text"
      >
        {copied ? "✅ Copied" : "📋 Copy Text"}
      </button>
    </div>
  );
};

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Validation States
  const [fileError, setFileError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const [targetRole, setTargetRole] = useState("Frontend Developer");
  const [matchedSkills, setMatchedSkills] = useState<string[]>([]);
  const [missingSkills, setMissingSkills] = useState<string[]>([]);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [copied, setCopied] = useState(false);
  const [analysisSource, setAnalysisSource] = useState<"sample" | "upload" | null>(null);
  const [jobDesc, setJobDesc] = useState("");
  const [resumeText, setResumeText] = useState<string>("");
  const [activeFileName, setActiveFileName] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  let currentStep: 1 | 2 | 3 = 1;
  if (loading) {
    currentStep = 2;
  } else if (!loading && score !== null) {
    currentStep = 3;
  }

  const { user, signup, login, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { entries, addEntry, deleteEntry, clearHistory, setEntries } = useAnalysisHistory();

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

  const handleDeleteEntry = async (id: string) => {
    if (user) {
      try {
        await axios.delete(`${backendUrl}/api/history/${id}/`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
      } catch (error) {
        console.error("Failed to delete from database", error);
      }
    }
    deleteEntry(id);
  };

  const MAX_CHARS = 2000;
  const isClose = jobDesc.length >= MAX_CHARS * 0.9;
  const isOver = jobDesc.length > MAX_CHARS;

  const handleClearAll = async () => {
    if (user) {
      try {
        await axios.delete(`${backendUrl}/api/history/clear/`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
      } catch (error) {
        console.error("Failed to clear database history", error);
      }
    }
    clearHistory();
  };

  const fetchDbHistory = useCallback(
    async (token: string) => {
      try {
        const res = await axios.get(`${backendUrl}/api/history/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const dbEntries: AnalysisEntry[] = res.data.map((item: any) => ({
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
        const uniqueDbEntries = dbEntries.filter(
          (entry, index, self) =>
            index === self.findIndex((t) => t.fileName === entry.fileName && t.score === entry.score)
        );
        setEntries(uniqueDbEntries);
      } catch {
        /* silently ignore */
      }
    },
    [backendUrl, setEntries]
  );

  useEffect(() => {
    if (user) fetchDbHistory(user.token);
  }, [user, fetchDbHistory]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch { }
  }, [theme]);

  // Reset analysis helper
  const resetAnalysis = useCallback(() => {
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
    setShowExportDropdown(false);
    setFileError(null);
    setRoleError(null);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const modifier = event.altKey;

      if (modifier && event.key.toLowerCase() === "u") {
        event.preventDefault();
        document.getElementById("fileUpload")?.click();
      }

      if (modifier && event.key.toLowerCase() === "r") {
        event.preventDefault();
        resetAnalysis();
      }

      if (event.key === "Escape") {
        setShowAuthModal(false);
        setHistoryOpen(false);
        setShowShortcutHelp(false);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [resetAnalysis]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const runAnalysis = async (fileToAnalyze: File, source: "sample" | "upload") => {
    try {
      setLoading(true);
      setAnalysisSource(source);
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

      if (user) {
        await fetchDbHistory(user.token);
      } else {
        addEntry({
          score: res.data.score,
          skills: res.data.skills_found || [],
          suggestions: res.data.suggestions || [],
          matchedSkills: res.data.matched_skills || [],
          missingSkills: res.data.missing_skills || [],
          targetRole: targetRole,
          fileName: fileToAnalyze.name,
        });
      }

      // Send native browser notification if tab is hidden / unfocused
      sendAnalysisCompleteNotification(fileToAnalyze.name);
    } catch (error: any) {
      console.error(error);
      let errorMsg = "Unknown error";
      if (axios.isAxiosError(error)) {
        errorMsg = error.response?.data?.error ?? error.message;
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }
      alert(source === "sample" ? `Sample analysis failed: ${errorMsg}` : `Upload failed: ${errorMsg}`);
      setLoading(false);
    }
  };

  const uploadResume = async () => {
    let hasError = false;

    if (!targetRole || targetRole.trim() === "") {
      setRoleError("Target career track is required.");
      hasError = true;
    } else {
      setRoleError(null);
    }

    if (!file) {
      setFileError("Please upload a resume file before analyzing.");
      hasError = true;
    } else {
      setFileError(null);
    }

    if (hasError) return;

    await requestNotificationPermission();
    await runAnalysis(file!, "upload");
  };

  const handleSampleResume = async () => {
    try {
      await requestNotificationPermission();
      setLoading(true);
      setAnalysisSource("sample");
      const response = await fetch("/sample-resume.pdf");
      if (!response.ok) {
        throw new Error("Failed to load sample resume PDF");
      }
      const blob = await response.blob();
      const sampleFile = new File([blob], "sample-resume.pdf", { type: "application/pdf" });
      await runAnalysis(sampleFile, "sample");
      setActiveFileName(sampleFile.name);
    } catch (error: any) {
      console.error(error);
      alert("Could not load sample resume");
      setLoading(false);
    }
  };

  const copySuggestionsToClipboard = () => {
    if (suggestions.length === 0) return;
    const plainTextSuggestions = suggestions.map((s: string) => `• ${s}`).join("\n");
    navigator.clipboard
      .writeText(plainTextSuggestions)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => console.error("Failed to copy text: ", err));
  };

  const getExportTimestamp = () => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(
      d.getMinutes()
    )}-${pad(d.getSeconds())}`;
  };

  const exportJSON = () => {
    const data = { score, skills, suggestions };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resume-analysis-${getExportTimestamp()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportDropdown(false);
  };

  const exportCSV = () => {
    const escapeCSV = (str: string) => `"${str.replace(/"/g, '""')}"`;
    const header = "score,skills,suggestions\n";
    const row = `${score},${escapeCSV(skills.join(","))},${escapeCSV(suggestions.join(","))}\n`;
    const blob = new Blob([header + row], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resume-analysis-${getExportTimestamp()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportDropdown(false);
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
    setShowExportDropdown(false);
  };

  const handleLogout = () => {
    logout();
    clearHistory();
  };

  return (
    <>
      <OnboardingTour />
      <HistorySidebar
        entries={entries}
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

      <Navbar
        theme={theme}
        toggleTheme={toggleTheme}
        user={user}
        onLogin={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        onHistoryClick={() => setHistoryOpen(true)}
      />

      <div className="container mt-5 px-3">
        <div
          className="main-card text-center mx-auto"
          style={{ width: "100%", maxWidth: score === null && !loading ? "1100px" : "600px" }}
        >
          {showAuthModal && (
            <AuthModal
              onSignup={signup}
              onLogin={login}
              onClose={() => setShowAuthModal(false)}
            />
          )}
 add-eslint-prettier-config
          <h1 className="mb-4 app-main-title" style={{ fontSize: "calc(1.5rem + 1.5vw)", wordBreak: "break-word" }}>🚀 AI Resume Analyzer</h1>

          <StepProgress currentStep={currentStep} />

          {/* STEP 1: Role Selector Container */}
          <div className="mb-4 d-flex flex-column align-items-center flex-sm-row justify-content-center role-selector-container" style={{ gap: "8px" }}>
            <label htmlFor="roleSelect" className="role-select-label" style={{ fontWeight: "600" }}>
              Target Career Track:
            </label>
            <div className="custom-select-container">
          
          <h1 className="mb-4 app-main-title" style={{ fontSize: "calc(1.5rem + 1.5vw)", wordBreak: "break-word" }}>
            🚀 AI Resume Analyzer
          </h1>

          {/* STEP 1: Role Selector Container */}
          <div className="mb-5 p-4" style={{ background: "rgba(255, 255, 255, 0.02)", borderRadius: "var(--radius-lg)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <label htmlFor="roleSelect" style={{ display: "block", marginBottom: "12px", fontWeight: "600", color: "#e2e8f0", fontSize: "var(--font-size-sm)" }}>
              1️⃣ Choose your Target Career Track
            </label>
            <div className="custom-select-container" style={{ display: "flex", justifyContent: "center" }}>
              <select
                id="roleSelect"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="custom-select-element role-select-dropdown"
                style={{ padding: "10px 16px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(255,255,255,0.15)", width: "100%", maxWidth: "320px", background: "#1e1e2f", color: "#fff", fontSize: "var(--font-size-sm)" }}
              >
                <option value="Frontend Developer">Frontend Developer</option>
                <option value="Backend Developer">Backend Developer</option>
                <option value="Data Analyst">Data Analyst</option>
              </select>
            </div>
          </div>

          {/* STEP 2: Upload Container */}
          <div className="mb-5">
            <div className="upload-box mb-3" style={{ width: "100%", maxWidth: "100%" }}>
            <span style={{ display: "block", marginBottom: "12px", fontWeight: "600", color: "#e2e8f0", fontSize: "var(--font-size-sm)" }}>
              2️⃣ Upload your Document & Job Details
            </span>
            <div className="upload-box mb-4" style={{ padding: "32px 20px", border: "2px dashed var(--upload-border)", borderRadius: "var(--radius-lg)", background: "var(--upload-bg)", transition: "all 0.3s ease" }}>
              <input
                type="file"
                id="fileUpload"
                hidden
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  if (e.target.files) setFile(e.target.files[0]);
                }}
              />
              <label
  htmlFor="fileUpload"
  className="upload-label"
  style={{
    cursor: "pointer",
    display: "block",
    fontSize: "var(--font-size-base)",
    wordBreak: "break-all",
  }}
>
  📄{" "}
  {file ? (
    <strong style={{ color: "#a5b4fc" }}>{file.name}</strong>
  ) : (
    "Drag & Drop Resume or Click to Browse"
  )}
</label>
            </div>


          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center", alignItems: "center" }} className="mb-3">
            <div className="mb-4" style={{ textAlign: "left" }}>
              <label htmlFor="jobDescription" style={{ fontWeight: "600", display: "block", marginBottom: "8px", color: "#e2e8f0" }}>
                Job Description (Optional)
              </label>
              <textarea
                id="jobDescription"
                className="custom-textarea"
                value={jobDesc}
                onChange={(e) => setJobDesc(e.target.value)}
                placeholder="Paste the job description here..."
                style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.02)', color: 'inherit', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              />
              {/* The Live Counter */}
              <div style={{ 
                textAlign: 'right', 
                color: isOver ? '#ef4444' : (isClose ? '#f97316' : 'inherit'),
                opacity: isOver || isClose ? 1 : 0.7,
                fontSize: '0.85rem',
                marginTop: '5px',
                fontWeight: isOver ? 'bold' : 'normal'
              }}>
                {jobDesc.length} / {MAX_CHARS} characters
              </div>
            </div>
          </div>

          {/* STEP 3: Action Buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center", alignItems: "center" }} className="mb-4">
            <button
              className="analyze-btn"
              onClick={uploadResume}
              disabled={loading}
              style={{
                padding: "12px 36px",
                fontSize: "var(--font-size-base)",
                fontWeight: "700",
                letterSpacing: "0.5px",
                backgroundColor: "#6366f1",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                boxShadow: "var(--shadow-card)",
                transition: "transform 0.2s ease, background-color 0.2s ease",
                flex: "1 1 200px",
                minHeight: "44px",
                maxWidth: "280px"
              }}
            >
              {loading && analysisSource === "upload" ? "⏳ Processing..." : "🚀 Analyze Resume"}
            </button>
            
            <button
              className="secondary-btn"
              onClick={handleSampleResume}
              disabled={loading}
              type="button"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--btn-secondary-text)",
                fontSize: "var(--font-size-sm)",
                textDecoration: "underline",
                cursor: "pointer",
                minHeight: "44px",
                flex: "1 1 200px",
                maxWidth: "280px"
              }}
            >
              {loading && analysisSource === "sample" ? "⏳ Loading..." : "Or try with a sample resume"}
              {loading && analysisSource === "sample"
                ? <><Loader2 size={15} className="spin" /> Loading...</>
                : "Try Sample Resume"}
            </button>
          </div>


 main

          <div className={score === null && !loading ? "hero-container" : ""}>
            <div className={score === null && !loading ? "hero-left" : ""}>
              <h1
                className="mb-4 app-main-title"
                style={{ fontSize: "calc(1.5rem + 1.5vw)", wordBreak: "break-word" }}
              >
                🚀 AI Resume Analyzer
              </h1>

              {score === null && !loading && (
                <p className="hero-description">
                  Optimize your resume for Applicant Tracking Systems. Get instant scoring, identify
                  missing skills, and receive actionable recommendations to land your dream job.
                </p>
              )}

              <StepProgress currentStep={currentStep} />

              {/* STEP 1: Target Career Track */}
              <div
                className="mb-4 p-4 role-selector-container"
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <label
                  htmlFor="roleSelect"
                  style={{
                    display: "block",
                    marginBottom: "12px",
                    fontWeight: "600",
                    color: "#e2e8f0",
                    fontSize: "var(--font-size-sm)",
                  }}
                >
                  🎯 Target Career Track
                </label>
                <div className="custom-select-container">
                  <select
                    id="roleSelect"
                    value={targetRole}
                    onChange={(e) => {
                      setTargetRole(e.target.value);
                      if (e.target.value.trim() !== "") setRoleError(null);
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
                      color: "#ef4444",
                      fontSize: "13px",
                      marginTop: "8px",
                      fontWeight: "500",
                      textAlign: "center",
                    }}
                  >
                    ⚠️ {roleError}
                  </div>
                )}
              </div>

              {/* STEP 2: Upload File & Job Description */}
              <div className="mb-5">
                <div
                  className="upload-box mb-3"
                  style={{ width: "100%", maxWidth: "100%", padding: "32px 20px" }}
                >
                  <input
                    type="file"
                    id="fileUpload"
                    hidden
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      if (e.target.files && e.target.files[0]) {
                        setFile(e.target.files[0]);
                        setFileError(null);
                      }
                    }}
                  />
                  <label
                    htmlFor="fileUpload"
                    className="upload-label"
                    style={{
                      cursor: "pointer",
                      display: "block",
                      wordBreak: "break-all",
                      fontSize: "var(--font-size-base)",
                    }}
                  >
                    📄{" "}
                    {file ? (
                      <strong style={{ color: "#a5b4fc" }}>{file.name}</strong>
                    ) : (
                      "Drag & Drop Resume or Click to Browse"
                    )}
                  </label>
                </div>

                {fileError && (
                  <div
                    style={{
                      color: "#ef4444",
                      fontSize: "13px",
                      marginTop: "-4px",
                      marginBottom: "16px",
                      fontWeight: "500",
                      textAlign: "center",
                    }}
                  >
                    ⚠️ {fileError}
                  </div>
                )}

                {/* Optional Job Description */}
                <div className="mb-4" style={{ textAlign: "left" }}>
                  <label
                    htmlFor="jobDescription"
                    style={{
                      fontWeight: "600",
                      display: "block",
                      marginBottom: "8px",
                      color: "#e2e8f0",
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
                      width: "100%",
                      minHeight: "100px",
                      padding: "12px",
                      borderRadius: "var(--radius-md)",
                      background: "rgba(255, 255, 255, 0.02)",
                      color: "inherit",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  />
                  <div
                    style={{
                      textAlign: "right",
                      color: isOver ? "#ef4444" : isClose ? "#f97316" : "inherit",
                      opacity: isOver || isClose ? 1 : 0.7,
                      fontSize: "0.85rem",
                      marginTop: "5px",
                      fontWeight: isOver ? "bold" : "normal",
                    }}
                  >
                    {jobDesc.length} / {MAX_CHARS} characters
                  </div>
                </div>

                {/* STEP 3: Action Buttons */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  className="action-buttons"
                >
                  <button
                    className="analyze-btn"
                    onClick={uploadResume}
                    disabled={loading}
                    style={{ minHeight: "44px", flex: "1 1 200px", maxWidth: "100%" }}
                  >
                    {loading && analysisSource === "upload" ? "⏳ Extracting..." : "🚀 Analyze Resume"}
                  </button>

                  <button
                    className="secondary-btn"
                    onClick={handleSampleResume}
                    disabled={loading}
                    type="button"
                    style={{ minHeight: "44px", flex: "1 1 200px", maxWidth: "100%" }}
                  >
                    {loading && analysisSource === "sample" ? (
                      <>
                        <Loader2 size={15} className="spin" /> Loading...
                      </>
                    ) : (
                      "Try Sample Resume"
                    )}
                  </button>
                </div>
              </div>
            </div>

            {score === null && !loading && (
              <div className="hero-right">
                <img src={resultScreenshot} alt="App Preview" className="hero-screenshot" />
              </div>
            )}
          </div>

          {/* Loading Skeleton */}
          {loading && <AnalysisSkeleton />}

          {/* Empty State / How It Works */}
          {score === null && !loading && (
            <div style={{ paddingBottom: "2rem" }}>
              <EmptyState />
              <div className="mt-4">
                <HowItWorks />
              </div>
            </div>
          )}

          {/* Results Display Panel */}
          {score !== null && !loading && (
            <>
              {analysisSource === "sample" && (
                <div
                  className="sample-notice-banner mb-4"
                  style={{ padding: "10px", wordBreak: "break-word" }}
                >
                  <span>
                    <Info size={15} /> Viewing Sample Resume Analysis
                  </span>
                  <span style={{ fontWeight: "normal", fontSize: "13px", display: "block" }}>
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
                <p style={{ fontSize: "13px", opacity: 0.7, marginTop: "-8px", wordBreak: "break-all" }}>
                  <FileText size={13} /> {activeFileName}
                </p>
              )}

              {/* Skills Section */}
              <div className="mt-4">
                <h4>Skills Found ({skills.length})</h4>
                {skills.length === 0 && <p>No skills detected</p>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
                  {(showAllSkills ? skills : skills.slice(0, 15)).map((skill: string, i: number) => (
                    <SkillChip key={i} skill={skill} type="detected" />
                  ))}
                </div>
                {skills.length > 15 && (
                  <button
                    type="button"
                    className="app-btn app-btn--secondary"
                    style={{ marginTop: "16px", minHeight: "44px" }}
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
              </div>

              {/* Word Cloud */}
              <SkillWordCloud skills={skills} />

              {/* Skill Gap Matrix */}
              <div className="mt-4 p-3" style={{ background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                <h4
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexWrap: "wrap",
                    textAlign: "center",
                    gap: "6px",
                  }}
                >
                  <Target size={18} /> Skill Gap Matrix ({targetRole})
                  <InfoTooltip content="Shows which required skills are already in your resume and which important skills are missing." />
                </h4>
                <div
                  className="skill-gap-layout"
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "20px",
                    justifyContent: "space-around",
                    marginTop: "12px",
                  }}
                >
                  <div style={{ flex: "1 1 140px", minWidth: "140px" }}>
                    <h6 style={{ color: "#22c55e" }}>Matched Skills</h6>
                    {matchedSkills.length === 0 ? (
                      <p style={{ fontSize: "12px" }}>None</p>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "4px",
                          justifyContent: "center",
                        }}
                      >
                        {matchedSkills.map((s, i) => (
                          <SkillChip key={i} skill={s} type="matched" targetRole={targetRole} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: "1 1 140px", minWidth: "140px" }}>
                    <h6 style={{ color: "#ef4444" }}>Missing Skills</h6>
                    {missingSkills.length === 0 ? (
                      <p style={{ fontSize: "12px" }}>None</p>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "4px",
                          justifyContent: "center",
                        }}
                      >
                        {missingSkills.map((s, i) => (
                          <SkillChip key={i} skill={s} type="missing" targetRole={targetRole} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Upgraded Suggestions Section */}
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
                    <h4 style={{ margin: 0 }}>💡 Suggestions</h4>
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

                      <div style={{ position: "relative", display: "inline-block" }}>
                        <button
                          type="button"
                          className="app-btn app-btn--secondary"
                          onClick={() => setShowExportDropdown(!showExportDropdown)}
                          style={{ minHeight: "44px" }}
                        >
                          Export ▼
                        </button>
                        {showExportDropdown && (
                          <div
                            style={{
                              position: "absolute",
                              top: "100%",
                              right: 0,
                              marginTop: "4px",
                              backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
                              border: `1px solid ${theme === "dark" ? "#374151" : "#e5e7eb"}`,
                              borderRadius: "6px",
                              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                              zIndex: 10,
                              display: "flex",
                              flexDirection: "column",
                              minWidth: "120px",
                              overflow: "hidden",
                            }}
                          >
                            <button
                              type="button"
                              onClick={exportJSON}
                              style={{
                                padding: "8px 12px",
                                background: "transparent",
                                border: "none",
                                color: theme === "dark" ? "#f3f4f6" : "#111827",
                                textAlign: "left",
                                cursor: "pointer",
                                borderBottom: `1px solid ${theme === "dark" ? "#374151" : "#e5e7eb"}`,
                              }}
                            >
                              Export JSON
                            </button>
                            <button
                              type="button"
                              onClick={exportCSV}
                              style={{
                                padding: "8px 12px",
                                background: "transparent",
                                border: "none",
                                color: theme === "dark" ? "#f3f4f6" : "#111827",
                                textAlign: "left",
                                cursor: "pointer",
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
                        <SuggestionCard key={index} text={suggestion} index={index} />
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: "24px", textAlign: "center" }}>
                    <button
                      type="button"
                      className="app-btn app-btn--secondary"
                      onClick={resetAnalysis}
                      style={{ minHeight: "44px", width: "100%", maxWidth: "250px" }}
                    >
                      <RefreshCw size={15} /> Start New Analysis
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating Back to Top Button */}
      <button
        type="button"
        className={`back-to-top${showBackToTop ? " back-to-top--visible" : ""}`}
        onClick={scrollToTop}
        aria-label="Back to top"
        title="Back to top"
      >
        ↑
      </button>

      <Footer />

      {/* Keyboard Shortcuts Help Button & Overlay */}
      <button
        className="shortcut-help-trigger"
        onClick={() => setShowShortcutHelp(!showShortcutHelp)}
        title="Toggle Keyboard Shortcuts Help"
        aria-label="Toggle keyboard shortcuts menu"
      >
        ?
      </button>

      {showShortcutHelp && (
        <div className="shortcut-overlay-card">
          <h5
            style={{
              margin: "0 0 12px 0",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            ⌨️ Keyboard Quick Actions
          </h5>
          <div className="shortcut-row">
            <span style={{ color: "#94a3b8" }}>Upload Resume</span>
            <span className="shortcut-key-badge">Alt + U</span>
          </div>
          <div className="shortcut-row">
            <span style={{ color: "#94a3b8" }}>Reset Analysis</span>
            <span className="shortcut-key-badge">Alt + R</span>
          </div>
          <div className="shortcut-row">
            <span style={{ color: "#94a3b8" }}>Close Modals / Sidebar</span>
            <span className="shortcut-key-badge">Esc</span>
          </div>
          <p style={{ margin: "12px 0 0 0", fontSize: "11px", color: "#64748b", fontStyle: "italic" }}>
            Press <kbd style={{ color: "#a5b4fc" }}>Esc</kbd> at any point to clear this helper overlay panel.
          </p>
        </div>
      )}
    </>
  );
}

export default App;
