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

          <div className="upload-box mb-3">
            <input
              type="file"
              id="fileUpload"
              hidden
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                if (e.target.files) setFile(e.target.files[0]);
              }}
            />
            <label htmlFor="fileUpload" className="upload-label">
              📄 {file ? file.name : "Drag & Drop Resume or Click to Upload"}
            </label>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", alignItems: "center" }} className="mb-3">
            <button
              className="analyze-btn"
              onClick={uploadResume}
              disabled={loading}
            >
              {loading && analysisSource === "upload" ? "⏳ Extracting and analyzing resume text..." : "🚀 Analyze Resume"}
            </button>
            <button
              className="secondary-btn"
              onClick={handleSampleResume}
              disabled={loading}
              type="button"
            >
              {loading && analysisSource === "sample" ? "⏳ Loading Sample..." : "Try Sample Resume"}
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

              {/* Skill Gap Matrix */}
              <div className="mt-5 p-4" style={{ background: "rgba(30, 30, 47, 0.6)", borderRadius: "var(--radius-lg)", border: "1px solid rgba(255, 255, 255, 0.05)", boxShadow: "var(--shadow-card)" }}>
                <h4 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: "0 0 8px 0", fontSize: "var(--font-size-base)", color: "#fff" }}>
                  🎯 Skill Gap Matrix ({targetRole})
                  <InfoTooltip content="Compares your resume text directly against the required keywords for this specific career path." />
                </h4>
                
                <div className="matrix-grid">
                  {/* Matched Skills Column Card */}
                  <div className="matrix-column-card">
                    <h6 style={{ color: "#4ade80", fontSize: "var(--font-size-sm)", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px", margin: "0 0 12px 0" }}>
                      🟢 Matched Keywords ({matchedSkills.length})
                    </h6>
                    {matchedSkills.length === 0 ? (
                      <p className="matrix-empty-text">No matching keywords detected for this profile path yet.</p>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {matchedSkills.map((s, i) => (
                          <span key={i} className="matrix-badge matrix-badge--matched">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Missing Skills Column Card */}
                  <div className="matrix-column-card">
                    <h6 style={{ color: "#f87171", fontSize: "var(--font-size-sm)", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px", margin: "0 0 12px 0" }}>
                      🔴 Recommended Skill Additions ({missingSkills.length})
                    </h6>
                    {missingSkills.length === 0 ? (
                      <p className="matrix-empty-text">Excellent! Your profile covers all primary required skills.</p>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {missingSkills.map((s, i) => (
                          <span key={i} className="matrix-badge matrix-badge--missing">{s}</span>
                        ))}
                      </div>
                    )}
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
  ); {/* closes the return fragment */ }
} {/* closes App function */ }

export default App;
