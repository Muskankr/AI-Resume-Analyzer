import React, { useState, useEffect } from 'react'
import { X, ClipboardList, BookOpen, Trash2, GitCompare, Tag, Plus, Edit2, Check } from 'lucide-react'
import type { AnalysisEntry } from './hooks/useAnalysisHistory'
const PAGE_SIZE = 10

interface HistorySidebarProps {
  entries: AnalysisEntry[]
  allEntriesCount?: number
  availableTags?: string[]
  activeTag?: string | null
  onSelectTag?: (tag: string | null) => void
  unreadCount?: number
  lastViewedTimestamp?: number
  onMarkAllAsViewed?: () => void
  activeFileName?: string
  onSelect: (entry: AnalysisEntry) => void
  onDelete: (id: string) => void
  onUpdateTag?: (id: string, tag: string) => void
  onClear: () => void
  isOpen: boolean
  onToggle: () => void
  onCompare?: () => void
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  entries,
  allEntriesCount,
  availableTags = [],
  activeTag = null,
  onSelectTag,
  unreadCount = 0,
  lastViewedTimestamp = 0,
  onMarkAllAsViewed,
  activeFileName,
  onSelect,
  onDelete,
  onUpdateTag,
  onClear,
  isOpen,
  onToggle,
  onCompare,
}) => {
  const [confirmClear, setConfirmClear] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')

  const totalCount = allEntriesCount ?? entries.length

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleCount(PAGE_SIZE)
  }, [entries])

  useEffect(() => {
    if (isOpen && onMarkAllAsViewed) {
      onMarkAllAsViewed()
    }
  }, [isOpen, onMarkAllAsViewed])

  const handleToggleClick = () => {
    if (!isOpen && onMarkAllAsViewed) {
      onMarkAllAsViewed()
    }
    onToggle()
  }

  const handleLoadMore = () => {
    setIsLoadingMore(true)
    setTimeout(() => {
      setVisibleCount((prev) => prev + PAGE_SIZE)
      setIsLoadingMore(false)
    }, 300)
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

  const handleStartEditing = (e: React.MouseEvent, entry: AnalysisEntry) => {
    e.stopPropagation()
    setEditingId(entry.id)
    setTagInput(entry.tag || '')
  }

  const handleSaveTag = (e: React.SyntheticEvent, id: string) => {
    e.stopPropagation()
    if (onUpdateTag) {
      onUpdateTag(id, tagInput)
    }
    setEditingId(null)
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

  return (
    <>
      {/* Toggle button — always visible */}
      <button
        className="history-toggle-btn"
        onClick={handleToggleClick}
        aria-label={toggleAriaLabel}
        title={toggleTitle}
      >
        {isOpen ? <X size={18} /> : <ClipboardList size={18} />}
        {!isOpen && unreadCount > 0 && (
          <span className="history-badge" title={`${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Sidebar panel */}
      <div
        className={`history-sidebar ${isOpen ? 'history-sidebar--open' : ''}`}
        aria-hidden={!isOpen}
      >
        <div className="history-sidebar-header">
          <h3>
            <BookOpen size={18} /> Notifications & History
          </h3>
          <div className="history-header-actions">
            {onCompare && entries.length > 1 && (
              <button
                className="history-compare-btn"
                onClick={onCompare}
                title="Compare two resume versions"
              >
                <GitCompare size={14} /> Compare
              </button>
            )}
            {totalCount > 0 && (
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

        {/* Tag Filter Bar */}
        {availableTags.length > 0 && onSelectTag && (
          <div className="history-tag-filter-container">
            <span className="history-tag-filter-label">
              <Tag size={12} /> Filter by tag:
            </span>
            <div className="history-tag-filter-pills">
              <button
                className={`history-tag-pill ${activeTag === null ? 'history-tag-pill--active' : ''}`}
                onClick={() => onSelectTag(null)}
              >
                All
              </button>
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  className={`history-tag-pill ${activeTag === tag ? 'history-tag-pill--active' : ''}`}
                  onClick={() => onSelectTag(activeTag === tag ? null : tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {entries.length === 0 ? (
          <p className="history-empty">
            {activeTag ? `No entries tagged with "${activeTag}".` : 'No notifications or past analyses yet.'}
          </p>
        ) : (
          <>
            <ul className="history-list">
              {entries.slice(0, visibleCount).map((entry) => {
                const isNew = entry.timestamp > lastViewedTimestamp;
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
                          e.stopPropagation();
                          onDelete(entry.id);
                        }}
                        aria-label="Delete analysis notification"
                        title="Delete notification entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="history-item-role">{entry.targetRole}</div>
                    <div className="history-item-file">{entry.fileName}</div>

                    {/* Tag Display & Inline Editor */}
                    <div className="history-item-tag-row" onClick={(e) => e.stopPropagation()}>
                      {editingId === entry.id ? (
                        <form
                          className="history-tag-edit-form"
                          onSubmit={(e) => handleSaveTag(e, entry.id)}
                        >
                          <input
                            type="text"
                            className="history-tag-input"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            placeholder="e.g. Applied - Google, Draft"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                          />
                          <button
                            type="submit"
                            className="history-tag-save-btn"
                            title="Save tag"
                            aria-label="Save tag"
                          >
                            <Check size={12} />
                          </button>
                        </form>
                      ) : (
                        <div className="history-tag-display">
                          {entry.tag ? (
                            <span
                              className="history-tag-chip"
                              onClick={(e) => handleStartEditing(e, entry)}
                              title="Click to edit tag"
                            >
                              <Tag size={10} /> {entry.tag}
                              <button
                                type="button"
                                className="history-tag-edit-icon"
                                onClick={(e) => handleStartEditing(e, entry)}
                                aria-label="Edit tag"
                              >
                                <Edit2 size={10} />
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="history-tag-add-btn"
                              onClick={(e) => handleStartEditing(e, entry)}
                            >
                              <Plus size={10} /> Add tag
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="history-item-time">{formatDate(entry.timestamp)}</div>
                    <div className="history-item-skills">
                      {entry.skills.slice(0, 4).join(' · ')}
                      {entry.skills.length > 4 && ` +${entry.skills.length - 4} more`}
                    </div>
                  </li>
                )
              })}
            </ul>
            {visibleCount < entries.length && (
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
      </div>
    </>
  )
}
