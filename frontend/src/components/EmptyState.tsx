export default function EmptyState() {
  return (
    <div
      className="mt-5 p-5 text-center"
      style={{
        border: '2px dashed #d1d5db',
        borderRadius: '12px',
        color: '#6b7280',
      }}
    >
      <div style={{ fontSize: '48px' }}>📄</div>

      <h3 className="mt-3">No resume uploaded yet</h3>

      <p>Upload a resume to see your ATS score, skills analysis, and personalized suggestions.</p>
    </div>
  )
}
