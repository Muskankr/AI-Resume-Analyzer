import React from 'react';

interface AtsScoreProps {
  score: number;
}

export const AtsScore: React.FC<AtsScoreProps> = ({ score }) => {
  return (
    <div className="score-section mt-4">
      <div 
        className="score-circle mb-3" 
        style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}
      >
        <span className="score-text">{score}%</span>
      </div>
      <h3>ATS Resume Score</h3>
    </div>
  );
};