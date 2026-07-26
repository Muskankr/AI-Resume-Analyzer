import { FileSearch, ArrowUp } from 'lucide-react'

export default function EmptyState() {
  return (
    <div className="empty-state-container">
      <div
        style={{
          position: 'relative',
          display: 'inline-flex',
          marginBottom: '20px',
        }}
      >
        <div className="empty-state-icon-wrapper" aria-hidden="true">
          <FileSearch size={40} />
        </div>
        <div
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #14b8a6, #f472b6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '12px',
            fontWeight: '700',
            boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
          }}
        >
          <ArrowUp size={14} />
        </div>
      </div>

      <h3
        style={{
          fontSize: '1.3rem',
          fontWeight: '700',
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #2dd4bf, #f472b6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Ready to analyze your resume?
      </h3>

      <p
        style={{
          fontSize: '0.9rem',
          color: 'var(--text-muted)',
          maxWidth: '400px',
          margin: '0 auto',
          lineHeight: '1.6',
        }}
      >
        Upload a resume to see your ATS score, skills analysis, and personalized suggestions. Your
        journey to landing more interviews starts here.
      </p>
    </div>
  )
}

