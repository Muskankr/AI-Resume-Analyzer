import React, { useState, useEffect } from "react";
import type { AnalysisEntry } from "./hooks/useAnalysisHistory";

const PAGE_SIZE = 10;

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
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleCount(PAGE_SIZE);
  }, [entries]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + PAGE_SIZE);
      setIsLoadingMore(false);
    }, 300);
  };

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
          <>
            <ul className="history-list">
              {entries.slice(0, visibleCount).map((entry) => (
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
            {visibleCount < entries.length && (
              <div className="history-load-more-container" style={{ textAlign: "center", margin: "1rem 0" }}>
                <button
                  className="app-btn"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  style={{ fontSize: "0.9rem", padding: "0.4rem 0.8rem", opacity: isLoadingMore ? 0.7 : 1 }}
                >
                  {isLoadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};