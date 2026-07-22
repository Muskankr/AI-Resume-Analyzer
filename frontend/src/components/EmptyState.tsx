import { FileText } from 'lucide-react'

export default function EmptyState() {
  return (
    <div className="empty-state-container">
      <div className="empty-state-icon-wrapper" aria-hidden="true">
        <FileText size={36} />
      </div>

      <h3 className="empty-state-title">No resume uploaded yet</h3>

      <p className="empty-state-description">
        Upload a resume to see your ATS score, skills analysis, and personalized suggestions.
      </p>
    </div>
  )
}

