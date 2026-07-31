import React, { useState } from 'react'
import {
  generateActionPlan,
  exportActionPlanMarkdown,
  exportActionPlanPdf,
  type ActionPlanParams,
} from '../utils/actionPlanUtils'
import { ListChecks, Download, FileText, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react'

interface ActionPlanChecklistProps extends ActionPlanParams {}

export const ActionPlanChecklist: React.FC<ActionPlanChecklistProps> = (props) => {
  const actionPlan = generateActionPlan(props)
  const [completedIds, setCompletedIds] = useState<Record<string, boolean>>({})

  const toggleCheck = (id: string) => {
    setCompletedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const completedCount = Object.values(completedIds).filter(Boolean).length
  const totalCount = actionPlan.items.length
  const potentialScore = Math.min(100, actionPlan.score + actionPlan.totalPotentialGain)

  return (
    <div
      className="action-plan-checklist-card mt-4 p-4"
      style={{
        background: 'var(--card-bg, rgba(30, 30, 47, 0.6))',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--surface-border, rgba(255, 255, 255, 0.08))',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
        textAlign: 'left',
      }}
      aria-label="Prioritized Action Plan Checklist"
    >
      {/* Header section */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <ListChecks size={18} />
            </span>
            <h3
              style={{
                margin: 0,
                fontSize: '1.2rem',
                fontWeight: 700,
                color: 'var(--text-primary, #f8fafc)',
              }}
            >
              Prioritized Action Plan Checklist
            </h3>
          </div>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '0.85rem',
              color: 'var(--text-secondary, #94a3b8)',
            }}
          >
            Target Role: <strong>{actionPlan.targetRole}</strong> — Ordered by estimated score impact
          </p>
        </div>

        {/* Export Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button
            type="button"
            className="app-btn app-btn--secondary"
            onClick={() => exportActionPlanMarkdown(actionPlan)}
            style={{
              minHeight: '38px',
              padding: '6px 12px',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
            title="Download Action Plan as Markdown Checklist"
          >
            <FileText size={15} /> Export Markdown (.md)
          </button>
          <button
            type="button"
            className="app-btn app-btn--accent"
            onClick={() => exportActionPlanPdf(actionPlan)}
            style={{
              minHeight: '38px',
              padding: '6px 12px',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
            title="Download Action Plan as PDF Document"
          >
            <Download size={15} /> Export PDF (.pdf)
          </button>
        </div>
      </div>

      {/* Progress & Quick Wins Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={20} style={{ color: '#818cf8', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary, #fff)' }}>
              Top Priority Rule: Focus on the top 3 items first!
            </div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
              Current ATS Score: <strong>{actionPlan.score}%</strong> &rarr; Potential:{' '}
              <strong style={{ color: '#34d399' }}>{potentialScore}%</strong> (+{actionPlan.totalPotentialGain}% max score impact)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
          <TrendingUp size={16} style={{ color: '#34d399' }} />
          <span>
            Progress: <strong>{completedCount}</strong> / {totalCount} completed
          </span>
        </div>
      </div>

      {/* Items Checklist List */}
      <div className="action-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {actionPlan.items.map((item, index) => {
          const isDone = !!completedIds[item.id]
          const isTop3 = index < 3

          let priorityBg = 'rgba(239, 68, 68, 0.15)'
          let priorityColor = '#f87171'
          let priorityBorder = 'rgba(239, 68, 68, 0.3)'

          if (item.priority === 'Medium') {
            priorityBg = 'rgba(245, 158, 11, 0.15)'
            priorityColor = '#fbbf24'
            priorityBorder = 'rgba(245, 158, 11, 0.3)'
          } else if (item.priority === 'Low') {
            priorityBg = 'rgba(59, 130, 246, 0.15)'
            priorityColor = '#60a5fa'
            priorityBorder = 'rgba(59, 130, 246, 0.3)'
          }

          return (
            <div
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px',
                borderRadius: '8px',
                background: isDone
                  ? 'rgba(34, 197, 94, 0.08)'
                  : isTop3
                  ? 'rgba(255, 255, 255, 0.04)'
                  : 'rgba(0, 0, 0, 0.15)',
                border: isDone
                  ? '1px solid rgba(34, 197, 94, 0.3)'
                  : isTop3
                  ? '1px solid rgba(129, 140, 248, 0.25)'
                  : '1px solid rgba(255, 255, 255, 0.06)',
                cursor: 'pointer',
                transition: 'all 0.15s ease-in-out',
                opacity: isDone ? 0.75 : 1,
              }}
            >
              <div style={{ marginTop: '2px', flexShrink: 0 }}>
                {isDone ? (
                  <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
                ) : (
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => {}} // handled by parent onClick
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: priorityBg,
                      color: priorityColor,
                      border: `1px solid ${priorityBorder}`,
                    }}
                  >
                    +{item.estimatedImpact}% ATS Impact
                  </span>

                  {isTop3 && !isDone && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(99, 102, 241, 0.2)',
                        color: '#a5b4fc',
                      }}
                    >
                      🔥 Quick Win #{index + 1}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    color: isDone ? 'var(--text-secondary, #94a3b8)' : 'var(--text-primary, #f8fafc)',
                    textDecoration: isDone ? 'line-through' : 'none',
                  }}
                >
                  {item.text}
                </div>

                <div
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary, #94a3b8)',
                    fontStyle: 'italic',
                    marginTop: '2px',
                  }}
                >
                  Reason: {item.reason}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
