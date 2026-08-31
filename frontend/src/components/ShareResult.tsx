import React, { useCallback, useEffect, useState } from 'react'
import { Share2, Check, Copy, Link2Off, RefreshCw, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
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
  /**
   * Present whether or not the badge is enabled.
   *
   * Unlike a revoked share link, a disabled badge keeps its URL and starts
   * working again the moment it is switched back on — it is paused, not dead.
   * Rotating is what invalidates a badge URL, and rotating returns the new one.
   */
  badge_url: string
  markdown: string
  updated_at: string | null
}

export const ShareResult: React.FC<ShareResultProps> = ({ analysisId }) => {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [lifetimeDays, setLifetimeDays] = useState(DEFAULT_LIFETIME_DAYS)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [badge, setBadge] = useState<BadgeState | null>(null)
  const [badgeCopied, setBadgeCopied] = useState<'url' | 'markdown' | null>(null)
  const [badgeBusy, setBadgeBusy] = useState(false)
  const [badgeError, setBadgeError] = useState('')

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

  /**
   * Send a badge change and adopt whatever the server says the state now is.
   *
   * The response is the source of truth rather than an optimistic local flip:
   * rotating changes `badge_id`, `badge_url` and `markdown` together, and
   * guessing the new UUID client-side is not a thing that can be done.
   */
  const runBadge = useCallback(async (body: Record<string, boolean> | null) => {
    setBadgeBusy(true)
    setBadgeError('')
    try {
      const res =
        body === null
          ? await api.delete<BadgeState>('/api/badge/')
          : await api.post<BadgeState>('/api/badge/', body)
      setBadge(res.data)
    } catch {
      setBadgeError('Could not reach the server. The badge was not changed.')
    } finally {
      setBadgeBusy(false)
    }
  }, [])

  const handleBadgePublish = () => runBadge({ enabled: true })
  const handleBadgeRotate = () => runBadge({ rotate: true })
  const handleBadgeUnpublish = () => runBadge(null)

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

          <div className="share-qr-code" role="img" aria-label="QR code for this analysis">
            <QRCodeSVG value={state.share_url} size={144} includeMargin />
            <span>Scan to open this shared analysis</span>
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
        <div className="share-badge-panel mt-4">
          <div className="share-badge-title">
            <span aria-hidden="true">🏅</span>
            <strong>Latest ATS Score Badge</strong>
            <span className={`share-badge-status${badge.enabled ? '' : ' is-off'}`} role="status">
              {badge.enabled ? 'Public' : 'Not published'}
            </span>
          </div>

          {badge.enabled ? (
            <>
              <p className="share-help-text share-badge-blurb">
                Embed this badge in your GitHub README, portfolio, or personal website. It keeps the
                same URL and refreshes to your latest ATS score — including scores from analyses you
                have not run yet.
              </p>

              <div className="share-badge-preview">
                <img src={badge.badge_url} alt="Latest ATS score badge" />
              </div>

              <div className="share-input-group share-badge-row">
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

              <div className="share-actions">
                <button
                  className="share-secondary-btn"
                  onClick={handleBadgeRotate}
                  disabled={badgeBusy}
                >
                  <RefreshCw size={13} /> New badge URL
                </button>
                <button
                  className="share-danger-btn"
                  onClick={handleBadgeUnpublish}
                  disabled={badgeBusy}
                >
                  <EyeOff size={13} /> Stop publishing
                </button>
              </div>

              <p className="share-help-text">
                <strong>New badge URL</strong> stops every copy of the current one from working, so
                anywhere you have already embedded it will show a broken image until you replace it.
              </p>
            </>
          ) : (
            <>
              <p className="share-help-text share-badge-blurb">
                Your badge is not published. Nobody can load it, and the URL below stays reserved
                for you — publishing again brings the same address back to life.
              </p>

              <div className="share-actions">
                <button
                  className="share-copy-btn"
                  onClick={handleBadgePublish}
                  disabled={badgeBusy}
                >
                  <Eye size={14} /> Publish badge
                </button>
              </div>

              <p className="share-help-text">
                A published badge is readable by anyone who has the URL, with no sign-in. It shows
                your most recent ATS score and nothing else — no file name, no skills, no resume
                text.
              </p>
            </>
          )}

          {badgeError && (
            <p className="share-error-text" role="alert">
              {badgeError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
