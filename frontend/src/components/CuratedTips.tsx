import React from 'react'
import { careerResumeTips } from '../data/careerResumeTips'

interface CuratedTipsProps {
  targetRole: string
}

export const CuratedTips: React.FC<CuratedTipsProps> = ({ targetRole }) => {
  const tips = careerResumeTips[targetRole]

  return (
    <div className="curated-tips-section" style={{ marginTop: '24px' }}>
      <h5 style={{ marginBottom: '12px' }}>Curated Tips for {targetRole}</h5>
      {tips && tips.length > 0 ? (
        <ul style={{ paddingLeft: '20px', color: '#e2e8f0', fontSize: '0.95rem' }}>
          {tips.map((tip, index) => (
            <li key={index} style={{ marginBottom: '8px' }}>
              {tip}
            </li>
          ))}
        </ul>
      ) : (
        <p
          style={{
            color: '#64748b',
            fontStyle: 'italic',
            fontSize: 'var(--font-size-sm)',
            margin: '0',
          }}
        >
          No additional curated resume tips are available for this career track.
        </p>
      )}
    </div>
  )
}
