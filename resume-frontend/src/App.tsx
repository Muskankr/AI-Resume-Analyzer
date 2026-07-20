import { useState } from "react";
import axios from "axios";
import "./index.css";

function App() {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showAllSkills, setShowAllSkills] = useState(false);

  // --- ISSUE #5 SKILL GAP STATE VARIABLES ---
  const [selectedRole, setSelectedRole] = useState<string>("Frontend Developer");
  const [matchedSkills, setMatchedSkills] = useState<string[]>([]);
  const [missingSkills, setMissingSkills] = useState<string[]>([]);
  const [analysisPerformedFor, setAnalysisPerformedFor] = useState<string | null>(null);

  
  // New states for clean inline and banner error handling
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInlineError(null); // Clear previous errors
    setApiError(null);

    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // Acceptance Criteria: Non-PDF files show a clear inline error before upload
      if (selectedFile.type !== "application/pdf") {
        setInlineError("⚠️ Only PDF files are supported. Please select a valid PDF.");
        setFile(null); // Clear invalid file from state
        return;
      }

      setFile(selectedFile);
    }
  };


  const uploadResume = async () => {
    if (!file) {
      setInlineError("⚠️ Please upload a resume first.");
      return;
    }



      setLoading(true);


    // Reset API errors before initiating a new call
    setApiError(null);


    try {
      setLoading(true);   


      const formData = new FormData();
      formData.append("file", file);
      // Issue #5: Send the selected role to the backend
      formData.append("role", selectedRole);

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
      const res = await axios.post(
        `${API_BASE_URL}/api/upload/`,
        formData
      );

      setScore(res.data.score);
      setSkills(res.data.skills_found);
      setSuggestions(res.data.suggestions);
      
      // Issue #5: Save comparison lists from backend response
      setMatchedSkills(res.data.matched_skills || []);
      setMissingSkills(res.data.missing_skills || []);
      setAnalysisPerformedFor(res.data.target_role || selectedRole);


      setLoading(false);



      setLoading(false);   
    } catch (error) {

    } catch (error: any) {

      console.error(error);

      alert("Upload failed");
      setLoading(false);

      
      // Acceptance Criteria: Failed API calls show a banner with a readable message
      if (!window.navigator.onLine) {
        setApiError("🔌 Network Error: Please check your internet connection.");
      } else if (error.response) {
        setApiError(`❌ Server Error (${error.response.status}): Failed to analyze resume.`);
      } else {
        setApiError("⚠️ Could not reach the server. Make sure your backend service is running.");
      }
    } finally {
      // Acceptance Criteria: Errors don't crash the app or leave it stuck loading
      setLoading(false);   

    }
  };

  return (
    <div className="container mt-5">
      <div className="main-card text-center">
        <h1 className="mb-4">🚀 AI Resume Analyzer</h1>
        


        {/* API Error Banner Notification */}
        {apiError && (
          <div className="error-banner mb-3" style={{
            backgroundColor: "#fee2e2",
            color: "#dc2626",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #fca5a5",
            fontSize: "14px",
            fontWeight: "500",
            textAlign: "left"
          }}>
            {apiError}
          </div>
        )}


        <div className="upload-box mb-3">
          <input
            type="file"
            id="fileUpload"
            accept=".pdf" // Restricts native picker view to PDFs
            hidden
            onChange={handleFileChange}
          />
          <label htmlFor="fileUpload" className="upload-label">
            📄 {file ? file.name : "Drag & Drop Resume or Click to Upload"}
          </label>

        </div>

        {/* Issue #5: Dropdown UI to pick a role before analysis */}
        <div className="mb-4" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px" }}>
          <label htmlFor="roleSelect" style={{ fontWeight: "600", color: "#fff" }}>Target Job Role:</label>
          <select
            id="roleSelect"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#fff",
              color: "#334155",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer"
            }}
          >
            <option value="Frontend Developer">Frontend Developer</option>
            <option value="Backend Developer">Backend Developer</option>
            <option value="Data Analyst">Data Analyst</option>
          </select>
        </div>

        <button className="analyze-btn" onClick={uploadResume}>

        </div>

        {/* Inline Error Message for File Type Validation */}
        {inlineError && (
          <p className="error-text mb-3" style={{ color: "#dc2626", fontSize: "14px", fontWeight: "500" }}>
            {inlineError}
          </p>
        )}

        <button
          className="analyze-btn"
          onClick={uploadResume}
          disabled={loading} // Prevent multiple clicks while uploading
        >

          {loading ? "⏳ Analyzing..." : "🚀 Analyze Resume"}
        </button>

        {score !== null && (
          <>

            {/* SCORE METER - Restored perfectly to your original version */}

            {/* SCORE METER */}

            <div className="score-section">
              <div
                className="score-circle mb-3"
                style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}
              >
                {score}%
              </div>
              <h3>ATS Resume Score</h3>
              <h5 className="analysis-done">
                ✅ Resume Analysis Complete
              </h5>
            </div>

            {/* SKILLS */}
            <div className="mt-4">

              <h4>Skills Found ({skills.length})</h4>

              {skills.length === 0 && <p>No skills detected</p>}

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
                {(showAllSkills ? skills : skills.slice(0, 15)).map((skill: string, i: number) => (
                  <span key={i} className="skill-badge">
                    {skill}
                  </span>
                ))}
              </div>

              {/* Acceptance Criteria: Show toggle button only if list exceeds 15 */}
              {skills.length > 15 && (
                <button
                  onClick={() => setShowAllSkills(!showAllSkills)}
                  style={{
                    marginTop: "16px",
                    background: "rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    padding: "6px 16px",
                    borderRadius: "20px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "13px",
                    transition: "all 0.2s ease",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                  }}
                >
                  {showAllSkills ? "Show Less ▲" : `Show More (${skills.length - 15} more) ▼`}
                </button>
              )}

            </div>
            {/* SUGGESTIONS */}
            <h4>Skills Found</h4>
              {skills.length === 0 && <p>No skills detected</p>}
              {skills.map((skill: string, i: number) => (
                <span key={i} className="skill-badge">
                  {skill}
                </span>
              ))}
            </div>



            {/* Issue #5: Display Comparison Panels */}
            {analysisPerformedFor && (
              <div className="mt-4" style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", padding: "20px", borderRadius: "8px", textAlign: "left" }}>
                <h4 style={{ marginTop: 0, borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "8px", color: "#fff" }}>
                  🎯 Target Role Match Analysis: {analysisPerformedFor}
                </h4>
                
                <div style={{ marginBottom: "14px" }}>
                  <strong style={{ color: "#4ade80", fontSize: "15px" }}>✅ Matched Skills:</strong>
                  <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {matchedSkills.length === 0 ? <em style={{ fontSize: "13px", color: "#cbd5e1" }}>None matched yet</em> : 
                      matchedSkills.map((s, i) => (
                        <span key={i} style={{ backgroundColor: "#22c55e", color: "white", padding: "5px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: "500" }}>
                          {s}
                        </span>
                      ))
                    }
                  </div>
                </div>

                <div>
                  <strong style={{ color: "#f87171", fontSize: "15px" }}>❌ Missing Skills:</strong>
                  <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {missingSkills.length === 0 ? <em style={{ fontSize: "13px", color: "#cbd5e1" }}>Perfect Match! No gaps found.</em> : 
                      missingSkills.map((s, i) => (
                        <span key={i} style={{ backgroundColor: "#ef4444", color: "white", padding: "5px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: "500" }}>
                          {s}
                        </span>
                      ))
                    }
                  </div>
                </div>
              </div>
            )}



            {/* SUGGESTIONS */}
            <div className="suggestion-box">
              <h4>💡 Suggestions</h4>
              {suggestions.map((s, i) => (
                <div key={i} className="suggestion-item">
                  📌 {s}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
