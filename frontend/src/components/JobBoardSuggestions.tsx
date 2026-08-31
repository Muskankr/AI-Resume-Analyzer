import { useState, useEffect } from 'react'
import axios from 'axios'
import { api } from '../api/client'

export interface JobListing {
  title: string
  company: string
  location: string
  url: string
  description: string
  source: string
}

interface JobBoardSuggestionsProps {
  skills: string[]
  track: string
}

export function JobBoardSuggestions({ skills, track }: JobBoardSuggestionsProps) {
  const [jobs, setJobs] = useState<JobListing[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attribution, setAttribution] = useState<string | null>(null)

  useEffect(() => {
    async function fetchJobs() {
      if (!track && skills.length === 0) return

      setLoading(true)
      setError(null)

      try {
        const response = await api.get('/job-board/suggest/', {
          params: {
            track: track || undefined,
            skills: skills.length > 0 ? skills.join(',') : undefined,
          },
        })
        setJobs(response.data.jobs || [])
        setAttribution(response.data.attribution || null)
      } catch (err) {
        setError('Failed to fetch job suggestions. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [skills, track])

  if (loading) {
    return (
      <div className="card mt-4 p-4 shadow-sm">
        <h4>🔍 Finding open roles...</h4>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card mt-4 p-4 shadow-sm">
        <h4>💼 Suggested Open Roles</h4>
        <p className="text-danger">{error}</p>
      </div>
    )
  }

  if (jobs.length === 0) {
    return null
  }

  return (
    <div className="card mt-4 p-4 shadow-sm job-suggestions">
      <h4>💼 Suggested Open Roles</h4>
      <p className="text-muted small mb-3">
        Based on your detected skills and {track ? `career track (${track})` : 'profile'}.
      </p>

      <div className="list-group mb-3">
        {jobs.map((job, idx) => (
          <a
            key={idx}
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="list-group-item list-group-item-action flex-column align-items-start mb-2 border rounded"
          >
            <div className="d-flex w-100 justify-content-between">
              <h5 className="mb-1 text-primary">{job.title}</h5>
              <small>{job.location}</small>
            </div>
            <p className="mb-1 fw-bold">{job.company}</p>
            <p className="mb-1 text-muted small">
              {job.description.length > 150
                ? job.description.substring(0, 150) + '...'
                : job.description}
            </p>
          </a>
        ))}
      </div>

      {attribution && <div className="text-end text-muted small fst-italic">* {attribution}</div>}
    </div>
  )
}
