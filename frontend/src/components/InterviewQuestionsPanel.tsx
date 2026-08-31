import React, { useState } from 'react'
import axios from 'axios'

interface InterviewQuestionsPanelProps {
  questions: string[]
}

export const InterviewQuestionsPanel: React.FC<InterviewQuestionsPanelProps> = ({ questions }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)

  // Practice Chat State
  const [activePracticeIndex, setActivePracticeIndex] = useState<number | null>(null)
  const [answerInput, setAnswerInput] = useState<string>('')
  const [feedbackMap, setFeedbackMap] = useState<Record<number, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!questions || questions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.6)' }}>
        <p>
          No interview questions generated. Try re-running the analysis with a target role and
          skills.
        </p>
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

  const handlePracticeSubmit = async (question: string, index: number) => {
    if (!answerInput.trim()) return

    setIsSubmitting(true)
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'
      const response = await axios.post(`${backendUrl}/api/mock-interview/`, {
        question,
        answer: answerInput,
      })

      setFeedbackMap((prev) => ({
        ...prev,
        [index]: response.data.feedback,
      }))
    } catch (error) {
      console.error('Failed to get mock interview feedback', error)
      alert('Failed to get mock interview feedback. Please try again later.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="interview-questions-container" style={{ textAlign: 'left', marginTop: '20px' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <h3
          style={{
            fontSize: '1.4rem',
            fontWeight: '700',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#fff',
          }}
        >
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
              transition: 'all 0.2s',
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
              transition: 'all 0.2s',
            }}
          >
            📥 Export TXT
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {questions.map((question: string, index: number) => (
          <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '16px',
                transition: 'transform 0.2s, background-color 0.2s',
              }}
            >
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#818cf8',
                    display: 'block',
                    marginBottom: '6px',
                  }}
                >
                  Question {index + 1}
                </span>
                <p style={{ fontSize: '0.94rem', color: '#f1f5f9', margin: 0, lineHeight: '1.5' }}>
                  {question}
                </p>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                }}
              >
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
                    whiteSpace: 'nowrap',
                  }}
                >
                  {copiedIndex === index ? 'Copied ✓' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActivePracticeIndex(activePracticeIndex === index ? null : index)
                    setAnswerInput('')
                  }}
                  style={{
                    background:
                      activePracticeIndex === index
                        ? 'rgba(99, 102, 241, 0.2)'
                        : 'rgba(255, 255, 255, 0.04)',
                    border:
                      activePracticeIndex === index
                        ? '1px solid rgba(99, 102, 241, 0.5)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--radius-md)',
                    padding: '6px 10px',
                    fontSize: '0.78rem',
                    color: activePracticeIndex === index ? '#818cf8' : 'rgba(255, 255, 255, 0.8)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {activePracticeIndex === index ? 'Close Practice' : 'Practice'}
                </button>
              </div>
            </div>

            {activePracticeIndex === index && (
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginLeft: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontStyle: 'italic' }}>
                  Mock Interview Chat: Type your answer below to receive feedback.
                </div>

                <textarea
                  value={answerInput}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setAnswerInput(e.target.value)
                  }
                  placeholder="Type your answer here..."
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => handlePracticeSubmit(question, index)}
                    disabled={isSubmitting || !answerInput.trim()}
                    style={{
                      background: '#4f46e5',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: isSubmitting || !answerInput.trim() ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting || !answerInput.trim() ? 0.6 : 1,
                    }}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Answer'}
                  </button>
                </div>

                {feedbackMap[index] && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '14px',
                      background: 'rgba(34, 197, 94, 0.1)',
                      borderLeft: '4px solid #22c55e',
                      borderRadius: '4px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <span style={{ fontWeight: 'bold', color: '#4ade80', fontSize: '0.85rem' }}>
                        Feedback
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: '#94a3b8',
                          background: 'rgba(255,255,255,0.05)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        🤖 AI-Generated Practice
                      </span>
                    </div>
                    <p
                      style={{ margin: 0, fontSize: '0.9rem', color: '#f8fafc', lineHeight: '1.5' }}
                    >
                      {feedbackMap[index]}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
