import React, { useState } from "react";
import type { AnalysisEntry } from "./hooks/useAnalysisHistory";

interface HistorySidebarProps {
  entries: AnalysisEntry[];
  onSelect: (entry: AnalysisEntry) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  entries,
  onSelect,
  onDelete,
  onClear,
  isOpen,
  onToggle,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Toggle button — always visible */}
      <button
        className="history-toggle-btn"
        onClick={onToggle}
        aria-label={isOpen ? "Close history" : "Open history"}
        title={isOpen ? "Close history" : "View history"}
      >
        {isOpen ? "✕" : "📋"}
        {!isOpen && entries.length > 0 && (
          <span className="history-badge">{entries.length}</span>
        )}
      </button>

      {/* Sidebar panel */}
      <div className={`history-sidebar ${isOpen ? "history-sidebar--open" : ""}`}>
        <div className="history-sidebar-header">
          <h3>📚 History</h3>
          {entries.length > 0 && (
            <button
              className="history-clear-btn"
              onClick={() => {
                if (confirmClear) {
                  onClear();
                  setConfirmClear(false);
                } else {
                  setConfirmClear(true);
                  setTimeout(() => setConfirmClear(false), 2500);
                }
              }}
            >
              {confirmClear ? "Confirm?" : "Clear All"}
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <p className="history-empty">No past analyses yet.</p>
        ) : (
          <ul className="history-list">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="history-item"
                onClick={() => onSelect(entry)}
              >
                <div className="history-item-top">
                  <span className="history-item-score">{entry.score}%</span>
                  <button
                    className="history-item-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(entry.id);
                    }}
                    title="Delete entry"
                  >
                    🗑️
                  </button>
                </div>
                <div className="history-item-role">{entry.targetRole}</div>
                <div className="history-item-file">{entry.fileName}</div>
                <div className="history-item-time">{formatDate(entry.timestamp)}</div>
                <div className="history-item-skills">
                  {entry.skills.slice(0, 4).join(" · ")}
                  {entry.skills.length > 4 && ` +${entry.skills.length - 4} more`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};