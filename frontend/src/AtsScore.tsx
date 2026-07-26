import React, { useState, useEffect } from 'react'
import { InfoTooltip } from './components/InfoTooltip'

interface AtsScoreProps {
  score: number
}

export const AtsScore: React.FC<AtsScoreProps> = ({ score }) => {
  const [displayScore, setDisplayScore] = useState(0)

  useEffect(() => {
    const duration = 800
    const steps = 30
    const increment = score / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= score) {
        setDisplayScore(score)
        clearInterval(timer)
      } else {
        setDisplayScore(Math.round(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [score])

  const getScoreColor = () => {
    if (score >= 80) return { ring: '#10b981', text: '#10b981' }
    if (score >= 60) return { ring: '#f59e0b', text: '#f59e0b' }
    return { ring: '#f43f5e', text: '#f43f5e' }
  }

  const scoreColor = getScoreColor()

  return (
    <div className="score-section mt-4 results-enter">
      <div
        className="score-circle mb-3 pulse-ring"
        style={{
          '--score': `${score * 3.6}deg` as string,
          background: `conic-gradient(${scoreColor.ring} ${score * 3.6}deg, var(--score-track) 0)`,
          boxShadow: `0 0 30px ${scoreColor.ring}22, 0 10px 25px rgba(20, 184, 166, 0.15)`,
        }}
      >
        <span
          className="score-text"
          style={{
            background: `linear-gradient(135deg, ${scoreColor.text}, ${scoreColor.text}dd)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {displayScore}%
        </span>
      </div>
      <h3
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <span className="gradient-text-animated" style={{ fontSize: '0.9em' }}>
          ATS Resume Score
        </span>
        <InfoTooltip content="Shows how well your resume matches the job description and how likely it is to pass an Applicant Tracking System." />
      </h3>
    </div>
  )
}
