import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { formatRelativeTime } from '../utils/formatRelativeTime'
import { buildLeaderboardUrl, describeDenominator, type CountedBy } from '../utils/leaderboardQuery'

interface LeaderboardItem {
  skill: string
  count: number
  percentage: number
}

interface LeaderboardResponse {
  total_analyses: number
  matched_skills: LeaderboardItem[]
  missing_skills: LeaderboardItem[]
  last_updated?: string
  /** Whether the percentages are over analyses or over people. */
  counted_by?: CountedBy
}

interface SkillsLeaderboardProps {
  onBack: () => void
}

export const SkillsLeaderboard: React.FC<SkillsLeaderboardProps> = ({ onBack }) => {
  const [track, setTrack] = useState<string>('')
  const [countedBy, setCountedBy] = useState<CountedBy>('analysis')
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

  useEffect(() => {
    const metaDescription = document.querySelector('meta[name="description"]')
    const ogDescription = document.querySelector('meta[property="og:description"]')
    const twitterDescription = document.querySelector('meta[name="twitter:description"]')

    const originalDesc = metaDescription?.getAttribute('content') || ''
    const originalTitle = document.title

    const newDesc =
      'Explore the AI Resume Analyzer Skills Leaderboard. View aggregated insights on top matched skills and in-demand skill gaps across various career tracks.'
    const newTitle = 'Skills Leaderboard | AI Resume Analyzer'

    if (metaDescription) metaDescription.setAttribute('content', newDesc)
    if (ogDescription) ogDescription.setAttribute('content', newDesc)
    if (twitterDescription) twitterDescription.setAttribute('content', newDesc)
    document.title = newTitle

    return () => {
      if (metaDescription) metaDescription.setAttribute('content', originalDesc)
      if (ogDescription) ogDescription.setAttribute('content', originalDesc)
      if (twitterDescription) twitterDescription.setAttribute('content', originalDesc)
      document.title = originalTitle
    }
  }, [])

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await axios.get(buildLeaderboardUrl(backendUrl, { track, countedBy }))
        setData(res.data)
      } catch (err: unknown) {
        console.error(err)
        setError('Failed to load leaderboard statistics. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchLeaderboard()
  }, [track, countedBy, backendUrl])

  return (
    <div
      className="skills-leaderboard-page animate-fade-in"
      style={{ padding: '20px 0', textAlign: 'left' }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.8rem',
              fontWeight: '800',
              margin: 0,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            🏆 Skills Leaderboard
          </h2>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
            Aggregated, anonymized insights on commonly matched skills and in-demand gaps.
          </p>
        </div>
        <button
          onClick={onBack}
          className="app-btn app-btn--secondary"
          style={{ padding: '8px 16px', minHeight: '40px', fontSize: '0.9rem' }}
        >
          ← Back to Analyzer
        </button>
      </div>

      {/* Filter / Track Tabs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '24px',
          background: 'rgba(255,255,255,0.02)',
          padding: '6px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(255,255,255,0.04)',
          width: 'fit-content',
          alignItems: 'center',
        }}
      >
        {data?.last_updated && (
          <span
            style={{
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.5)',
              marginRight: '12px',
              marginLeft: '4px',
            }}
          >
            {formatRelativeTime(data.last_updated)}
          </span>
        )}
        {[
          { label: 'All Tracks', value: '' },
          { label: 'Frontend', value: 'Frontend Developer' },
          { label: 'Backend', value: 'Backend Developer' },
          { label: 'Data Analyst', value: 'Data Analyst' },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => setTrack(item.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              background: track === item.value ? 'var(--color-primary, #6366f1)' : 'transparent',
              color: '#fff',
              border: 'none',
              transition: 'all 0.2s',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Denominator toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <label
          htmlFor="leaderboard-counted-by"
          style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}
        >
          Count each skill
        </label>
        <select
          id="leaderboard-counted-by"
          value={countedBy}
          onChange={(event) => setCountedBy(event.target.value as CountedBy)}
          style={{
            padding: '6px 10px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            background: 'rgba(255,255,255,0.06)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <option value="analysis">once per analysis</option>
          <option value="user">once per person</option>
        </select>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.8)' }}>
          <div
            className="loader spin"
            style={{
              margin: '0 auto 16px',
              width: '32px',
              height: '32px',
              border: '3px solid rgba(255,255,255,0.1)',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
            }}
          ></div>
          <p>Analyzing aggregate dataset...</p>
        </div>
      ) : error ? (
        <div className="card glass-card p-5 text-center" style={{ color: '#ef4444' }}>
          <p>{error}</p>
          <button className="app-btn app-btn--secondary mt-3" onClick={() => setTrack(track)}>
            Retry
          </button>
        </div>
      ) : data ? (
        <div>
          {/* Metadata Banner */}
          <div
            className="card glass-card p-3 mb-4"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
              {data.counted_by === 'user' ? 'People counted' : 'Analyses counted'}:{' '}
              <strong style={{ color: '#fff' }}>{data.total_analyses.toLocaleString()}</strong>
              {/*
                A percentage is meaningless without its denominator, and this
                page showed a bare "%" over a number labelled only "Total
                Resumes Aggregated" — which is what it was, but not what a
                reader assumes it is. Counting analyses means one person
                re-running the same resume eight times moves every figure on
                the page. See #707.
              */}
              <span style={{ opacity: 0.6, marginLeft: '6px' }}>
                ({describeDenominator(data.counted_by, data.total_analyses)})
              </span>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {data?.last_updated && (
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                  {formatRelativeTime(data.last_updated)}
                </span>
              )}
              <span
                style={{
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#818cf8',
                  fontWeight: '700',
                }}
              >
                ✓ Anonymity Guaranteed
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '20px',
            }}
          >
            {/* Left Column: Top Matched Skills */}
            <div className="card glass-card p-4">
              <h3
                style={{
                  fontSize: '1.2rem',
                  fontWeight: '800',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#fff',
                }}
              >
                🔥 Top Skills Possessed
              </h3>
              <p
                style={{
                  fontSize: '0.82rem',
                  color: 'rgba(255,255,255,0.6)',
                  marginTop: '-8px',
                  marginBottom: '20px',
                }}
              >
                Skills commonly matching the career track requirements.
              </p>

              {data.matched_skills.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                  No data collected yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {data.matched_skills.map((item, index) => (
                    <div key={item.skill}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '6px',
                          fontSize: '0.9rem',
                        }}
                      >
                        <span style={{ fontWeight: '600', color: '#fff' }}>
                          {index + 1}. {item.skill}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: '#22c55e', fontWeight: '700' }}>
                          {item.percentage}% ({item.count})
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '6px',
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${item.percentage}%`,
                            height: '100%',
                            background: '#22c55e',
                            borderRadius: '3px',
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Top Skill Gaps */}
            <div className="card glass-card p-4">
              <h3
                style={{
                  fontSize: '1.2rem',
                  fontWeight: '800',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#fff',
                }}
              >
                ⚠️ Top Skill Gaps (In-Demand)
              </h3>
              <p
                style={{
                  fontSize: '0.82rem',
                  color: 'rgba(255,255,255,0.6)',
                  marginTop: '-8px',
                  marginBottom: '20px',
                }}
              >
                Highly sought-after skills that applicants frequently miss.
              </p>

              {data.missing_skills.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                  No data collected yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {data.missing_skills.map((item, index) => (
                    <div key={item.skill}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '6px',
                          fontSize: '0.9rem',
                        }}
                      >
                        <span style={{ fontWeight: '600', color: '#fff' }}>
                          {index + 1}. {item.skill}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: '#f59e0b', fontWeight: '700' }}>
                          {item.percentage}% ({item.count})
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '6px',
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${item.percentage}%`,
                            height: '100%',
                            background: '#f59e0b',
                            borderRadius: '3px',
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
