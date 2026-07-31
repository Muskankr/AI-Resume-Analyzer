import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./index.css";
import { useAnalysisHistory, type AnalysisEntry } from "./hooks/useAnalysisHistory";
import { useAuth } from "./hooks/useAuth";
import { AtsScore } from "./components/AtsScore";
import { HistorySidebar } from "./components/HistorySidebar";
import { AuthModal } from "./components/AuthModal";
import { Footer } from "./Footer";
import AnalysisSkeleton from "./components/AnalysisSkeleton/AnalysisSkeleton";
import { InfoTooltip } from "./components/InfoTooltip";
import { SkillWordCloud } from "./components/SkillWordCloud";
import { useTheme } from "./hooks/useTheme";
import { useAddressedSuggestions } from "./hooks/useAddressedSuggestions";
import { highlightSkills } from "./utils/textUtils";
import {
  FileText,
  Loader2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Target,
  Info,
} from "lucide-react";
import { Navbar } from "./components/Navbar";
import EmptyState from "./components/EmptyState";
import { StepProgress } from "./components/StepProgress";
import resultScreenshot from "./assets/screenshots/result.png";
import { OnboardingTour } from "./components/OnboardingTour";
import { HowItWorks } from "./components/HowItWorks";
import { SkillChip } from "./components/SkillChip";
import { ActionPlanChecklist } from "./components/ActionPlanChecklist";

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
  const { theme, toggleTheme } = useTheme();
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

  const [targetRole, setTargetRole] = useState("Frontend Developer");
  const [matchedSkills, setMatchedSkills] = useState<string[]>([]);
  const [missingSkills, setMissingSkills] = useState<string[]>([]);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [analysisSource, setAnalysisSource] = useState<"sample" | "upload" | null>(null);
  const [jobDesc, setJobDesc] = useState("");
  const [resumeText, setResumeText] = useState<string>("");
  const [activeFileName, setActiveFileName] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  // Custom Hook for Interactive Checklist Suggestions
  const { setAddressedSuggestions } = useAddressedSuggestions(
    activeFileName,
    suggestions.length
  );

  let currentStep: 1 | 2 | 3 = 1;
  if (loading) {
    currentStep = 2;
  } else if (!loading && score !== null) {
    currentStep = 3;
  }

  const { user, signup, login, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { entries, addEntry, deleteEntry, clearHistory } = useAnalysisHistory();

  const MAX_CHARS = 2000;
  const isClose = jobDesc.length >= MAX_CHARS * 0.9;
  const isOver = jobDesc.length > MAX_CHARS;

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
      setAddressedSuggestions([]);

      const formData = new FormData();
      formData.append("file", fileToAnalyze);
      formData.append("target_role", targetRole);
      formData.append("job_description", jobDesc);

      const response = await axios.post("/api/analyze/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(user?.token ? { Authorization: `Token ${user.token}` } : {}),
        },
      });

      const data = response.data;

      setScore(data.score);
      setSkills(data.skills_found || []);
      setSuggestions(data.suggestions || []);
      setMatchedSkills(data.matched_skills || []);
      setMissingSkills(data.missing_skills || []);
      setResumeText(data.resume_text || "");
      setActiveFileName(fileToAnalyze.name);

      setLoading(false);

      addEntry({
        score: data.score,
        skills: data.skills_found || [],
        suggestions: data.suggestions || [],
        matchedSkills: data.matched_skills || [],
        missingSkills: data.missing_skills || [],
        targetRole: targetRole,
        fileName: fileToAnalyze.name,
      });
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

    await runAnalysis(file!, "upload");
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
      const sampleFile = new File([blob], "sample-resume.pdf", { type: "application/pdf" });
      await runAnalysis(sampleFile, "sample");
      setActiveFileName(sampleFile.name);
    } catch (error: any) {
      console.error(error);
      alert("Could not load sample resume");
      setLoading(false);
    }
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
    setHistoryOpen(false);
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
        onDelete={deleteEntry}
        onClear={clearHistory}
        isOpen={historyOpen}
        onToggle={() => setHistoryOpen((v) => !v)}
      />

      <Navbar
        theme={theme}
        toggleTheme={toggleTheme}
        user={user}
        onLogin={() => setShowAuthModal(true)}
        onLogout={handleLogout}
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

              {/* Action Plan Suggestions Checklist Section */}
              <ActionPlanChecklist
                score={score ?? 0}
                suggestions={suggestions}
                missingSkills={missingSkills}
                targetRole={targetRole}
              />
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
