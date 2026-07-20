import React from 'react'
import { InfoTooltip } from './components/InfoTooltip'

interface AtsScoreProps {
  score: number
}

export const AtsScore: React.FC<AtsScoreProps> = ({ score }) => {
  return (
    <div className="score-section mt-4">
      <div
        className="score-circle mb-3"
        style={{ '--score': `${score * 3.6}deg` } as React.CSSProperties}
      >
        <span className="score-text">{score}%</span>
      </div>
      <h3
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        ATS Resume Score
        <InfoTooltip content="Shows how well your resume matches the job description and how likely it is to pass an Applicant Tracking System." />
      </h3>
    </div>
  )
}
