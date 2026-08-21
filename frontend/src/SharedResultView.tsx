import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { AtsScore } from './AtsScore'
import { CheckCircle, Info, Loader2 } from 'lucide-react'
import { formatExpiry } from './utils/shareLink'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

export const SharedResultView: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>()
  /**
   * Mirrors `PublicSharedAnalysisSerializer`.
   *
   * `file_name` used to be read from here and rendered under the score. It is
   * no longer sent — a resume saved as `Firstname_Lastname_Resume.pdf` names its
   * owner, which is not something a "share your score" link should do (#705).
   * The role and level took its place: they say what the score is *of*, which
   * is what the line was there for.
   */
  interface SharedData {
    score: number
    target_role: string
    experience_level: string
    skills_found: string[]
    suggestions: string[]
    expires_at: string | null
  }
  const [data, setData] = useState<SharedData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSharedData = async () => {
      try {
        // `analyzer.urls` is included under `api/`, not `api/analyzer/`, so the
        // endpoint is `/api/shared/<uuid>/`. The extra prefix made every share
        // link 404 and render "Result Not Found" — indistinguishable from a
        // share that genuinely did not exist. See #632.
        const res = await axios.get(`${BACKEND}/api/shared/${shareId}/`)
        setData(res.data)
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { detail?: string } } }
        // A revoked, expired and never-existed link all answer 404, and the
        // copy has to work for all three — the backend deliberately does not
        // say which, so this must not claim the link never existed.
        setError(
          axiosErr.response?.data?.detail ||
            'This link is not available. It may have expired, or the owner may have stopped sharing it.'
        )
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
    <div
      className="shared-result-view"
      style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}
    >
      <div className="sample-notice-banner mb-4" style={{ padding: '10px' }}>
        <span>
          <Info size={15} /> Read-Only View
        </span>
        <span style={{ fontWeight: 'normal', fontSize: '13px', display: 'block' }}>
          This is a shared, read-only view of a resume analysis result. It does not include the
          resume itself.
          {data.expires_at ? ` This link ${formatExpiry(data.expires_at)}.` : ''}
        </span>
      </div>

      <div id="ats-score">
        <AtsScore score={data.score} />
      </div>

      <h5 className="analysis-done mt-3">
        <CheckCircle size={18} /> Resume Analysis Complete
      </h5>
      <p style={{ fontSize: '13px', opacity: 0.7, marginTop: '-8px' }}>
        {data.target_role}
        {data.experience_level ? ` • ${data.experience_level}` : ''}
      </p>

      {/* Render skills and suggestions */}
      <div style={{ marginTop: '20px' }}>
        <h6>Skills Found</h6>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {data.skills_found.map((s: string) => (
            <span
              key={s}
              style={{
                background: '#eee',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.85rem',
              }}
            >
              {s}
            </span>
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
        <Link to="/" className="btn btn-primary">
          Analyze your own resume
        </Link>
      </div>
    </div>
  )
}
