import React from 'react'
import { Trash2, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface ResumeHistoryItem {
  id: number
  fileName: string
  score: number
  targetRole: string
  createdAt: string
}

interface ResumeHistoryTableProps {
  history: ResumeHistoryItem[]
  onDelete: (id: number) => void
}

export const ResumeHistoryTable: React.FC<ResumeHistoryTableProps> = ({ history, onDelete }) => {
  if (!history || history.length === 0) {
    return (
      <div className="card shadow-sm border-0">
        <div className="card-body text-center py-5">
          <p className="text-muted mb-0">No past resumes found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th scope="col" className="ps-4">
                  Date
                </th>
                <th scope="col">File Name</th>
                <th scope="col">Target Role</th>
                <th scope="col">Score</th>
                <th scope="col" className="text-end pe-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  <td className="ps-4">{item.createdAt}</td>
                  <td className="text-truncate" style={{ maxWidth: '200px' }} title={item.fileName}>
                    {item.fileName}
                  </td>
                  <td>{item.targetRole || 'Not specified'}</td>
                  <td>
                    <span
                      className={`badge ${item.score >= 80 ? 'bg-success' : item.score >= 60 ? 'bg-warning text-dark' : 'bg-danger'}`}
                    >
                      {item.score}%
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <Link
                      to={`/history/${item.id}`}
                      className="btn btn-sm btn-outline-primary me-2"
                    >
                      <ExternalLink size={14} className="me-1" /> View
                    </Link>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => onDelete(item.id)}
                      title="Delete Analysis"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
