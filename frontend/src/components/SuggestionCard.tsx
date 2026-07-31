import React, { useState } from "react";
import { CheckCircle, Square } from "lucide-react";

interface SuggestionCardProps {
  text: string;
  index: number;
  isAddressed: boolean;
  onToggle: (index: number) => void;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  text,
  index,
  isAddressed,
  onToggle,
}) => {
  const [copied, setCopied] = useState(false);

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
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
        </div>
        <p
          style={{
            margin: 0,
            fontSize: "var(--font-size-sm)",
            color: isAddressed ? "#94a3b8" : "#e2e8f0",
            lineHeight: "1.6",
            textDecoration: isAddressed ? "line-through" : "none",
          }}
        >
          {text}
        </p>
      </div>

      <button
        onClick={handleCopy}
        className="suggestion-copy-btn"
        aria-label="Copy recommendation text"
        style={{ alignSelf: "flex-start" }}
      >
        {copied ? "✅ Copied" : "📋 Copy Text"}
      </button>
    </div>
  );
};