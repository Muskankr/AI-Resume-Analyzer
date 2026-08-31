import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { ScoreTimelineChart, type ChartDataPoint } from './ScoreTimelineChart'
import { ResumeHistoryTable, type ResumeHistoryItem } from './ResumeHistoryTable'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const Dashboard: React.FC = () => {
  const [history, setHistory] = useState<ResumeHistoryItem[]>([])
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('token')
      if (!token) {
        setError('You must be logged in to view the dashboard.')
        setLoading(false)
        return
      }

      // The new endpoint created in views.py
      const response = await axios.get(`${API_BASE}/api/dashboard/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      // Parse history list
      // Response might be a paginated object { results: [...] } or an array [...]
      const results = Array.isArray(response.data) ? response.data : response.data.results

      if (!results) {
        throw new Error('Invalid response format')
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedHistory: ResumeHistoryItem[] = results.map((item: any) => ({
        id: item.id,
        fileName: item.file_name,
        score: item.score,
        targetRole: item.target_role,
        createdAt: new Date(item.created_at).toLocaleDateString(),
      }))

      setHistory(formattedHistory)

      // Sort by date ascending for the chart
      const chartPoints: ChartDataPoint[] = results
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => ({
          date: new Date(item.created_at).toLocaleDateString(),
          score: item.score,
          fileName: item.file_name,
          rawDate: new Date(item.created_at),
        }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .sort((a: any, b: any) => a.rawDate.getTime() - b.rawDate.getTime())
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
        .map(({ rawDate, ...rest }: any) => rest)

      setChartData(chartPoints)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData()
  }, [])

  const handleDelete = async (id: number) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this analysis? This action cannot be undone.'
      )
    ) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_BASE}/api/dashboard/${id}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      // Refresh the data
      fetchDashboardData()
    } catch (err) {
      console.error('Error deleting analysis:', err)
      alert('Failed to delete the analysis. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-5">
        <h1 className="fw-bold mb-0">Your Dashboard</h1>
      </div>

      <div className="row">
        <div className="col-12 mb-4">
          <ScoreTimelineChart data={chartData} />
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-12">
          <h4 className="fw-semibold mb-3">Upload History</h4>
          <ResumeHistoryTable history={history} onDelete={handleDelete} />
        </div>
      </div>
    </div>
  )
}
