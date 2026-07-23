import { FileText } from 'lucide-react'

export default function EmptyState() {
  return (
    <div className="empty-state-container">
      <div style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
        <FileText size={30} />
      </div>

      <h3
        style={{
          color: 'var(--text-primary)',
          margin: '0 0 12px 0',
          fontSize: 'var(--font-size-base)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        No resume uploaded yet
      </h3>

      <p className="empty-state-description">
        Upload a resume to see your ATS score, skills analysis, and personalized suggestions.
      </p>
    </div>
  )
}
