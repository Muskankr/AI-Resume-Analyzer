import React, { useState } from 'react'

interface KeywordItem {
  text: string
  value: number
  type: 'skill' | 'general'
}

interface JdVisualizerPanelProps {
  keywords: KeywordItem[]
  onBack: () => void
}

export const JdVisualizerPanel: React.FC<JdVisualizerPanelProps> = ({ keywords, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('')

  if (!keywords || keywords.length === 0) {
    return (
      <div className="card glass-card p-5 text-center mt-4">
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>No keywords found. Try analyzing a longer, more detailed job description.</p>
        <button className="app-btn app-btn--secondary mt-3" onClick={onBack}>Go Back</button>
      </div>
    )
  }

  // Filter keywords by search query
  const filtered = keywords.filter((item) =>
    item.text.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Max value for scaling word cloud sizes
  const maxValue = Math.max(...keywords.map((k) => k.value), 1)

  return (
    <div className="jd-visualizer-container animate-fade-in" style={{ marginTop: '24px', textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button
          onClick={onBack}
          className="app-btn app-btn--secondary"
          style={{ padding: '6px 12px', minHeight: '36px', fontSize: '0.85rem' }}
        >
          ← Analyze Another JD
        </button>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: '#fff' }}>
          💼 Job Description Insights
        </h2>
      </div>

      {/* Row: Word Cloud Card */}
      <div className="card glass-card p-4 mb-4" style={{ position: 'relative', overflow: 'hidden' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '16px', color: '#fff' }}>
          ☁️ Keyword Word Cloud
        </h3>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px 20px',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          background: 'rgba(0,0,0,0.15)',
          borderRadius: 'var(--radius-lg)',
          minHeight: '160px'
        }}>
          {keywords.map((item, index) => {
            // Scale font size from 0.85rem to 2rem
            const ratio = item.value / maxValue
            const fontSize = `${0.85 + ratio * 1.15}rem`
            const isSkill = item.type === 'skill'
            
            // Premium colors: skills glow purple/indigo, general keywords are bright slate/white
            const color = isSkill ? `rgba(129, 140, 248, ${0.6 + ratio * 0.4})` : `rgba(241, 245, 249, ${0.4 + ratio * 0.6})`
            const fontWeight = isSkill ? '700' : '500'

            return (
              <span
                key={index}
                style={{
                  fontSize,
                  color,
                  fontWeight,
                  textShadow: isSkill ? '0 0 10px rgba(99, 102, 241, 0.2)' : 'none',
                  cursor: 'default',
                  transition: 'transform 0.2s',
                }}
                className="word-cloud-item"
                title={`Frequency: ${item.value} (${item.type === 'skill' ? 'Core Skill' : 'Frequent Word'})`}
              >
                {item.text}
              </span>
            )
          })}
        </div>
      </div>

      {/* Row: Filter and Ranked List */}
      <div className="card glass-card p-4">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0, color: '#fff' }}>
            📊 Ranked Keywords ({filtered.length})
          </h3>
          <input
            type="text"
            placeholder="Filter keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(0, 0, 0, 0.2)',
              color: '#fff',
              outline: 'none',
              width: '200px',
              fontSize: '0.85rem'
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
          {filtered.map((item, index) => {
            const isSkill = item.type === 'skill'
            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>
                    #{index + 1}
                  </span>
                  <span style={{ fontWeight: '600', color: '#fff', fontSize: '0.92rem' }}>
                    {item.text}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: isSkill ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: isSkill ? '#4ade80' : 'rgba(255,255,255,0.6)',
                  }}>
                    {isSkill ? 'Skill' : 'Word'}
                  </span>
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    color: '#6366f1',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: 'var(--radius-md)',
                    padding: '2px 8px',
                    minWidth: '28px',
                    textAlign: 'center'
                  }}>
                    {item.value}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
