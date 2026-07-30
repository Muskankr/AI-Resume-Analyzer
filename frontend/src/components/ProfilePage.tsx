import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

export const ProfilePage: React.FC = () => {
  const { user, updateProfileSession } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  
  const [originalUsername, setOriginalUsername] = useState('')
  const [originalEmail, setOriginalEmail] = useState('')
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const fetchProfile = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await axios.get(`${BACKEND}/api/profile/`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        })
        const data = response.data
        setUsername(data.username)
        setEmail(data.email || '')
        setOriginalUsername(data.username)
        setOriginalEmail(data.email || '')
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load profile details.')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user])

  const handleCancel = () => {
    setUsername(originalUsername)
    setEmail(originalEmail)
    setIsEditing(false)
    setError(null)
    setSuccessMsg(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Client-side validations
    if (!username.trim()) {
      setError('Username cannot be empty.')
      return
    }
    if (!email.trim()) {
      setError('Email cannot be empty.')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please provide a valid email address.')
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccessMsg(null)
      
      const response = await axios.put(
        `${BACKEND}/api/profile/`,
        { username, email },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      )

      const updated = response.data
      setUsername(updated.username)
      setEmail(updated.email)
      setOriginalUsername(updated.username)
      setOriginalEmail(updated.email)
      
      // Update global context session
      updateProfileSession(updated.username)

      setSuccessMsg('Profile updated successfully!')
      setIsEditing(false)
    } catch (err: any) {
      if (err.response?.data) {
        const errors = err.response.data
        if (errors.username) {
          setError(Array.isArray(errors.username) ? errors.username[0] : errors.username)
        } else if (errors.email) {
          setError(Array.isArray(errors.email) ? errors.email[0] : errors.email)
        } else {
          setError(errors.error || 'Failed to update profile details.')
        }
      } else {
        setError('An unexpected error occurred.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', padding: '60px 20px' }}>
        <div className="analysis-card text-center" style={{ maxWidth: '400px', width: '100%', padding: '40px' }}>
          <h2 style={{ color: 'var(--color-danger)', marginBottom: '16px' }}>Access Denied</h2>
          <p style={{ color: 'var(--muted-text)', marginBottom: '24px' }}>Please log in to manage your account details.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container" style={{ display: 'flex', justifyContent: 'center', padding: '40px 20px' }}>
      <div className="analysis-card" style={{ maxWidth: '600px', width: '100%', padding: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--surface-border)', paddingBottom: '16px' }}>
          <span style={{ fontSize: '2rem' }}>👤</span>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, color: 'var(--heading-text)' }}>Account Profile</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted-text)', margin: '4px 0 0 0' }}>Manage your account username and contact details</p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '12px' }}>
            <div className="spinner" style={{ borderTopColor: 'var(--color-primary)' }} />
            <p style={{ color: 'var(--muted-text)' }}>Fetching profile information...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--color-danger)',
                color: 'var(--color-danger)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid var(--color-accent)',
                color: 'var(--color-accent)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>✅</span>
                <span>{successMsg}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="profile-username" style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--heading-text)' }}>Username</label>
              <input
                id="profile-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!isEditing || saving}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--control-border)',
                  background: isEditing ? 'var(--control-bg)' : 'var(--upload-bg)',
                  color: 'var(--control-text)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  cursor: isEditing ? 'text' : 'not-allowed'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="profile-email" style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--heading-text)' }}>Email Address</label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isEditing || saving}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--control-border)',
                  background: isEditing ? 'var(--control-bg)' : 'var(--upload-bg)',
                  color: 'var(--control-text)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  cursor: isEditing ? 'text' : 'not-allowed'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', borderTop: '1px solid var(--surface-border)', paddingTop: '20px' }}>
              {!isEditing ? (
                <button
                  type="button"
                  className="app-btn app-btn--primary"
                  onClick={() => {
                    setIsEditing(true)
                    setSuccessMsg(null)
                  }}
                  style={{ minWidth: '100px' }}
                >
                  ✏️ Edit Profile
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="app-btn app-btn--secondary"
                    onClick={handleCancel}
                    disabled={saving}
                    style={{ minWidth: '100px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="app-btn app-btn--primary"
                    disabled={saving}
                    style={{ minWidth: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: '1rem', height: '1rem' }} />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
