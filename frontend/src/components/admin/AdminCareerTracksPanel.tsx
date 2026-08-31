import React, { useState, useEffect } from 'react'
import {
  careerTrackManager,
  CareerTrackDefinition,
} from '../../services/careerTrackManager'
import { useAdminAuth } from '../../hooks/useAdminAuth'
import './AdminCareerTracksPanel.css'

export const AdminCareerTracksPanel: React.FC = () => {
  const { user, isAdminOrMaintainer, setRole } = useAdminAuth()
  const [tracks, setTracks] = useState<CareerTrackDefinition[]>(() =>
    careerTrackManager.getTracks()
  )
  const [searchQuery, setSearchQuery] = useState('')

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    icon: '🎯',
    description: '',
    requiredSkills: '',
    optionalSkills: '',
    targetExperienceYears: 3,
    minScoreThreshold: 75,
  })

  useEffect(() => {
    const unsubscribe = careerTrackManager.subscribe(() => {
      setTracks(careerTrackManager.getTracks())
    })
    return unsubscribe
  }, [])

  if (!isAdminOrMaintainer) {
    return (
      <div className="admin-access-denied">
        <div className="access-denied-card">
          <span className="denied-icon">🔒</span>
          <h2>Access Restricted</h2>
          <p>
            You must be logged in as an <strong>Admin</strong> or <strong>Maintainer</strong> to manage Career Tracks and Skill Requirements.
          </p>
          <div className="demo-auth-actions">
            <p className="demo-label">Simulate Admin Role for Testing:</p>
            <button className="btn-admin-login" onClick={() => setRole('admin')}>
              Authenticate as Admin
            </button>
          </div>
        </div>
      </div>
    )
  }

  const filteredTracks = tracks.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenAddModal = () => {
    setEditingTrackId(null)
    setFormData({
      name: '',
      icon: '🎯',
      description: '',
      requiredSkills: '',
      optionalSkills: '',
      targetExperienceYears: 3,
      minScoreThreshold: 75,
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (track: CareerTrackDefinition) => {
    setEditingTrackId(track.id)
    setFormData({
      name: track.name,
      icon: track.icon,
      description: track.description,
      requiredSkills: track.requiredSkills.join(', '),
      optionalSkills: track.optionalSkills.join(', '),
      targetExperienceYears: track.targetExperienceYears,
      minScoreThreshold: track.minScoreThreshold,
    })
    setIsModalOpen(true)
  }

  const handleSaveTrack = (e: React.FormEvent) => {
    e.preventDefault()
    const reqArray = formData.requiredSkills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const optArray = formData.optionalSkills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    if (editingTrackId) {
      careerTrackManager.updateTrack(editingTrackId, {
        name: formData.name,
        icon: formData.icon,
        description: formData.description,
        requiredSkills: reqArray,
        optionalSkills: optArray,
        targetExperienceYears: formData.targetExperienceYears,
        minScoreThreshold: formData.minScoreThreshold,
      })
    } else {
      careerTrackManager.addTrack({
        name: formData.name,
        icon: formData.icon,
        description: formData.description,
        requiredSkills: reqArray,
        optionalSkills: optArray,
        targetExperienceYears: formData.targetExperienceYears,
        minScoreThreshold: formData.minScoreThreshold,
      })
    }

    setIsModalOpen(false)
  }

  const handleDeleteTrack = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete career track "${name}"?`)) {
      careerTrackManager.deleteTrack(id)
    }
  }

  const handleResetDefaults = () => {
    if (window.confirm('Reset all career tracks to default system configuration?')) {
      careerTrackManager.resetToDefaults()
    }
  }

  return (
    <div className="admin-panel-container">
      <div className="admin-panel-header">
        <div className="admin-header-title">
          <span className="admin-header-icon">🚀</span>
          <div>
            <h2>Career Tracks Admin Panel</h2>
            <p>Define career tracks, required skill sets, and score thresholds in real time.</p>
          </div>
        </div>

        <div className="admin-header-actions">
          <button className="btn-secondary-reset" onClick={handleResetDefaults}>
            Reset Defaults
          </button>
          <button className="btn-primary-add" onClick={handleOpenAddModal}>
            + Create Career Track
          </button>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search career tracks by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="tracks-grid">
        {filteredTracks.length === 0 ? (
          <div className="admin-empty-state">
            <p>No career tracks found matching your search.</p>
          </div>
        ) : (
          filteredTracks.map((track) => (
            <div key={track.id} className="track-admin-card">
              <div className="track-card-header">
                <div className="track-title-row">
                  <span className="track-icon">{track.icon}</span>
                  <div>
                    <h3 className="track-name">{track.name}</h3>
                    <span className="track-meta">
                      Exp: {track.targetExperienceYears}+ yrs • Min Score: {track.minScoreThreshold}%
                    </span>
                  </div>
                </div>
                {track.isCustom && <span className="custom-track-badge">Custom</span>}
              </div>

              <p className="track-description">{track.description}</p>

              <div className="track-skills-section">
                <div className="skills-group">
                  <span className="group-label required">Required Skills ({track.requiredSkills.length}):</span>
                  <div className="skill-chips-row">
                    {track.requiredSkills.map((sk, idx) => (
                      <span key={idx} className="skill-chip required-chip">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="skills-group">
                  <span className="group-label optional">Optional / Recommended ({track.optionalSkills.length}):</span>
                  <div className="skill-chips-row">
                    {track.optionalSkills.map((sk, idx) => (
                      <span key={idx} className="skill-chip optional-chip">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="track-card-footer">
                <span className="updated-date">Updated: {track.updatedAt}</span>
                <div className="track-card-actions">
                  <button className="btn-icon-edit" onClick={() => handleOpenEditModal(track)}>
                    Edit
                  </button>
                  <button
                    className="btn-icon-delete"
                    onClick={() => handleDeleteTrack(track.id, track.name)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingTrackId ? 'Edit Career Track' : 'Create Career Track'}</h3>
              <button className="btn-close-modal" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTrack} className="admin-form">
              <div className="form-row-dual">
                <div className="form-group">
                  <label>Track Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fullstack Engineer"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group short">
                  <label>Emoji Icon</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 💻"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Track Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Summary of track role and expectations..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Required Skill Set (comma-separated)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. React.js, Node.js, TypeScript, PostgreSQL"
                  value={formData.requiredSkills}
                  onChange={(e) => setFormData({ ...formData, requiredSkills: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Optional / Recommended Skills (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Docker, Redis, GraphQL, TailwindCSS"
                  value={formData.optionalSkills}
                  onChange={(e) => setFormData({ ...formData, optionalSkills: e.target.value })}
                />
              </div>

              <div className="form-row-dual">
                <div className="form-group">
                  <label>Target Exp (Years)</label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={formData.targetExperienceYears}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        targetExperienceYears: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Min Readiness Score ({formData.minScoreThreshold}%)</label>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={formData.minScoreThreshold}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minScoreThreshold: parseInt(e.target.value, 10),
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Save Track
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
