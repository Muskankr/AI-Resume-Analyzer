import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { AtsScore } from './AtsScore'
import { CheckCircle, Info, Loader2 } from 'lucide-react'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

export const SharedResultView: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSharedData = async () => {
      try {
        const res = await axios.get(`${BACKEND}/api/analyzer/shared/${shareId}/`)
        setData(res.data)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load shared result or it does not exist.')
      } finally {
        setLoading(false)
      }
    }
    fetchSharedData()
  }, [shareId])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
        <Loader2 size={30} className="spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <h2>Result Not Found</h2>
        <p>{error}</p>
        <Link to="/">Go to Home</Link>
      </div>
    )
  }

  return (
    <div className="shared-result-view" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div className="sample-notice-banner mb-4" style={{ padding: '10px' }}>
        <span><Info size={15} /> Read-Only View</span>
        <span style={{ fontWeight: 'normal', fontSize: '13px', display: 'block' }}>
          This is a shared, read-only view of a resume analysis result.
        </span>
      </div>

      <div id="ats-score">
        <AtsScore score={data.score} />
      </div>

      <h5 className="analysis-done mt-3">
        <CheckCircle size={18} /> Resume Analysis Complete
      </h5>
      <p style={{ fontSize: '13px', opacity: 0.7, marginTop: '-8px' }}>
        {data.file_name}
      </p>

      {/* Render skills and suggestions */}
      <div style={{ marginTop: '20px' }}>
        <h6>Skills Found</h6>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {data.skills_found.map((s: string) => (
            <span key={s} style={{ background: '#eee', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>{s}</span>
          ))}
        </div>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h6>Suggestions</h6>
        <ul>
          {data.suggestions.map((s: string, idx: number) => (
            <li key={idx}>{s}</li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <Link to="/" className="btn btn-primary">Analyze your own resume</Link>
      </div>
    </div>
  )
}
