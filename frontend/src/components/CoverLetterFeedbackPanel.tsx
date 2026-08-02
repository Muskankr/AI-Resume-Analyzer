import React from 'react'

interface CoverLetterFeedbackPanelProps {
  feedback: {
    word_count: number
    length: {
      status: string
      feedback: string
    }
    tone: {
      label: string
      feedback: string
      suggestions: string[]
    }
    relevance: {
      references_role: boolean
      references_company: boolean
      feedback: string
      suggestions: string[]
    }
  }
}

export const CoverLetterFeedbackPanel: React.FC<CoverLetterFeedbackPanelProps> = ({ feedback }) => {
  return (
    <div className="cover-letter-feedback-container" style={{ textAlign: 'left', marginTop: '20px' }}>
      <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
        ✉️ Cover Letter Feedback
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Length Card */}
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#a5b4fc' }}>
            📏 Length & Scope
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>Word Count:</span>
            <span style={{ fontSize: '1rem', fontWeight: '700', color: '#fff' }}>{feedback.word_count} words</span>
            <span style={{
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: '600',
              background: feedback.length.status === 'Good' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: feedback.length.status === 'Good' ? '#4ade80' : '#f87171'
            }}>
              {feedback.length.status}
            </span>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', lineHeight: '1.4', margin: 0 }}>
            {feedback.length.feedback}
          </p>
        </div>

        {/* Tone Card */}
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#a5b4fc' }}>
            🎭 Writing Tone
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>Detected Tone:</span>
            <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#818cf8', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
              {feedback.tone.label || 'Professional'}
            </span>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', lineHeight: '1.4', margin: 0 }}>
            {feedback.tone.feedback}
          </p>
        </div>
      </div>

      {/* Relevance & Alignment Card */}
      <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '24px' }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', color: '#a5b4fc' }}>
          🎯 Job & Company Alignment
        </h4>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>💼 Mentions Role:</span>
            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: feedback.relevance.references_role ? '#4ade80' : '#f87171' }}>
              {feedback.relevance.references_role ? 'Yes ✓' : 'No ✗'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>🏢 Mentions Company:</span>
            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: feedback.relevance.references_company ? '#4ade80' : '#f87171' }}>
              {feedback.relevance.references_company ? 'Yes ✓' : 'No ✗'}
            </span>
          </div>
        </div>

        <p style={{ fontSize: '0.92rem', color: '#e2e8f0', lineHeight: '1.5', margin: '0 0 8px 0', borderLeft: '3px solid #6366f1', paddingLeft: '12px' }}>
          {feedback.relevance.feedback}
        </p>
      </div>

      {/* Actionable Suggestions */}
      {((feedback.tone.suggestions && feedback.tone.suggestions.length > 0) || 
        (feedback.relevance.suggestions && feedback.relevance.suggestions.length > 0)) && (
        <div style={{ background: 'rgba(239, 68, 68, 0.02)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171' }}>
            💡 Recommendations for Improvement
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[...(feedback.tone.suggestions || []), ...(feedback.relevance.suggestions || [])].map((suggestion, index) => (
              <li key={index} style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)', lineHeight: '1.4' }}>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
