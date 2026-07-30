import React, { useState } from 'react'

interface InterviewQuestionsPanelProps {
  questions: string[]
}

export const InterviewQuestionsPanel: React.FC<InterviewQuestionsPanelProps> = ({ questions }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)

  if (!questions || questions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.6)' }}>
        <p>No interview questions generated. Try re-running the analysis with a target role and skills.</p>
      </div>
    )
  }

  const handleCopySingle = (question: string, index: number) => {
    navigator.clipboard.writeText(question)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleCopyAll = () => {
    const formatted = questions.map((q, idx) => `${idx + 1}. ${q}`).join('\n\n')
    navigator.clipboard.writeText(formatted)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  const handleExportTxt = () => {
    const header = `AI Resume Analyzer - Interview Preparation Questions\nGenerated: ${new Date().toLocaleDateString()}\n==================================================\n\n`
    const content = questions.map((q, idx) => `Question ${idx + 1}:\n${q}\n`).join('\n')
    const blob = new Blob([header + content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `interview-questions-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="interview-questions-container" style={{ textAlign: 'left', marginTop: '20px' }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <h3 style={{ fontSize: '1.4rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
          💬 Interview Questions ({questions.length})
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={handleCopyAll}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
              background: copiedAll ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              color: copiedAll ? '#4ade80' : '#fff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'all 0.2s'
            }}
          >
            {copiedAll ? '✓ Copied All' : '📋 Copy All'}
          </button>
          <button
            type="button"
            onClick={handleExportTxt}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'all 0.2s'
            }}
          >
            📥 Export TXT
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {questions.map((question, index) => (
          <div
            key={index}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '16px',
              transition: 'transform 0.2s, background-color 0.2s'
            }}
          >
            <div style={{ flex: 1 }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#818cf8',
                display: 'block',
                marginBottom: '6px'
              }}>
                Question {index + 1}
              </span>
              <p style={{ fontSize: '0.94rem', color: '#f1f5f9', margin: 0, lineHeight: '1.5' }}>
                {question}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopySingle(question, index)}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 10px',
                fontSize: '0.78rem',
                color: copiedIndex === index ? '#4ade80' : 'rgba(255, 255, 255, 0.8)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {copiedIndex === index ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
