import React, { useState, useEffect, useCallback } from 'react'
import type { AuthUser } from '../hooks/useAuth'
import { Link, useLocation } from 'react-router-dom'

interface NavbarProps {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  user: AuthUser | null
  onLogin: () => void
  onLogout: () => void
  onProfileClick?: () => void
}

const MOBILE_BREAKPOINT = 1024

export const Navbar: React.FC<NavbarProps> = ({
  theme,
  toggleTheme,
  user,
  onLogin,
  onLogout,
  onProfileClick,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const [activeSection, setActiveSection] = useState<'home' | 'ats'>('home')

  const closeMenu = useCallback(() => setMobileOpen(false), [])

  const isHomeActive = location.pathname === '/' && activeSection === 'home'
  const isAnalyzeActive = location.pathname === '/analyze'
  const isAtsActive = location.pathname === '/' && activeSection === 'ats'

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    if (mobileOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileOpen, closeMenu])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > MOBILE_BREAKPOINT) closeMenu()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [closeMenu])

  return (
    <header className="navbar">
      <Link
        to="/"
        className={`navbar-brand ${theme}`}
        onClick={closeMenu}
      >
        🚀 AI Resume Analyzer
      </Link>
      <button
        className="navbar-toggle"
        onClick={() => setMobileOpen((prev) => !prev)}
        aria-expanded={mobileOpen}
        aria-controls="navbar-menu"
        aria-label="Toggle navigation"
      >
        ☰
      </button>

      <div
        className={`navbar-backdrop ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <nav
        id="navbar-menu"
        className={`navbar-menu ${mobileOpen ? 'mobile-open' : ''}`}
        aria-label="Main Navigation"
      >
        <div className="navbar-links">
          <a
            href="#"
            className={isHomeActive ? 'active' : ''}
            aria-current={isHomeActive ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault()
              setActiveSection('home')
              window.scrollTo({ top: 0, behavior: 'smooth' })
              closeMenu()
            }}
          >
            Home
          </a>
          <Link
            to="/analyze"
            className={isAnalyzeActive ? 'active' : ''}
            aria-current={isAnalyzeActive ? 'page' : undefined}
            onClick={() => setMobileOpen(false)}
          >
            Analyze Resume
          </Link>
          <Link to="/leaderboard" onClick={() => setMobileOpen(false)}>
            📊 Leaderboard
          </Link>
          <a
            href="#ats-score"
            className={isAtsActive ? 'active' : ''}
            aria-current={isAtsActive ? 'true' : undefined}
            onClick={(e) => {
              e.preventDefault()
              setActiveSection('ats')
              const atsSection = document.getElementById('ats-score')
              if (atsSection) {
                atsSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
              } else {
                const atsSection = document.getElementById('ats-score')
                if (atsSection) {
                  atsSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
                } else {
                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
                }
              }
              closeMenu()
            }}
          >
            ATS Score
          </a>
        </div>

        <div className="navbar-actions">
          <button
            type="button"
            className="app-btn app-btn--secondary theme-toggle-btn theme-toggle-navbar"
            onClick={() => {
              toggleTheme()
              closeMenu()
            }}
            aria-label="Toggle theme"
            aria-pressed={theme === 'dark'}
          >
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>

          {user ? (
            <div className="navbar-user">
              <span
                className="auth-username"
                onClick={() => {
                  onProfileClick?.()
                  closeMenu()
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  color: '#fff',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#6366f1',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    color: '#fff',
                    border: '1.5px solid rgba(255,255,255,0.1)'
                  }}
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.username}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    user.username.slice(0, 2).toUpperCase()
                  )}
                </div>
                <span>{user.username}</span>
              </span>
              <button
                className="auth-bar-btn"
                onClick={() => {
                  onLogout()
                  closeMenu()
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              className="auth-bar-btn"
              onClick={() => {
                onLogin()
                closeMenu()
              }}
            >
              🔐 Login / Sign Up
            </button>
          )}
        </div>
      </nav>
    </header>
  )
}
