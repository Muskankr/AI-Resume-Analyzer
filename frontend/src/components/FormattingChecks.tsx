import React, { useState } from 'react'
import { FileText, Layout, Type, ChevronDown, ChevronUp } from 'lucide-react'

export interface FormattingTips {
  length: string[]
  sections: string[]
  layout: string[]
  typography: string[]
}

export interface FormattingChecksData {
  score: number
  page_count: number
  word_count: number
  has_tables_or_columns: boolean
  length_status: 'optimal' | 'warning'
  layout_status: 'optimal' | 'warning'
  found_sections: string[]
  missing_sections: string[]
  tips: FormattingTips
  all_actionable_tips: string[]
}

interface FormattingChecksProps {
  formattingChecks: FormattingChecksData | null | undefined
}

export const FormattingChecks: React.FC<FormattingChecksProps> = ({ formattingChecks }) => {
  const [isExpanded, setIsExpanded] = useState(true)

  if (!formattingChecks) return null

  const {
    score,
    page_count,
    word_count,
    length_status,
    layout_status,
    found_sections,
    missing_sections,
    tips,
  } = formattingChecks

  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'

  return (
    <div
      className="mt-4 p-4"
      style={{
        background: 'var(--surface-soft-bg, rgba(255, 255, 255, 0.03))',
        border: '1px solid var(--surface-border, rgba(255, 255, 255, 0.1))',
        borderRadius: 'var(--radius-lg, 12px)',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layout size={20} style={{ color: 'var(--color-primary, #6366f1)' }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700' }}>
              ATS Structural &amp; Formatting Checks
            </h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted-text, #94a3b8)' }}>
              Page length, section hierarchy, table/column parsing &amp; font compatibility
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontWeight: '700',
              fontSize: '0.85rem',
              background: 'rgba(0, 0, 0, 0.25)',
              color: scoreColor,
              border: `1px solid ${scoreColor}`,
            }}
          >
            Structure Score: {score}/100
          </span>
          <button
            type="button"
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
            aria-label={isExpanded ? 'Collapse formatting checks' : 'Expand formatting checks'}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Status summary tiles */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            {/* Length Tile */}
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}
              >
                <FileText
                  size={15}
                  style={{ color: length_status === 'optimal' ? '#22c55e' : '#eab308' }}
                />
                <strong style={{ fontSize: '0.85rem' }}>Length &amp; Pages</strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.85 }}>
                ~{page_count} page{page_count !== 1 ? 's' : ''} ({word_count} words)
              </p>
            </div>

            {/* Layout Tile */}
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}
              >
                <Layout
                  size={15}
                  style={{ color: layout_status === 'optimal' ? '#22c55e' : '#ef4444' }}
                />
                <strong style={{ fontSize: '0.85rem' }}>Table / Column Layout</strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.85 }}>
                {layout_status === 'optimal' ? 'Single column linear' : 'Tables/columns detected'}
              </p>
            </div>

            {/* Section Count Tile */}
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}
              >
                <Type
                  size={15}
                  style={{ color: missing_sections.length === 0 ? '#22c55e' : '#eab308' }}
                />
                <strong style={{ fontSize: '0.85rem' }}>Standard Sections</strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.85 }}>
                {found_sections.length} found, {missing_sections.length} missing
              </p>
            </div>
          </div>

          {/* Actionable Tips Group */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '14px',
              borderRadius: '8px',
            }}
          >
            <h5 style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: '700' }}>
              Actionable ATS Formatting Guidance
            </h5>
            <ul
              style={{
                margin: 0,
                paddingLeft: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.85rem',
              }}
            >
              {tips.length.map((t, idx) => (
                <li
                  key={`len-${idx}`}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}
                >
                  <span style={{ color: length_status === 'optimal' ? '#22c55e' : '#eab308' }}>
                    {length_status === 'optimal' ? '✓' : '⚠️'}
                  </span>
                  <span>{t}</span>
                </li>
              ))}

              {tips.sections.map((t, idx) => (
                <li
                  key={`sec-${idx}`}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}
                >
                  <span style={{ color: missing_sections.length === 0 ? '#22c55e' : '#ef4444' }}>
                    {missing_sections.length === 0 ? '✓' : '⚠️'}
                  </span>
                  <span>{t}</span>
                </li>
              ))}

              {tips.layout.map((t, idx) => (
                <li
                  key={`lay-${idx}`}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}
                >
                  <span style={{ color: layout_status === 'optimal' ? '#22c55e' : '#ef4444' }}>
                    {layout_status === 'optimal' ? '✓' : '⚠️'}
                  </span>
                  <span>{t}</span>
                </li>
              ))}

              {tips.typography.map((t, idx) => (
                <li
                  key={`typ-${idx}`}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}
                >
                  <span style={{ color: '#22c55e' }}>✓</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
