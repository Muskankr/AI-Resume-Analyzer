import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Shield,
  User,
  Globe,
  Laptop,
  Smartphone,
  Trash2,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'

interface Session {
  id: number
  session_key: string
  ip_address: string | null
  device_info: string | null
  last_active: string
  created_at: string
  is_current: boolean
}

export const ProfilePage: React.FC = () => {
  const { user, updateProfileSession, exportUserData } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Set default tab based on URL param or route path
  const isSecurityRoute = window.location.pathname.endsWith('/security')
  const initialTab =
    searchParams.get('tab') === 'security' || isSecurityRoute ? 'security' : 'profile'
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>(initialTab)

  // Profile Form States
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [weeklyDigestOptIn, setWeeklyDigestOptIn] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const [originalUsername, setOriginalUsername] = useState('')
  const [originalEmail, setOriginalEmail] = useState('')
  const [originalOptIn, setOriginalOptIn] = useState(false)

  // Active Sessions States
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [revokingKey, setRevokingKey] = useState<string | null>(null)

  // Generic States
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Fetch profile details
  useEffect(() => {
    if (!user) return

    const fetchProfile = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await api.get('/api/profile/')
        const data = response.data
        setUsername(data.username)
        setEmail(data.email || '')
        setWeeklyDigestOptIn(!!data.weekly_digest_opt_in)
        setOriginalUsername(data.username)
        setOriginalEmail(data.email || '')
        setOriginalOptIn(!!data.weekly_digest_opt_in)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load profile details.')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user])

  // Fetch active login sessions
  const fetchSessions = async () => {
    try {
      setLoadingSessions(true)
      const response = await api.get('/api/auth/sessions/')
      setSessions(response.data)
    } catch (err: any) {
      console.error('Failed to load active sessions', err)
    } finally {
      setLoadingSessions(false)
    }
  }

  // Fetch sessions when security tab becomes active
  useEffect(() => {
    if (activeTab === 'security' && user) {
      fetchSessions()
    }
  }, [activeTab, user])

  const handleCancel = () => {
    setUsername(originalUsername)
    setEmail(originalEmail)
    setWeeklyDigestOptIn(originalOptIn)
    setIsEditing(false)
    setError(null)
    setSuccessMsg(null)
  }

  const handleExportData = async () => {
    try {
      setExporting(true)
      setError(null)
      setSuccessMsg(null)
      await exportUserData()
      setSuccessMsg('Your account data has been downloaded successfully.')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to export your data.')
    } finally {
      setExporting(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

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

      const response = await api.put('/api/profile/', {
        username,
        email,
        weekly_digest_opt_in: weeklyDigestOptIn,
      })

      const updated = response.data
      setUsername(updated.username)
      setEmail(updated.email)
      setWeeklyDigestOptIn(!!updated.weekly_digest_opt_in)
      setOriginalUsername(updated.username)
      setOriginalEmail(updated.email)
      setOriginalOptIn(!!updated.weekly_digest_opt_in)

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

  const handleRevokeSession = async (sessionKey: string) => {
    try {
      setRevokingKey(sessionKey)
      setError(null)
      setSuccessMsg(null)

      await api.post('/api/auth/sessions/revoke/', { session_key: sessionKey })
      setSuccessMsg('Session revoked successfully.')

      setSessions((prev) => prev.filter((s) => s.session_key !== sessionKey))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to revoke session.')
    } finally {
      setRevokingKey(null)
    }
  }

  const getSessionDeviceIcon = (deviceInfo: string | null) => {
    if (!deviceInfo) return <Globe size={20} />
    const lower = deviceInfo.toLowerCase()
    if (lower.includes('phone') || lower.includes('android') || lower.includes('ios')) {
      return <Smartphone size={20} />
    }
    return <Laptop size={20} />
  }

  const formatLastActive = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      const diffMs = Date.now() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins < 1) return 'Just active'
      if (diffMins < 60) return `${diffMins}m ago`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h ago`
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  if (!user) {
    return (
      <div
        className="app-container"
        style={{ display: 'flex', justifyContent: 'center', padding: '60px 20px' }}
      >
        <div
          className="analysis-card text-center"
          style={{ maxWidth: '400px', width: '100%', padding: '40px' }}
        >
          <h2 style={{ color: 'var(--color-danger)', marginBottom: '16px' }}>Access Denied</h2>
          <p style={{ color: 'var(--muted-text)', marginBottom: '24px' }}>
            Please log in to manage your account details.
          </p>
          <button onClick={() => navigate('/')} className="app-btn app-btn--primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="app-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px',
      }}
    >
      <div
        style={{
          alignSelf: 'flex-start',
          maxWidth: '850px',
          width: '100%',
          margin: '0 auto 20px auto',
        }}
      >
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted-text)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            padding: 0,
            fontSize: '0.95rem',
          }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      <div
        className="analysis-card"
        style={{ maxWidth: '850px', width: '100%', padding: 0, overflow: 'hidden' }}
      >
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--surface-border)',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <button
            onClick={() => {
              setActiveTab('profile')
              setError(null)
              setSuccessMsg(null)
            }}
            style={{
              flex: 1,
              padding: '16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'profile' ? '2px solid var(--color-primary)' : 'none',
              color: activeTab === 'profile' ? '#fff' : 'var(--muted-text)',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <User size={16} /> Profile Information
          </button>
          <button
            onClick={() => {
              setActiveTab('security')
              setError(null)
              setSuccessMsg(null)
            }}
            style={{
              flex: 1,
              padding: '16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'security' ? '2px solid var(--color-primary)' : 'none',
              color: activeTab === 'security' ? '#fff' : 'var(--muted-text)',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Shield size={16} /> Security & Sessions
          </button>
        </div>

        <div style={{ padding: '32px' }}>
          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid var(--color-danger)',
                color: 'var(--color-danger)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px',
              }}
            >
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid var(--color-accent)',
                color: 'var(--color-accent)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px',
              }}
            >
              <CheckCircle size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'profile' &&
            (loading ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '40px 0',
                  gap: '12px',
                }}
              >
                <Loader2 className="spin" size={32} style={{ color: 'var(--color-primary)' }} />
                <p style={{ color: 'var(--muted-text)' }}>Fetching profile information...</p>
              </div>
            ) : (
              <form
                onSubmit={handleSave}
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label
                    htmlFor="profile-username"
                    style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--heading-text)' }}
                  >
                    Username
                  </label>
                  <input
                    id="profile-username"
                    name="username"
                    type="text"
                    autoComplete="username"
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
                      cursor: isEditing ? 'text' : 'not-allowed',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label
                    htmlFor="profile-email"
                    style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--heading-text)' }}
                  >
                    Email Address
                  </label>
                  <input
                    id="profile-email"
                    name="email"
                    type="email"
                    autoComplete="email"
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
                      cursor: isEditing ? 'text' : 'not-allowed',
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--control-border)',
                    background: 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <div>
                    <label
                      htmlFor="weekly-digest-toggle"
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        color: 'var(--heading-text)',
                        display: 'block',
                      }}
                    >
                      📧 Weekly Resume-Tips Email Digest
                    </label>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--muted-text)',
                        display: 'block',
                        marginTop: '2px',
                      }}
                    >
                      Receive actionable resume guidelines and score improvement nudges once a week.
                    </span>
                  </div>
                  <div
                    className="form-check form-switch"
                    style={{ margin: 0, paddingLeft: '2.5em' }}
                  >
                    <input
                      id="weekly-digest-toggle"
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      checked={weeklyDigestOptIn}
                      onChange={(e) => setWeeklyDigestOptIn(e.target.checked)}
                      disabled={!isEditing || saving}
                      style={{
                        width: '2.2em',
                        height: '1.2em',
                        cursor: isEditing ? 'pointer' : 'not-allowed',
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    marginTop: '10px',
                    borderTop: '1px solid var(--surface-border)',
                    paddingTop: '20px',
                  }}
                >
                  <button
                    type="button"
                    className="app-btn app-btn--secondary"
                    onClick={handleExportData}
                    disabled={exporting || saving}
                    style={{
                      minWidth: '140px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    {exporting ? (
                      <>
                        <Loader2 className="spin" size={14} />
                        Exporting...
                      </>
                    ) : (
                      'Export My Data'
                    )}
                  </button>

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
                        style={{
                          minWidth: '100px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="spin" size={14} />
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
            ))}

          {activeTab === 'security' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h3
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: '700',
                    color: '#fff',
                    margin: '0 0 4px 0',
                  }}
                >
                  Active Login Sessions
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted-text)', margin: 0 }}>
                  You are currently logged into the following sessions. Revoke any sessions you
                  don't recognize to secure your account.
                </p>
              </div>

              {loadingSessions ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '40px 0',
                    gap: '12px',
                  }}
                >
                  <Loader2 className="spin" size={32} style={{ color: 'var(--color-primary)' }} />
                  <p style={{ color: 'var(--muted-text)' }}>Loading active sessions...</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '18px 20px',
                        border: '1px solid var(--surface-border)',
                        borderRadius: 'var(--radius-md, 8px)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        transition: 'background 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'rgba(99, 102, 241, 0.1)',
                            color: '#6366f1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {getSessionDeviceIcon(session.device_info)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '600', color: '#fff', fontSize: '0.98rem' }}>
                              {session.device_info || 'Unknown Browser & OS'}
                            </span>
                            {session.is_current && (
                              <span
                                style={{
                                  background: 'rgba(16, 185, 129, 0.12)',
                                  color: '#10b981',
                                  border: '1px solid rgba(16, 185, 129, 0.2)',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                }}
                              >
                                Current Session
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              marginTop: '4px',
                              fontSize: '0.82rem',
                              color: 'var(--muted-text)',
                            }}
                          >
                            <span>IP: {session.ip_address || 'Unknown'}</span>
                            <span
                              style={{
                                width: '4px',
                                height: '4px',
                                background: 'var(--muted-text)',
                                borderRadius: '50%',
                              }}
                            />
                            <span>Last active: {formatLastActive(session.last_active)}</span>
                          </div>
                        </div>
                      </div>

                      {!session.is_current && (
                        <button
                          onClick={() => handleRevokeSession(session.session_key)}
                          disabled={revokingKey === session.session_key}
                          className="app-btn app-btn--secondary"
                          style={{
                            padding: '8px 12px',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            background: 'rgba(239, 68, 68, 0.04)',
                            color: '#ef4444',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          {revokingKey === session.session_key ? (
                            <Loader2 className="spin" size={14} />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}

                  {sessions.length === 0 && (
                    <div
                      style={{ textAlign: 'center', padding: '30px', color: 'var(--muted-text)' }}
                    >
                      No active sessions found.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
