import React from 'react'

interface MatchComparisonCardProps {
  jobMatchScore: number;
  jdMissingSkills: string[];
  jdMatchedSkills: string[];
}

export const MatchComparisonCard: React.FC<MatchComparisonCardProps> = ({
  jobMatchScore,
  jdMissingSkills,
  jdMatchedSkills,
}) => {
  return (
    <div
      className="score-breakdown-card mb-4"
      style={{
        background: 'var(--surface-bg, #1e293b)',
        border: '1px solid var(--surface-border, rgba(255, 255, 255, 0.1))',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: '24px',
      }}
    >
      <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', color: 'var(--heading-text, #fff)' }}>
        Job Description Match Analysis
      </h2>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        {/* Match Score Indicator */}
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            position: 'relative',
            width: '120px',
            height: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: `conic-gradient(var(--color-primary, #6366f1) ${jobMatchScore}%, rgba(255,255,255,0.1) 0)`
          }}>
            <div style={{
              position: 'absolute',
              width: '100px',
              height: '100px',
              backgroundColor: 'var(--surface-bg, #1e293b)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--heading-text, #fff)' }}>
                {jobMatchScore}%
              </span>
            </div>
          </div>
          <span style={{ marginTop: '12px', fontWeight: '600', color: 'var(--heading-text, #fff)' }}>Match Score</span>
        </div>

        {/* Missing vs Matched */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', color: '#4ade80', marginBottom: '8px' }}>Matched Requirements</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {jdMatchedSkills.length > 0 ? jdMatchedSkills.map(s => (
                <span key={s} style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(74, 222, 128, 0.1)',
                  color: '#4ade80',
                  fontSize: '0.85rem'
                }}>{s}</span>
              )) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--muted-text)' }}>No exact matches found.</span>
              )}
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', color: '#ff6b6b', marginBottom: '8px' }}>Missing Requirements</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {jdMissingSkills.length > 0 ? jdMissingSkills.map(s => (
                <span key={s} style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(255, 107, 107, 0.1)',
                  color: '#ff6b6b',
                  fontSize: '0.85rem'
                }}>{s}</span>
              )) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--muted-text)' }}>No missing requirements!</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
