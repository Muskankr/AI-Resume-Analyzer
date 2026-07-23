// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Navbar } from './Navbar'

describe('Navbar Component (#241)', () => {
  const defaultProps = {
    theme: 'dark' as const,
    toggleTheme: vi.fn(),
    user: null,
    onLogin: vi.fn(),
    onLogout: vi.fn(),
    onSettingsClick: vi.fn(), onHistoryClick: vi.fn(),
  }

  it('renders the header brand with emoji and "AI Resume Analyzer" title text', () => {
    render(<Navbar {...defaultProps} />)
    const brandElement = screen.getByText(/AI Resume Analyzer/i)
    expect(brandElement).toBeInTheDocument()
    expect(brandElement.textContent).toContain('🚀')
  })

  it('renders correctly in light mode', () => {
    render(<Navbar {...defaultProps} theme="light" />)
    expect(screen.getByText(/AI Resume Analyzer/i)).toBeInTheDocument()
  })
})

describe('Navbar Component right-side cluster (#244)', () => {
  it('renders all right-side cluster elements without clipping issues', () => {
    render(
      <Navbar
        theme="light"
        toggleTheme={() => {}}
        user={null}
        onLogin={() => {}}
        onLogout={() => {}}
        onSettingsClick={() => {}} onHistoryClick={() => {}}
      />
    )

    const loginBtn = screen.getByRole('button', { name: /login \/ sign up/i })
    expect(loginBtn).toBeInTheDocument()
    expect(loginBtn).toHaveClass('auth-bar-btn')

    const themeBtn = screen.getByRole('button', { name: /toggle theme/i })
    expect(themeBtn).toBeInTheDocument()
    expect(themeBtn).toHaveClass('theme-toggle-navbar')
  })

  it('renders user profile when user is authenticated', () => {
    const user = { username: 'testuser', token: 'fake-token' }
    render(
      <Navbar
        theme="dark"
        toggleTheme={() => {}}
        user={user}
        onLogin={() => {}}
        onLogout={() => {}}
        onSettingsClick={() => {}} onHistoryClick={() => {}}
      />
    )

    expect(screen.getByText(/testuser/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
  })
})

describe('Navbar responsive hamburger (#245)', () => {
  it('renders the hamburger toggle button', () => {
    render(
      <Navbar
        theme="light"
        toggleTheme={() => {}}
        user={null}
        onLogin={() => {}}
        onLogout={() => {}}
        onSettingsClick={() => {}} onHistoryClick={() => {}}
      />
    )

    const toggle = screen.getByRole('button', { name: /toggle navigation/i })
    expect(toggle).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', 'navbar-menu')
  })

  it('toggles mobile menu open and closed on click', () => {
    render(
      <Navbar
        theme="light"
        toggleTheme={() => {}}
        user={null}
        onLogin={() => {}}
        onLogout={() => {}}
        onSettingsClick={() => {}} onHistoryClick={() => {}}
      />
    )

    const toggle = screen.getByRole('button', { name: /toggle navigation/i })
    const menu = document.getElementById('navbar-menu')!

    expect(menu.className).not.toContain('mobile-open')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(menu.className).toContain('mobile-open')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(menu.className).not.toContain('mobile-open')
  })

  it('closes menu when a nav link is clicked', () => {
    const onHistoryClick = vi.fn()
    render(
      <Navbar
        theme="light"
        toggleTheme={() => {}}
        user={null}
        onLogin={() => {}}
        onLogout={() => {}}
        onSettingsClick={() => {}}
        onHistoryClick={onHistoryClick}
      />
    )

    const toggle = screen.getByRole('button', { name: /toggle navigation/i })
    const menu = document.getElementById('navbar-menu')!

    fireEvent.click(toggle)
    expect(menu.className).toContain('mobile-open')

    const historyLink = screen.getByText('History')
    fireEvent.click(historyLink)
    expect(menu.className).not.toContain('mobile-open')
    expect(onHistoryClick).toHaveBeenCalled()
  })

  it('renders a backdrop element for dismissing the menu', () => {
    render(
      <Navbar
        theme="light"
        toggleTheme={() => {}}
        user={null}
        onLogin={() => {}}
        onLogout={() => {}}
        onSettingsClick={() => {}} onHistoryClick={() => {}}
      />
    )

    const backdrop = document.querySelector('.navbar-backdrop') as HTMLElement
    expect(backdrop).toBeInTheDocument()
    expect(backdrop.className).not.toContain('visible')

    const toggle = screen.getByRole('button', { name: /toggle navigation/i })
    fireEvent.click(toggle)
    expect(backdrop.className).toContain('visible')

    fireEvent.click(backdrop)
    const menu = document.getElementById('navbar-menu')!
    expect(menu.className).not.toContain('mobile-open')
  })
})
