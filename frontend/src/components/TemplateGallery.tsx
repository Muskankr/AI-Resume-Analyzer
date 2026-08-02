import React, { useState, useEffect, useMemo } from 'react'
import { TemplateCard } from './TemplateCard'
import '../components/AnalysisSkeleton/AnalysisSkeleton.css'

interface Template {
  name: string
  description: string
  atsNote: string
  fileName: string
  imageSrc: string
  careerTrack: string
  designStyle: string
}

const TEMPLATES: Template[] = [
  {
    name: 'Modern',
    description: 'A clean, modern layout with clear sections and plenty of white space.',
    atsNote: 'Optimized for ATS parsing – simple formatting, no tables.',
    fileName: 'modern.docx',
    imageSrc: '/templates/modern.png',
    careerTrack: 'general',
    designStyle: 'modern',
  },
  {
    name: 'Clean',
    description: 'Simple and professional design, easy to read for recruiters.',
    atsNote: 'Uses standard headings and bullet points – ATS friendly.',
    fileName: 'clean.docx',
    imageSrc: '/templates/clean.png',
    careerTrack: 'general',
    designStyle: 'minimal',
  },
  {
    name: 'Creative',
    description: 'Subtle color accents and modern typography while staying ATS compatible.',
    atsNote: 'No complex tables or graphics – plain text formatting.',
    fileName: 'creative.docx',
    imageSrc: '/templates/creative.png',
    careerTrack: 'design',
    designStyle: 'creative',
  },
  // Add more templates here as needed — just set careerTrack/designStyle accordingly
]

const CAREER_TRACKS = [
  { value: 'all', label: 'All Tracks' },
  { value: 'general', label: 'General / Corporate' },
  { value: 'design', label: 'Design / Creative' },
  { value: 'tech', label: 'Tech / Engineering' },
] as const

function TemplateCardSkeleton() {
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
      }}
      aria-hidden="true"
    >
      <div
        className="skeleton-shimmer"
        style={{ width: '100%', height: '192px', borderRadius: '6px' }}
      />
      <div
        className="skeleton-shimmer"
        style={{ width: '60%', height: '20px', borderRadius: '4px' }}
      />
      <div
        className="skeleton-shimmer"
        style={{ width: '90%', height: '14px', borderRadius: '4px' }}
      />
      <div
        className="skeleton-shimmer"
        style={{ width: '80%', height: '14px', borderRadius: '4px' }}
      />
      <div
        className="skeleton-shimmer"
        style={{ width: '100px', height: '36px', borderRadius: '20px' }}
      />
    </div>
  )
}

export const TemplateGallery: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [activeTrack, setActiveTrack] = useState<string>('all')

  useEffect(() => {
    let cancelled = false
    // Simulate async fetch; replace with real fetch() call when templates are served remotely
    const timer = setTimeout(() => {
      if (!cancelled) setStatus('success')
    }, 600)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  const filteredTemplates = useMemo(() => {
    if (activeTrack === 'all') return TEMPLATES
    return TEMPLATES.filter((t) => t.careerTrack === activeTrack)
  }, [activeTrack])

  const handleReset = () => setActiveTrack('all')

  if (status === 'loading') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading resume templates"
        style={{
          display: 'grid',
          gap: '24px',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        }}
      >
        <span className="sr-only">Loading resume templates, please wait…</span>
        {[0, 1, 2].map((i) => (
          <TemplateCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div
        role="alert"
        style={{
          textAlign: 'center',
          padding: '24px',
          color: 'var(--color-danger)',
          background: 'rgba(239,68,68,0.08)',
          borderRadius: '8px',
          border: '1px solid rgba(239,68,68,0.25)',
        }}
      >
        <p style={{ margin: '0 0 12px', fontWeight: 600 }}>⚠️ Failed to load templates.</p>
        <button className="app-btn app-btn--secondary" onClick={() => setStatus('loading')}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Filter bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '24px',
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Career Track:
        </span>
        {CAREER_TRACKS.map((track) => (
          <button
            key={track.value}
            onClick={() => setActiveTrack(track.value)}
            className={
              activeTrack === track.value ? 'app-btn app-btn--accent' : 'app-btn app-btn--secondary'
            }
            style={{
              fontSize: '0.8rem',
              padding: '4px 14px',
              borderRadius: '20px',
              cursor: 'pointer',
              border: 'none',
            }}
            aria-pressed={activeTrack === track.value}
          >
            {track.label}
          </button>
        ))}

        {activeTrack !== 'all' && (
          <button
            onClick={handleReset}
            className="app-btn app-btn--secondary"
            style={{
              fontSize: '0.75rem',
              padding: '4px 12px',
              borderRadius: '20px',
              cursor: 'pointer',
              border: 'none',
              marginLeft: 'auto',
            }}
            aria-label="Reset career track filter"
          >
            ✕ Clear filter
          </button>
        )}
      </div>

      {/* Result count */}
      <p
        style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          marginBottom: '16px',
        }}
      >
        {filteredTemplates.length === 0
          ? 'No templates match the selected filter.'
          : `Showing ${filteredTemplates.length} template${filteredTemplates.length > 1 ? 's' : ''}`}
      </p>

      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gap: '24px',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        }}
      >
        {filteredTemplates.length > 0 ? (
          filteredTemplates.map((t) => (
            <TemplateCard
              key={t.name}
              name={t.name}
              description={t.description}
              atsNote={t.atsNote}
              fileName={t.fileName}
              imageSrc={t.imageSrc}
              careerTrack={t.careerTrack}
              designStyle={t.designStyle}
            />
          ))
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '32px 0' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
              No templates for this track yet.
            </p>
            <button className="app-btn app-btn--secondary" onClick={handleReset}>
              View all templates
            </button>
          </div>
        )}
      </div>
    </>
  )
}
