import React, { useState, useEffect } from 'react'
import { X, ClipboardList, BookOpen, Trash2, GitCompare, Archive, Check } from 'lucide-react'
import type { AnalysisEntry } from './hooks/useAnalysisHistory'
import { ScoreHistoryChart } from './components/ScoreHistoryChart'
import { downloadBulkReportsZip, type BulkReportItem } from './utils/exportZipReports'
const PAGE_SIZE = 10

type SortMode = "recent" | "most-matched" | "most-missing";

interface HistorySidebarProps {
  entries: AnalysisEntry[]
  unreadCount?: number
  lastViewedTimestamp?: number
  onMarkAllAsViewed?: () => void
  activeFileName?: string
  onSelect: (entry: AnalysisEntry) => void
  onDelete: (id: string) => void
  onClear: () => void
  isOpen: boolean
  onToggle: () => void
  onCompare?: () => void
  /** True when the server has older analyses that have not been fetched yet. */
  hasMoreOnServer?: boolean
  /** Fetches the next page from the server; resolves once entries are appended. */
  onLoadMoreFromServer?: () => Promise<void> | void
}

const SORT_MODE_STORAGE_KEY = "history_sort_mode";

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  entries,
  unreadCount = 0,
  lastViewedTimestamp = 0,
  onMarkAllAsViewed,
  activeFileName,
  onSelect,
  onDelete,
  onClear,
  isOpen,
  onToggle,
  onCompare,
  hasMoreOnServer = false,
  onLoadMoreFromServer,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    try {
      const saved = localStorage.getItem(SORT_MODE_STORAGE_KEY);
      if (saved === "recent" || saved === "most-matched" || saved === "most-missing") {
        return saved;
      }
    } catch {
      // localStorage may be unavailable
    }
    return "recent";
  });

  const handleDownloadHistoryZip = async () => {
    if (entries.length === 0) return
    setDownloadingZip(true)
    try {
      const reports: BulkReportItem[] = entries.map((e) => ({
        id: e.id,
        fileName: e.fileName,
        targetRole: e.targetRole,
        score: e.score,
        matchedSkills: e.matchedSkills,
        missingSkills: e.missingSkills,
        suggestions: e.suggestions,
        timestamp: e.timestamp,
      }))
      await downloadBulkReportsZip(reports, 'resume-analysis-history.zip')
    } catch (err) {
      console.error('Failed to export history ZIP:', err)
    } finally {
      setDownloadingZip(false)
    }
  }

  // Persist sort mode to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SORT_MODE_STORAGE_KEY, sortMode);
    } catch {
      // localStorage may be unavailable
    }
  }, [sortMode]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleCount(PAGE_SIZE)
  }, [entries])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onToggle()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onToggle])

  const handleToggleClick = () => {
    onToggle()
  }

  const handleLoadMore = async () => {
    // Reveal what has already been fetched first; only go back to the server
    // once every locally held entry is on screen.
    if (visibleCount < entries.length) {
      setIsLoadingMore(true)
      setTimeout(() => {
        setVisibleCount((prev) => prev + PAGE_SIZE)
        setIsLoadingMore(false)
      }, 300)
      return
    }

    if (!onLoadMoreFromServer) return

    setIsLoadingMore(true)
    try {
      await onLoadMoreFromServer()
      setVisibleCount((prev) => prev + PAGE_SIZE)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const toggleTitle = isOpen
    ? 'Close Notifications & History'
    : unreadCount > 0
      ? `Notifications & Analysis History (${unreadCount} unread)`
      : 'Notifications & Analysis History'

  const toggleAriaLabel = isOpen
    ? 'Close notifications and history'
    : unreadCount > 0
      ? `Notifications and analysis history, ${unreadCount} unread`
      : 'Notifications and analysis history'

  // Sort entries based on current sort mode
  const sortedEntries = React.useMemo(() => {
    const entriesCopy = [...entries];
    switch (sortMode) {
      case "most-matched":
        return entriesCopy.sort((a, b) => b.matchedSkills.length - a.matchedSkills.length);
      case "most-missing":
        return entriesCopy.sort((a, b) => b.missingSkills.length - a.missingSkills.length);
      case "recent":
      default:
        return entriesCopy.sort((a, b) => b.timestamp - a.timestamp);
    }
  }, [entries, sortMode]);

  return (
    <>
      {/* Toggle button — always visible */}
      <button
        className="fab-btn history-toggle-btn"
        onClick={handleToggleClick}
        aria-label={toggleAriaLabel}
        aria-expanded={isOpen}
        title={toggleTitle}
      >
        {isOpen ? <X size={20} /> : <ClipboardList size={20} />}
        {!isOpen && unreadCount > 0 && (
          <span
            className="history-badge"
            title={`${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Sidebar panel */}
      <aside
        className={`history-sidebar ${isOpen ? 'history-sidebar--open' : ''}`}
        aria-hidden={!isOpen}
        aria-label="Notifications and Analysis History"
      >
        <div className="history-sidebar-header">
          <h3>
            <BookOpen size={18} /> Notifications & History
          </h3>
          <div className="history-header-actions">
            {entries.length > 0 && (
              <button
                className="history-compare-btn"
                onClick={handleDownloadHistoryZip}
                disabled={downloadingZip}
                title="Download all history reports as ZIP"
                style={{ background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)' }}
              >
                <Archive size={14} /> ZIP
              </button>
            )}
            {onCompare && entries.length > 1 && (
              <button
                className="history-compare-btn"
                onClick={onCompare}
                title="Compare two resume versions"
              >
                <GitCompare size={14} /> Compare
              </button>
            )}
            {unreadCount > 0 && onMarkAllAsViewed && (
              <button
                className="history-compare-btn"
                onClick={onMarkAllAsViewed}
                title="Mark all as read"
                // The visible label is abbreviated to fit the toolbar, so the
                // accessible name came out as "Mark Read" — `title` does not
                // provide one when the button already has text content. Spell
                // it out for screen readers.
                aria-label="Mark all as read"
              >
                <Check size={14} /> Mark Read
              </button>
            )}
            {entries.length > 0 && (
              <button
                className="history-clear-btn"
                onClick={() => {
                  if (confirmClear) {
                    onClear()
                    setConfirmClear(false)
                  } else {
                    setConfirmClear(true)
                    setTimeout(() => setConfirmClear(false), 2500)
                  }
                }}
              >
                {confirmClear ? 'Confirm?' : 'Clear All'}
              </button>
            )}
          </div>
        </div>

        {/* Sort mode toggle */}
        {entries.length > 0 && (
          <div className="history-sort-controls">
            <button
              className={`history-sort-btn ${sortMode === "recent" ? "history-sort-btn--active" : ""}`}
              onClick={() => setSortMode("recent")}
              title="Sort by most recent"
            >
              Recent
            </button>
            <button
              className={`history-sort-btn ${sortMode === "most-matched" ? "history-sort-btn--active" : ""}`}
              onClick={() => setSortMode("most-matched")}
              title="Sort by most matched skills"
            >
              Most Matched
            </button>
            <button
              className={`history-sort-btn ${sortMode === "most-missing" ? "history-sort-btn--active" : ""}`}
              onClick={() => setSortMode("most-missing")}
              title="Sort by most missing skills"
            >
              Most Missing
            </button>
          </div>
        )}

        {entries.length === 0 ? (
          <div className="history-empty">
            <ClipboardList size={32} style={{ marginBottom: '12px', opacity: 0.45 }} />
            <p style={{ margin: '0 0 6px', fontWeight: 600, opacity: 0.75 }}>No analyses yet</p>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', opacity: 0.5 }}>
              Upload a resume to see your history here.
            </p>
          </div>
        ) : (
          <>
            <ScoreHistoryChart entries={entries} />
            <ul className="history-list">
              {sortedEntries.slice(0, visibleCount).map((entry) => {
                const isNew = entry.timestamp > lastViewedTimestamp
                return (
                  <li
                    key={entry.id}
                    role="button"
                    tabIndex={0}
                    aria-current={activeFileName === entry.fileName ? 'true' : undefined}
                    className={`history-item ${activeFileName === entry.fileName ? 'history-item--active' : ''}`}
                    onClick={() => onSelect(entry)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelect(entry)
                      }
                    }}
                  >
                    <div className="history-item-top">
                      <div className="history-item-badges">
                        <span className="history-item-score">{entry.score}%</span>
                        {isNew && <span className="history-item-new-badge">NEW</span>}
                      </div>
                      <button
                        className="history-item-delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(entry.id)
                        }}
                        aria-label="Delete analysis notification"
                        title="Delete notification entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="history-item-role">
                      {entry.targetRole}{entry.experienceLevel ? ` • ${entry.experienceLevel}` : ''}
                    </div>
                    <div className="history-item-file">{entry.fileName}</div>
                    <div className="history-item-time">{formatDate(entry.timestamp)}</div>
                    <div className="history-item-skills">
                      {entry.skills.slice(0, 4).join(' · ')}
                      {entry.skills.length > 4 && ` +${entry.skills.length - 4} more`}
                    </div>
                  </li>
                )
              })}
            </ul>
            {(visibleCount < entries.length || hasMoreOnServer) && (
              <div
                className="history-load-more-container"
                style={{ textAlign: 'center', margin: '1rem 0' }}
              >
                <button
                  className="app-btn"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  style={{
                    fontSize: '0.9rem',
                    padding: '0.4rem 0.8rem',
                    opacity: isLoadingMore ? 0.7 : 1,
                  }}
                >
                  {isLoadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </aside>
    </>
  )
}
