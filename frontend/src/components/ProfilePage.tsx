import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { getConsentPreferences, saveConsentPreferences } from '../utils/cookieConsent'
import { requestNotificationPermission, saveNotificationPreferences } from '../utils/notification'

const MAX_BIO_LENGTH = 250

type NotificationPreferences = { in_app: boolean; browser: boolean }
const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = { in_app: true, browser: false }

export const ProfilePage: React.FC = () => {
  const { user, updateProfileSession, exportUserData } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [weeklyDigestOptIn, setWeeklyDigestOptIn] = useState(false)
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  )
  const [analyticsConsent, setAnalyticsConsentState] = useState<boolean>(
    () => getConsentPreferences().analytics
  )
  const [resumeRoastConsent, setResumeRoastConsentState] = useState<boolean>(
    () => getConsentPreferences().resumeRoast
  )
  const [isEditing, setIsEditing] = useState(false)

  const [originalUsername, setOriginalUsername] = useState('')
  const [originalEmail, setOriginalEmail] = useState('')
  const [originalBio, setOriginalBio] = useState('')
  const [originalOptIn, setOriginalOptIn] = useState(false)
  const [originalNotificationPreferences, setOriginalNotificationPreferences] =
    useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES)
  const [originalAnalyticsConsent, setOriginalAnalyticsConsent] = useState<boolean>(
    () => getConsentPreferences().analytics
  )
  const [originalResumeRoastConsent, setOriginalResumeRoastConsent] = useState<boolean>(
    () => getConsentPreferences().resumeRoast
  )

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const fetchProfile = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await api.get('/api/profile/')
        const data = response.data
        const prefs: NotificationPreferences = {
          in_app: data.notification_preferences?.in_app !== false,
          browser: data.notification_preferences?.browser === true,
        }
        setUsername(data.username)
        setEmail(data.email || '')
        setBio(data.bio || data.headline || '')
        setWeeklyDigestOptIn(!!data.weekly_digest_opt_in)
        setNotificationPreferences(prefs)
        saveNotificationPreferences(prefs)
        setOriginalUsername(data.username)
        setOriginalEmail(data.email || '')
        setOriginalBio(data.bio || data.headline || '')
        setOriginalOptIn(!!data.weekly_digest_opt_in)
        setOriginalNotificationPreferences(prefs)

        const consentPrefs = getConsentPreferences()
        setAnalyticsConsentState(consentPrefs.analytics)
        setResumeRoastConsentState(consentPrefs.resumeRoast)
        setOriginalAnalyticsConsent(consentPrefs.analytics)
        setOriginalResumeRoastConsent(consentPrefs.resumeRoast)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    setBio(originalBio)
    setWeeklyDigestOptIn(originalOptIn)
    setNotificationPreferences(originalNotificationPreferences)
    saveNotificationPreferences(originalNotificationPreferences)
    setAnalyticsConsentState(originalAnalyticsConsent)
    setResumeRoastConsentState(originalResumeRoastConsent)
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to export your data.')
    } finally {
      setExporting(false)
    }
  }

  const updateNotificationPreference = async (
    channel: keyof NotificationPreferences,
    enabled: boolean
  ) => {
    if (channel === 'browser' && enabled) {
      const permission = await requestNotificationPermission()
      if (permission !== 'granted') {
        setError(
          permission === 'denied'
            ? 'Browser notifications are blocked by your browser. Allow notifications for this site and try again.'
            : 'Browser notification permission was not granted.'
        )
        return
      }
      setError(null)
    }
    setNotificationPreferences((current) => ({ ...current, [channel]: enabled }))
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

    // Basic content sanitization on the client: strip HTML tags and trim excessive whitespace
    const sanitizedBio = bio.replace(/<[^>]*>?/gm, '').trim()
    if (sanitizedBio.length > MAX_BIO_LENGTH) {
      setError(`Bio / headline cannot exceed ${MAX_BIO_LENGTH} characters.`)
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccessMsg(null)

      const response = await api.put('/api/profile/', {
        username,
        email,
        bio: sanitizedBio,
        weekly_digest_opt_in: weeklyDigestOptIn,
        notification_preferences: notificationPreferences,
      })

      const updated = response.data
      const savedPrefs: NotificationPreferences = {
        in_app: updated.notification_preferences?.in_app !== false,
        browser: updated.notification_preferences?.browser === true,
      }
      setUsername(updated.username)
      setEmail(updated.email)
      setBio(updated.bio || updated.headline || '')
      setWeeklyDigestOptIn(!!updated.weekly_digest_opt_in)
      setNotificationPreferences(savedPrefs)
      saveNotificationPreferences(savedPrefs)
      setOriginalUsername(updated.username)
      setOriginalEmail(updated.email)
      setOriginalBio(updated.bio || updated.headline || '')
      setOriginalOptIn(!!updated.weekly_digest_opt_in)
      setOriginalNotificationPreferences(savedPrefs)

      saveConsentPreferences({
        analytics: analyticsConsent,
        resumeRoast: resumeRoastConsent,
      })
      setOriginalAnalyticsConsent(analyticsConsent)
      setOriginalResumeRoastConsent(resumeRoastConsent)

      updateProfileSession(updated.username)
      setSuccessMsg('Profile and notification preferences updated successfully!')
      setIsEditing(false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.response?.data) {
        const errors = err.response.data
        if (errors.username) {
          setError(Array.isArray(errors.username) ? errors.username[0] : errors.username)
        } else if (errors.email) {
          setError(Array.isArray(errors.email) ? errors.email[0] : errors.email)
        } else if (errors.bio) {
          setError(Array.isArray(errors.bio) ? errors.bio[0] : errors.bio)
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

  const preferenceCard = (
    id: string,
    label: string,
    description: string,
    defaultText: string,
    checked: boolean,
    onChange: (enabled: boolean) => void
  ) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--control-border)',
        background: 'rgba(255, 255, 255, 0.02)',
        gap: '16px',
      }}
    >
      <div>
        <label
          htmlFor={id}
          style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: 'var(--heading-text)',
            display: 'block',
          }}
        >
          {label}
        </label>
        <span
          style={{
            fontSize: '0.8rem',
            color: 'var(--muted-text)',
            display: 'block',
            marginTop: '3px',
          }}
        >
          {description}
        </span>
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--muted-text)',
            display: 'block',
            marginTop: '4px',
          }}
        >
          Default: {defaultText}
        </span>
      </div>
      <div
        className="form-check form-switch"
        style={{ margin: 0, paddingLeft: '2.5em', flexShrink: 0 }}
      >
        <input
          id={id}
          className="form-check-input"
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={!isEditing || saving}
          style={{ width: '2.2em', height: '1.2em', cursor: isEditing ? 'pointer' : 'not-allowed' }}
        />
      </div>
    </div>
  )

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
        </div>
      </div>
    )
  }

  return (
    <div
      className="app-container"
      style={{ display: 'flex', justifyContent: 'center', padding: '40px 20px' }}
    >
      <div className="analysis-card" style={{ maxWidth: '700px', width: '100%', padding: '30px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
            borderBottom: '1px solid var(--surface-border)',
            paddingBottom: '16px',
          }}
        >
          <span style={{ fontSize: '2rem' }}>👤</span>
          <div>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: 0,
                color: 'var(--heading-text)',
              }}
            >
              Account Profile
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted-text)', margin: '4px 0 0 0' }}>
              Manage your account and notification preferences
            </p>
          </div>
        </div>

        {loading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '40px 0',
              gap: '12px',
            }}
          >
            <div className="spinner" style={{ borderTopColor: 'var(--color-primary)' }} />
            <p style={{ color: 'var(--muted-text)' }}>Fetching profile information...</p>
          </div>
        ) : (
          <form
            onSubmit={handleSave}
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            {error && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid var(--color-danger)',
                  color: 'var(--color-danger)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div
                style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid var(--color-accent)',
                  color: 'var(--color-accent)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>✅</span>
                <span>{successMsg}</span>
              </div>
            )}

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
                borderTop: '1px solid var(--surface-border)',
                paddingTop: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--heading-text)' }}>
                  🔔 Notification Preferences
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted-text)', margin: '4px 0 0' }}>
                  Manage all optional notification channels in one place. Changes are saved to your
                  account.
                </p>
              </div>
              {preferenceCard(
                'in-app-notifications-toggle',
                '🔔 In-app notifications',
                'Show notification messages inside Resume Analyzer.',
                'On (opt-out)',
                notificationPreferences.in_app,
                (enabled) => updateNotificationPreference('in_app', enabled)
              )}
              {preferenceCard(
                'browser-notifications-toggle',
                '🌐 Browser notifications',
                'Show a native browser notification when analysis finishes in a background tab.',
                'Off (opt-in)',
                notificationPreferences.browser,
                (enabled) => updateNotificationPreference('browser', enabled)
              )}
              {preferenceCard(
                'weekly-digest-toggle',
                '📧 Weekly Resume-Tips Email Digest',
                'Receive actionable resume guidelines and score improvement nudges once a week.',
                'Off (opt-in)',
                weeklyDigestOptIn,
                setWeeklyDigestOptIn
              )}
            </div>

            {/* Optional Data Collection: Analytics (#536) */}
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
                  htmlFor="profile-analytics-toggle"
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: 'var(--heading-text)',
                    display: 'block',
                  }}
                >
                  📊 Analytics & Performance Telemetry
                </label>
                <span
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--muted-text)',
                    display: 'block',
                    marginTop: '2px',
                  }}
                >
                  Allow anonymous usage telemetry to diagnose issues and optimize ATS parsing
                  accuracy (Off by default).
                </span>
              </div>
              <div className="form-check form-switch" style={{ margin: 0, paddingLeft: '2.5em' }}>
                <input
                  id="profile-analytics-toggle"
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  checked={analyticsConsent}
                  onChange={(e) => setAnalyticsConsentState(e.target.checked)}
                  disabled={!isEditing || saving}
                  style={{
                    width: '2.2em',
                    height: '1.2em',
                    cursor: isEditing ? 'pointer' : 'not-allowed',
                  }}
                />
              </div>
            </div>

            {/* Optional Data Collection: Resume Roast (#536) */}
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
                  htmlFor="profile-roast-toggle"
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: 'var(--heading-text)',
                    display: 'block',
                  }}
                >
                  🔥 AI Resume Roast Feedback Consent
                </label>
                <span
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--muted-text)',
                    display: 'block',
                    marginTop: '2px',
                  }}
                >
                  Opt in to allow processing alternate humorous and spicy feedback tone suggestions
                  (Off by default).
                </span>
              </div>
              <div className="form-check form-switch" style={{ margin: 0, paddingLeft: '2.5em' }}>
                <input
                  id="profile-roast-toggle"
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  checked={resumeRoastConsent}
                  onChange={(e) => setResumeRoastConsentState(e.target.checked)}
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
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                      style={{ width: '1rem', height: '1rem' }}
                    />
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
                        <span
                          className="spinner-border spinner-border-sm"
                          role="status"
                          aria-hidden="true"
                          style={{ width: '1rem', height: '1rem' }}
                        />
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
