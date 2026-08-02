import React, { useState, useRef } from 'react'
import axios from 'axios'
import type { AuthUser } from '../hooks/useAuth'

interface ProfileModalProps {
  user: AuthUser
  onClose: () => void
  onAvatarUpdated: (newUrl: string | null) => void
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onAvatarUpdated }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

  // Get initials for fallback
  const getInitials = () => {
    if (!user.username) return 'U'
    return user.username.slice(0, 2).toUpperCase()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return
    const file = e.target.files[0]

    // Validate size (2MB)
    const max_size = 2 * 1024 * 1024
    if (file.size > max_size) {
      setError('Image size must be under 2MB.')
      return
    }

    // Validate type
    const valid_types = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!valid_types.includes(file.type)) {
      setError('Only PNG, JPG, JPEG, and WEBP formats are allowed.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData()
    formData.append('avatar', file)

    try {
      const res = await axios.post(`${backendUrl}/api/profile/avatar/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.token}`,
        },
      })
      onAvatarUpdated(res.data.avatar_url)
      setSuccess('Profile picture updated successfully!')
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || 'Failed to upload profile picture.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAvatar = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await axios.delete(`${backendUrl}/api/profile/avatar/`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      })
      onAvatarUpdated(null)
      setSuccess('Profile picture removed.')
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || 'Failed to remove profile picture.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div className="card glass-card p-5" style={{
        width: '100%',
        maxWidth: '420px',
        position: 'relative',
        animation: 'scaleUp 0.3s ease-out',
        textAlign: 'center',
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: '#fff',
            fontSize: '1.2rem',
            cursor: 'pointer',
            opacity: 0.7,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
        >
          ❌
        </button>

        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '24px', color: '#fff' }}>
          👤 Profile Settings
        </h2>

        {/* Large Avatar Preview with upload button overlay */}
        <div style={{ display: 'inline-block', position: 'relative', marginBottom: '16px' }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: '#6366f1',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '2rem',
            fontWeight: '700',
            color: '#fff',
            border: '3px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.username}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              getInitials()
            )}
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              background: '#4f46e5',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
              color: '#fff',
              fontSize: '0.9rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              transition: 'background-color 0.2s'
            }}
            title="Upload new photo"
          >
            📸
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".png,.jpg,.jpeg,.webp"
          style={{ display: 'none' }}
        />

        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: '0 0 6px', color: '#fff' }}>
          {user.username}
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
          Logged-in User
        </p>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="app-btn"
            style={{ padding: '6px 16px', fontSize: '0.85rem', minHeight: '36px' }}
          >
            Upload Photo
          </button>

          {user.avatarUrl && (
            <button
              onClick={handleDeleteAvatar}
              disabled={loading}
              className="app-btn app-btn--secondary"
              style={{
                padding: '6px 16px',
                fontSize: '0.85rem',
                minHeight: '36px',
                color: '#f87171',
                borderColor: 'rgba(248, 113, 113, 0.2)'
              }}
            >
              Remove
            </button>
          )}
        </div>

        {/* Status Messages */}
        {loading && (
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', margin: '10px 0' }}>
            Processing image...
          </div>
        )}
        {error && (
          <div style={{
            fontSize: '0.85rem',
            color: '#f87171',
            background: 'rgba(248, 113, 113, 0.1)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            margin: '10px 0'
          }}>
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div style={{
            fontSize: '0.85rem',
            color: '#4ade80',
            background: 'rgba(74, 222, 128, 0.1)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            margin: '10px 0'
          }}>
            ✓ {success}
          </div>
        )}

        <button
          onClick={onClose}
          className="app-btn app-btn--secondary"
          style={{ width: '100%', marginTop: '10px', minHeight: '40px' }}
        >
          Close Settings
        </button>
      </div>
    </div>
  )
}
