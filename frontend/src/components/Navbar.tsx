import React, { useState, useEffect, useCallback } from 'react'
import type { AuthUser } from '../hooks/useAuth'
import { Bell, ClipboardList, Sparkles } from 'lucide-react'

interface NavbarProps {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  user: AuthUser | null
  onLogin: () => void
  onLogout: () => void
  onHistoryClick: () => void
  onNotificationsClick?: () => void
  unreadCount?: number
}

const MOBILE_BREAKPOINT = 1024

export const Navbar: React.FC<NavbarProps> = ({
  theme,
  toggleTheme,
  user,
  onLogin,
  onLogout,
  onHistoryClick,
  onNotificationsClick,
  unreadCount = 0,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const closeMenu = useCallback(() => setMobileOpen(false), [])

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
    <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div
        className={`navbar-backdrop ${mobileOpen ? 'visible' : ''}`}
        onClick={closeMenu}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 998,
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />
      <div
        className="navbar-brand"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #14b8a6, #2dd4bf)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '16px',
            boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
          }}
        >
          <Sparkles size={18} />
        </div>
        <span>
          AI Resume Analyzer
        </span>
        <span
          style={{
            fontSize: '0.6rem',
            fontWeight: '600',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'linear-gradient(135deg, #2dd4bf33, #14b8a633)',
            color: '#2dd4bf',
            letterSpacing: '0.3px',
            marginLeft: '4px',
          }}
        >
          PRO
        </span>
      </div>

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
            className="navbar-icon-btn"
            onClick={() => {
              if (onNotificationsClick) onNotificationsClick()
              closeMenu()
            }}
            aria-label="Notifications"
            title="Notifications"
            style={{ marginRight: '8px' }}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>

          <button
            type="button"
            className="navbar-icon-btn"
            onClick={() => {
              onHistoryClick()
              closeMenu()
            }}
            aria-label="Analysis History"
            title="Analysis History"
            style={{ marginRight: '16px' }}
          >
            <ClipboardList size={18} />
          </button>

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
