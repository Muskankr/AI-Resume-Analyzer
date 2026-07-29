import React, { useEffect, useState } from 'react'
import axios from 'axios'
import type { AuthUser } from '../hooks/useAuth'

interface AdminDashboardProps {
  user: AuthUser | null
}

interface StatItem {
  role?: string
  skill?: string
  count: number
}

interface AdminStats {
  total_analyses: number
  popular_roles: StatItem[]
  top_missing_skills: StatItem[]
}

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchStats = async () => {
      try {
        const res = await axios.get(`${BACKEND}/api/admin/stats/`, {
          headers: { Authorization: `Bearer ${user.token}` },
        })
        setStats(res.data)
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } }
        if (axiosErr.response?.status === 403) {
          setError('Access Denied: You do not have permission to view this page.')
        } else {
          setError('An error occurred while fetching admin stats.')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user])

  if (!user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
        <h2>You must be logged in as an admin to view this page.</h2>
      </div>
    )
  }

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard...</div>
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
        <h2>{error}</h2>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div
      style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'var(--color-text)' }}
    >
      <h1 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Admin Dashboard</h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            padding: '1.5rem',
            borderRadius: '8px',
            backgroundColor: 'var(--color-bg-card)',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}
        >
          <h3>Total Analyses Run</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0' }}>
            {stats.total_analyses}
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
        }}
      >
        <div
          style={{
            padding: '1.5rem',
            borderRadius: '8px',
            backgroundColor: 'var(--color-bg-card)',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        >
          <h3>Most Popular Career Tracks</h3>
          <ul style={{ paddingLeft: '1.5rem', marginTop: '1rem' }}>
            {stats.popular_roles.map((item, i) => (
              <li key={i} style={{ marginBottom: '0.5rem' }}>
                <strong>{item.role}</strong>: {item.count} analyses
              </li>
            ))}
            {stats.popular_roles.length === 0 && <li>No data available</li>}
          </ul>
        </div>

        <div
          style={{
            padding: '1.5rem',
            borderRadius: '8px',
            backgroundColor: 'var(--color-bg-card)',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        >
          <h3>Most Commonly Missing Skills</h3>
          <ul style={{ paddingLeft: '1.5rem', marginTop: '1rem' }}>
            {stats.top_missing_skills.map((item, i) => (
              <li key={i} style={{ marginBottom: '0.5rem' }}>
                <strong>{item.skill}</strong>: missing in {item.count} analyses
              </li>
            ))}
            {stats.top_missing_skills.length === 0 && <li>No data available</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
