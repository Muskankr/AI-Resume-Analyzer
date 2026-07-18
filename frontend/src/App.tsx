import { useState, useEffect, useCallback } from "react";
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
  const [score, setScore] = useState<number | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Component States
  const [targetRole, setTargetRole] = useState("Frontend Developer");
  const [matchedSkills, setMatchedSkills] = useState<string[]>([]);
  const [missingSkills, setMissingSkills] = useState<string[]>([]);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [copied, setCopied] = useState(false);
  const [analysisSource, setAnalysisSource] = useState<"sample" | "upload" | null>(null);
  const [resumeText, setResumeText] = useState<string>("");

  // Auth
  const { user, signup, login, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // History
  const { entries, addEntry, deleteEntry, clearHistory, setEntries } = useAnalysisHistory();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeFileName, setActiveFileName] = useState("");

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
      const uniqueDbEntries = dbEntries.filter((entry, index, self) =>
        index === self.findIndex((t) => (
          t.fileName === entry.fileName && t.score === entry.score
        ))
      );
      setEntries(uniqueDbEntries);
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

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
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

      if (user) {
        await fetchDbHistory(user.token);
      }
      else {
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
    }
  };

  const uploadResume = async () => {
    if (!file) {
      alert("Please upload resume");
      return;
    }
    await runAnalysis(file, "upload");
  };

  const handleSampleResume = async () => {
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

  const handleLogout = () => {
    logout();          
    clearHistory();
  };

  return (
    <>
      <HistorySidebar
        entries={entries}
        onSelect={selectHistoryEntry}
        onDelete={handleDeleteEntry}
        onClear={handleClearAll}
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
                <button className="auth-bar-btn" onClick={handleLogout}>Logout</button>
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

          {/* STEP 1: Role Selector Container */}
          <div className="mb-5 p-3" style={{ background: "rgba(255, 255, 255, 0.02)", borderRadius: "var(--radius-md)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <label htmlFor="roleSelect" style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#e2e8f0", fontSize: "var(--font-size-sm)" }}>
              1️⃣ Choose your Target Career Track
            </label>
            <select
              id="roleSelect"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              style={{ padding: "10px 16px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(255,255,255,0.15)", width: "100%", maxWidth: "320px", background: "#1e1e2f", color: "#fff", fontSize: "var(--font-size-sm)" }}
            >
              <option value="Frontend Developer">Frontend Developer</option>
              <option value="Backend Developer">Backend Developer</option>
              <option value="Data Analyst">Data Analyst</option>
            </select>
          </div>

          {/* STEP 2: Enhanced Upload Container */}
          <div className="mb-5">
            <span style={{ display: "block", marginBottom: "12px", fontWeight: "600", color: "#e2e8f0", fontSize: "var(--font-size-sm)" }}>
              2️⃣ Upload your Document
            </span>
            <div className="upload-box mb-3" style={{ padding: "32px 20px", border: "2px dashed var(--upload-border)", borderRadius: "var(--radius-lg)", background: "var(--upload-bg)", transition: "all 0.3s ease" }}>
              <input
                type="file"
                id="fileUpload"
                hidden
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  if (e.target.files) setFile(e.target.files[0]);
                }}
              />
              <label htmlFor="fileUpload" className="upload-label" style={{ cursor: "pointer", display: "block", fontSize: "var(--font-size-base)" }}>
                📄 {file ? <strong style={{ color: "#a5b4fc" }}>{file.name}</strong> : "Drag & Drop Resume or Click to Browse"}
              </label>
            </div>
          </div>

          {/* STEP 3: Prominent Call to Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", marginTop: "24px" }} className="mb-4">
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
                width: "100%",
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
                marginTop: "4px"
              }}
            >
              {loading && analysisSource === "sample" ? "⏳ Loading..." : "Or try with a sample resume"}
            </button>
          </div>

          {/* Loading skeleton — shown while the resume is being analyzed */}
          {loading && <AnalysisSkeleton />}

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
                <p style={{ fontSize: "var(--font-size-sm)", opacity: 0.7, marginTop: "-8px" }}>📄 {activeFileName}</p>
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
              <div className="mt-4 p-3" style={{ background: "rgba(255,255,255,0.05)", borderRadius: "var(--radius-md)" }}>
                <h4 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  🎯 Skill Gap Matrix ({targetRole})
                  <InfoTooltip content="Shows which required skills are already in your resume and which important skills are missing." />
                </h4>
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
  ); /* closes the return fragment */
} /* closes App function */

export default App;
