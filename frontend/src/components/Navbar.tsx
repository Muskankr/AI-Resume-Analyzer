import React, { useState, useEffect, useCallback } from 'react'
import type { AuthUser } from '../hooks/useAuth'

interface NavbarProps {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  user: AuthUser | null
  onLogin: () => void
  onLogout: () => void
  onHistoryClick: () => void
}

const MOBILE_BREAKPOINT = 1024

export const Navbar: React.FC<NavbarProps> = ({
  theme,
  toggleTheme,
  user,
  onLogin,
  onLogout,
  onHistoryClick,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeMenu = useCallback(() => setMobileOpen(false), [])

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
      <div className="navbar-brand">🚀 AI Resume Analyzer</div>

      <button
        className="navbar-toggle"
        onClick={() => setMobileOpen((prev) => !prev)}
        aria-expanded={mobileOpen}
        aria-controls="navbar-menu"
        aria-label="Toggle navigation"
      >
        ☰
      </button>

      <nav
        id="navbar-menu"
        className={`navbar-menu ${mobileOpen ? 'mobile-open' : ''}`}
        aria-label="Main Navigation"
      >
        <div className="navbar-links">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
              closeMenu()
            }}
          >
            Home
          </a>
          <a
            href="#ats-score"
            onClick={(e) => {
              e.preventDefault()
              const atsSection = document.getElementById('ats-score')
              if (atsSection) {
                atsSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
              } else {
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
              }
              closeMenu()
            }}
          >
            ATS Score
          </a>
          <a
            href="#"
            data-tour="history-link"
            onClick={(e) => {
              e.preventDefault()
              onHistoryClick()
              closeMenu()
            }}
          >
            History
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
              <span className="auth-username">👤 {user.username}</span>
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
