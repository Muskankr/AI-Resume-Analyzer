import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { SuggestionCard } from "./SuggestionCard";

interface SuggestionsSectionProps {
  suggestions: string[];
  addressedSuggestions: number[];
  theme: "light" | "dark";
  onToggleSuggestion: (index: number) => void;
  onResetAnalysis: () => void;
  exportJSON: () => void;
  exportCSV: () => void;
}

export const SuggestionsSection: React.FC<SuggestionsSectionProps> = ({
  suggestions,
  addressedSuggestions,
  theme,
  onToggleSuggestion,
  onResetAnalysis,
  exportJSON,
  exportCSV,
}) => {
  const [copied, setCopied] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

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

  const completionPercentage = suggestions.length
    ? Math.round((addressedSuggestions.length / suggestions.length) * 100)
    : 0;

  return (
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
                    onClick={() => {
                      exportJSON();
                      setShowExportDropdown(false);
                    }}
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
                    onClick={() => {
                      exportCSV();
                      setShowExportDropdown(false);
                    }}
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
                onToggle={onToggleSuggestion}
              />
            ))}
          </div>
        )}

        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <button
            type="button"
            className="app-btn app-btn--secondary"
            onClick={onResetAnalysis}
            style={{ minHeight: "44px", width: "100%", maxWidth: "250px" }}
          >
            <RefreshCw size={15} /> Start New Analysis
          </button>
        </div>
      </div>
    </div>
  );
};