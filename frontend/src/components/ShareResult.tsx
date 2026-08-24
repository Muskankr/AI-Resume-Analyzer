import React, { useCallback, useEffect, useState } from 'react'
import { Share2, Check, Copy, Link2Off, RefreshCw, ShieldCheck, Eye } from 'lucide-react'
import { api } from '../api/client'
import {
  DEFAULT_LIFETIME_DAYS,
  LIFETIME_CHOICES,
  formatExpiry,
  type ShareState,
} from '../utils/shareLink'
import './ShareResult.css'

interface ShareResultProps {
  /** Primary key of the analysis. Null while no saved analysis is on screen. */
  analysisId: number | null
}

interface Loaded {
  forId: number
  data: ShareState
}

interface BadgeState {
  badge_id: string
  enabled: boolean
  badge_url: string
  markdown: string
}

export const ShareResult: React.FC<ShareResultProps> = ({ analysisId }) => {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [lifetimeDays, setLifetimeDays] = useState(DEFAULT_LIFETIME_DAYS)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [badge, setBadge] = useState<BadgeState | null>(null)
  const [badgeCopied, setBadgeCopied] = useState<'url' | 'markdown' | null>(null)

  const endpoint = analysisId === null ? null : `/api/history/${analysisId}/share/`

  useEffect(() => {
    if (analysisId === null || !endpoint) return

    let current = true

    api
      .get<ShareState>(endpoint)
      .then((res) => {
        if (current) setLoaded({ forId: analysisId, data: res.data })
      })
      .catch(() => {})

    return () => {
      current = false
    }
  }, [analysisId, endpoint])

  useEffect(() => {
    if (analysisId === null) {
      setBadge(null)
      return
    }

    let current = true
    api
      .get<BadgeState>('/api/badge/')
      .then((res) => {
        if (current) setBadge(res.data)
      })
      .catch(() => {
        if (current) setBadge(null)
      })

    return () => {
      current = false
    }
  }, [analysisId])

  const run = useCallback(
    async (request: () => Promise<{ data: ShareState }>) => {
      if (analysisId === null) return
      setBusy(true)
      setError('')
      try {
        const res = await request()
        setLoaded({ forId: analysisId, data: res.data })
      } catch {
        setError('Could not reach the server. Nothing was changed.')
      } finally {
        setBusy(false)
      }
    },
    [analysisId]
  )

  const state = loaded && loaded.forId === analysisId ? loaded.data : null

  const handleEnable = () =>
    endpoint && run(() => api.post<ShareState>(endpoint, { lifetime_days: lifetimeDays }))

  const handleRotate = () =>
    endpoint &&
    run(() => api.post<ShareState>(endpoint, { lifetime_days: lifetimeDays, rotate: true }))

  const handleRevoke = () => endpoint && run(() => api.delete<ShareState>(endpoint))

  const copyBadge = async (kind: 'url' | 'markdown') => {
    if (!badge) return
    const value = kind === 'url' ? badge.badge_url : badge.markdown
    try {
      await navigator.clipboard?.writeText(value)
      setBadgeCopied(kind)
      window.setTimeout(() => setBadgeCopied(null), 2000)
    } catch {
      // Clipboard access can be denied by browser permissions; the value remains selectable.
    }
  }

  const handleCopy = () => {
    if (!state?.share_url) return
    navigator.clipboard?.writeText(state.share_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (analysisId === null || !state) return null

  return (
    <div className="share-result-container mt-4">
      <div className="share-header">
        <Share2 size={16} />
        <span>Share this analysis</span>
      </div>

      {state.is_live && state.share_url ? (
        <>
          <div className="share-input-group">
            <input
              type="text"
              value={state.share_url}
              readOnly
              className="share-url-input"
              aria-label="Public link to this analysis"
            />
            <button className="share-copy-btn" onClick={handleCopy} disabled={busy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>

          <div className="share-meta">
            <span className="share-meta-item">
              <ShieldCheck size={13} /> {formatExpiry(state.share_expires_at)}
            </span>
            <span className="share-meta-item">
              <Eye size={13} /> {state.share_view_count}{' '}
              {state.share_view_count === 1 ? 'view' : 'views'}
            </span>
          </div>

          <div className="share-actions">
            <button className="share-secondary-btn" onClick={handleRotate} disabled={busy}>
              <RefreshCw size={13} /> New link
            </button>
            <button className="share-danger-btn" onClick={handleRevoke} disabled={busy}>
              <Link2Off size={13} /> Stop sharing
            </button>
          </div>

          <p className="share-help-text">
            The page behind this link shows your score, target role and skill lists. It never
            includes your resume text, your cover letter or the original filename.
            <strong> New link</strong> stops every copy of the current one from working.
          </p>
        </>
      ) : (
        <>
          <div className="share-actions">
            <label className="share-lifetime-label" htmlFor="share-lifetime">
              Link lasts
            </label>
            <select
              id="share-lifetime"
              className="share-lifetime-select"
              value={lifetimeDays}
              onChange={(event) => setLifetimeDays(Number(event.target.value))}
              disabled={busy}
            >
              {LIFETIME_CHOICES.map((choice) => (
                <option key={choice.days} value={choice.days}>
                  {choice.label}
                </option>
              ))}
            </select>
            <button className="share-copy-btn" onClick={handleEnable} disabled={busy}>
              <Share2 size={14} /> Create link
            </button>
          </div>

          <p className="share-help-text">
            This analysis is private. Creating a link publishes a read-only page with your score and
            skill lists — never your resume text — and you can stop sharing at any time.
          </p>
        </>
      )}

      {state.lifetime_clamped_to_days !== undefined && (
        <p className="share-help-text" role="status">
          Links can last at most {state.lifetime_clamped_to_days} days, so that is what was set.
        </p>
      )}

      {error && (
        <p className="share-error-text" role="alert">
          {error}
        </p>
      )}

      {badge && (
        <div
          className="mt-4"
          style={{
            padding: '16px',
            border: '1px solid var(--surface-border, rgba(255,255,255,0.12))',
            borderRadius: '12px',
            background: 'var(--surface-soft-bg, rgba(255,255,255,0.03))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span aria-hidden="true">🏅</span>
            <strong>Latest ATS Score Badge</strong>
          </div>
          <p className="share-help-text" style={{ marginBottom: '12px' }}>
            Embed this badge in your GitHub README, portfolio, or personal website. It keeps the same URL and refreshes to your latest ATS score.
          </p>

          <div style={{ marginBottom: '12px' }}>
            <img src={badge.badge_url} alt="Latest ATS score badge" style={{ verticalAlign: 'middle' }} />
          </div>

          <div className="share-input-group" style={{ marginBottom: '8px' }}>
            <input
              type="text"
              value={badge.badge_url}
              readOnly
              className="share-url-input"
              aria-label="ATS score badge URL"
            />
            <button className="share-copy-btn" onClick={() => copyBadge('url')}>
              {badgeCopied === 'url' ? <Check size={14} /> : <Copy size={14} />}
              {badgeCopied === 'url' ? 'Copied' : 'Copy URL'}
            </button>
          </div>

          <div className="share-input-group">
            <input
              type="text"
              value={badge.markdown}
              readOnly
              className="share-url-input"
              aria-label="ATS score badge Markdown"
            />
            <button className="share-copy-btn" onClick={() => copyBadge('markdown')}>
              {badgeCopied === 'markdown' ? <Check size={14} /> : <Copy size={14} />}
              {badgeCopied === 'markdown' ? 'Copied' : 'Copy Markdown'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
