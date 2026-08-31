import React, { useState, useEffect, useRef } from 'react'
import { getContributorCertificate, type ContributorCertificateResponse } from '../services/contributorService'
import { useAuth } from '../hooks/useAuth'
import './ContributorCertificate.css'

export const ContributorCertificate: React.FC = () => {
  const { user } = useAuth()
  const [usernameInput, setUsernameInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [certificate, setCertificate] = useState<ContributorCertificateResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const certRef = useRef<HTMLDivElement>(null)

  // Default to logged-in username if available
  useEffect(() => {
    if (user?.username && !usernameInput && !certificate) {
      setUsernameInput(user.username)
    }
  }, [user])

  const handleFetchCertificate = async (e?: React.FormEvent, targetUser?: string) => {
    if (e) e.preventDefault()
    const userToQuery = (targetUser || usernameInput).trim()

    if (!userToQuery) {
      setError('Please enter a GitHub username.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await getContributorCertificate(userToQuery)
      setCertificate(data)
    } catch (err: any) {
      setCertificate(null)
      setError(
        err.response?.data?.error ||
        'Unable to generate certificate. Please ensure the username has merged pull requests in this repository.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadImage = () => {
    if (!certificate) return

    const canvas = document.createElement('canvas')
    const width = 1200
    const height = 800
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 1. Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height)
    bgGrad.addColorStop(0, '#0f172a')
    bgGrad.addColorStop(0.5, '#1e1b4b')
    bgGrad.addColorStop(1, '#0f172a')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, width, height)

    // 2. Outer Ornate Gold Border
    ctx.strokeStyle = '#d97706'
    ctx.lineWidth = 12
    ctx.strokeRect(30, 30, width - 60, height - 60)

    // Inner Fine Gold Border
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 2
    ctx.strokeRect(46, 46, width - 92, height - 92)

    // Corner decorative markers
    const corners = [
      [52, 52],
      [width - 52, 52],
      [52, height - 52],
      [width - 52, height - 52],
    ]
    ctx.fillStyle = '#fbbf24'
    corners.forEach(([cx, cy]) => {
      ctx.beginPath()
      ctx.arc(cx, cy, 6, 0, Math.PI * 2)
      ctx.fill()
    })

    // 3. Header Ribbon / Subtitle
    ctx.textAlign = 'center'
    ctx.fillStyle = '#94a3b8'
    ctx.font = '600 16px sans-serif'
    ctx.letterSpacing = '4px'
    ctx.fillText('AI RESUME ANALYZER • OPEN SOURCE COMMUNITY', width / 2, 120)

    // 4. Main Certificate Title
    ctx.fillStyle = '#fef08a'
    ctx.font = 'bold 44px Georgia, serif'
    ctx.letterSpacing = '3px'
    ctx.fillText('CERTIFICATE OF CONTRIBUTION', width / 2, 180)

    // 5. "Proudly Presented To"
    ctx.fillStyle = '#cbd5e1'
    ctx.font = 'italic 20px Georgia, serif'
    ctx.letterSpacing = '0px'
    ctx.fillText('This certificate is proudly awarded to', width / 2, 235)

    // 6. Contributor Name
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 46px Georgia, serif'
    const displayName = certificate.contributor.name || certificate.contributor.username
    ctx.fillText(displayName, width / 2, 305)

    // Contributor Handle
    ctx.fillStyle = '#38bdf8'
    ctx.font = '600 20px sans-serif'
    ctx.fillText(`@${certificate.contributor.username}`, width / 2, 345)

    // 7. Body Text Citation
    ctx.fillStyle = '#e2e8f0'
    ctx.font = '18px sans-serif'
    const line1 = `In sincere recognition of valuable engineering contributions to the AI Resume Analyzer repository,`
    const line2 = `having successfully authored and merged ${certificate.statistics.merged_prs_count} Pull Request${certificate.statistics.merged_prs_count > 1 ? 's' : ''} to enhance code quality and user experience.`
    ctx.fillText(line1, width / 2, 420)
    ctx.fillText(line2, width / 2, 450)

    // 8. Tier Badge Box
    const badgeText = `${certificate.statistics.tier_badge} ${certificate.statistics.tier}`
    ctx.fillStyle = 'rgba(245, 158, 11, 0.15)'
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 1.5
    const badgeW = 340
    const badgeH = 44
    const badgeX = width / 2 - badgeW / 2
    const badgeY = 500
    ctx.beginPath()
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 22)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#fbbf24'
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText(badgeText.toUpperCase(), width / 2, badgeY + 28)

    // 9. Footer Details (Left: Issue Date, Center: Verification ID, Right: Signature)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(80, 640)
    ctx.lineTo(width - 80, 640)
    ctx.stroke()

    // Date
    ctx.textAlign = 'left'
    ctx.fillStyle = '#94a3b8'
    ctx.font = '13px sans-serif'
    ctx.fillText('DATE OF ISSUANCE', 100, 675)
    ctx.fillStyle = '#f8fafc'
    ctx.font = 'bold 16px sans-serif'
    ctx.fillText(certificate.issued_date, 100, 700)

    // Verification ID
    ctx.textAlign = 'center'
    ctx.fillStyle = '#94a3b8'
    ctx.font = '13px sans-serif'
    ctx.fillText('VERIFICATION ID', width / 2, 675)
    ctx.fillStyle = '#38bdf8'
    ctx.font = 'bold 16px monospace'
    ctx.fillText(certificate.certificate_id, width / 2, 700)

    // Signatory
    ctx.textAlign = 'right'
    ctx.fillStyle = '#94a3b8'
    ctx.font = '13px sans-serif'
    ctx.fillText('AI RESUME ANALYZER', width - 100, 675)
    ctx.fillStyle = '#fef08a'
    ctx.font = 'italic bold 17px Georgia, serif'
    ctx.fillText('Core Maintainers', width - 100, 700)

    // Trigger download
    const link = document.createElement('a')
    link.download = `AI-Resume-Analyzer-Certificate-${certificate.contributor.username}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handlePrint = () => {
    window.print()
  }

  const handleCopyShareText = () => {
    if (!certificate) return
    const text = `🎖️ I'm proud to have contributed to AI Resume Analyzer (${certificate.project.repo_url}) with ${certificate.statistics.merged_prs_count} merged Pull Request(s)! Certificate Verification ID: ${certificate.certificate_id}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="cert-container animate-fade-in">
      <header className="cert-hero">
        <h1>🎖️ Contributor Certificate Generator</h1>
        <p>
          Generate and download an official certificate documenting your merged pull requests and open-source contributions to AI Resume Analyzer.
        </p>
      </header>

      {/* Lookup Card */}
      <div className="cert-search-card">
        <form onSubmit={handleFetchCertificate} className="cert-search-form">
          <div className="cert-input-wrapper">
            <span className="cert-input-icon">👤</span>
            <input
              type="text"
              className="cert-search-input"
              placeholder="Enter GitHub username (e.g. Muskankr)"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              aria-label="GitHub Username"
            />
          </div>
          <button
            type="submit"
            className="cert-btn cert-btn--primary"
            disabled={loading || !usernameInput.trim()}
          >
            {loading ? 'Verifying GitHub PRs...' : '🔍 Generate Certificate'}
          </button>
        </form>

        {error && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--color-danger, #ef4444)',
              color: 'var(--color-danger, #ef4444)',
              fontSize: '0.9rem',
            }}
          >
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Certificate Showcase */}
      {certificate && (
        <div className="cert-display-wrapper">
          {/* Action Bar */}
          <div className="cert-actions-bar">
            <div>
              <span style={{ fontWeight: 700, color: '#f8fafc' }}>
                Official Verification: {certificate.certificate_id}
              </span>
            </div>
            <div className="cert-actions-group">
              <button
                type="button"
                className="cert-btn cert-btn--primary"
                onClick={handleDownloadImage}
                title="Download high-resolution image"
              >
                🖼️ Download PNG
              </button>
              <button
                type="button"
                className="cert-btn cert-btn--secondary"
                onClick={handlePrint}
                title="Print or Save as PDF"
              >
                🖨️ Print / PDF
              </button>
              <button
                type="button"
                className="cert-btn cert-btn--secondary"
                onClick={handleCopyShareText}
                title="Copy LinkedIn summary"
              >
                {copied ? '✅ Copied!' : '📋 Copy for LinkedIn'}
              </button>
            </div>
          </div>

          {/* Rendered Certificate */}
          <div className="certificate-frame" ref={certRef}>
            <div className="cert-corner cert-corner-tl" />
            <div className="cert-corner cert-corner-tr" />
            <div className="cert-corner cert-corner-bl" />
            <div className="cert-corner cert-corner-br" />
            <div className="cert-watermark">AI RESUME ANALYZER</div>

            <div className="cert-badge-ribbon">
              {certificate.statistics.tier_badge} {certificate.statistics.tier}
            </div>

            <h2 className="cert-main-title">Certificate of Contribution</h2>
            <p className="cert-sub-title">This certificate is proudly awarded to</p>

            <div className="cert-recipient-section">
              <img
                src={certificate.contributor.avatar_url}
                alt={certificate.contributor.name}
                className="cert-avatar"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(certificate.contributor.name)}&background=3b82f6&color=fff`
                }}
              />
              <div className="cert-recipient-name">
                {certificate.contributor.name || certificate.contributor.username}
              </div>
              <div className="cert-recipient-handle">
                @{certificate.contributor.username}
              </div>
            </div>

            <p className="cert-body-text">
              In sincere appreciation for outstanding open-source contributions to the{' '}
              <span className="cert-highlight">{certificate.project.name}</span> project, having successfully authored and merged{' '}
              <span className="cert-highlight">
                {certificate.statistics.merged_prs_count} Pull Request{certificate.statistics.merged_prs_count > 1 ? 's' : ''}
              </span>{' '}
              to advance automated resume optimization and career tooling.
            </p>

            <div className="cert-stats-pills">
              <div className="cert-pill">
                <span className="cert-pill-val">{certificate.statistics.merged_prs_count}</span>
                <span className="cert-pill-lbl">Merged PRs</span>
              </div>
              <div className="cert-pill">
                <span className="cert-pill-val">{certificate.statistics.first_contribution_date}</span>
                <span className="cert-pill-lbl">First Contributed</span>
              </div>
              <div className="cert-pill">
                <span className="cert-pill-val">{certificate.statistics.latest_contribution_date}</span>
                <span className="cert-pill-lbl">Latest Activity</span>
              </div>
            </div>

            <div className="cert-footer-row">
              <div className="cert-meta-item">
                <span className="cert-meta-lbl">Date of Issuance</span>
                <span className="cert-meta-val">{certificate.issued_date}</span>
              </div>
              <div className="cert-seal">
                <span>Verified</span>
                <span>Contributor</span>
                <span>⭐</span>
              </div>
              <div className="cert-meta-item" style={{ textAlign: 'right' }}>
                <span className="cert-meta-lbl">Verification ID</span>
                <span className="cert-meta-val" style={{ fontFamily: 'monospace', color: '#38bdf8' }}>
                  {certificate.certificate_id}
                </span>
              </div>
            </div>
          </div>

          {/* PR Details Section */}
          <div className="cert-prs-card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', color: '#f8fafc' }}>
              📦 Merged Contributions ({certificate.pull_requests.length})
            </h3>
            {certificate.pull_requests.map((pr) => (
              <div key={pr.number} className="cert-pr-item">
                <div>
                  <a
                    href={pr.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cert-pr-link"
                  >
                    #{pr.number}: {pr.title}
                  </a>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', flexShrink: 0 }}>
                  Merged on {pr.closed_at ? pr.closed_at.slice(0, 10) : pr.created_at.slice(0, 10)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ContributorCertificate
