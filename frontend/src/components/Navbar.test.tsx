// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { Navbar } from './Navbar'

beforeAll(() => {
  window.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

vi.mock('../theme/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}))

const defaultProps = {
  user: null,
  onLogin: vi.fn(),
  onLogout: vi.fn(),
}

const renderNavbar = (
  props: Partial<React.ComponentProps<typeof Navbar>> = {},
  initialEntries = ['/']
) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Navbar {...defaultProps} {...props} />
    </MemoryRouter>
  )
}

describe('Navbar Component (#241)', () => {
  it('renders the header brand with emoji and "AI Resume Analyzer" title text', () => {
    render(
      <MemoryRouter>
        <Navbar {...defaultProps} />
      </MemoryRouter>
    )
    const brandElement = screen.getByText(/AI Resume Analyzer/i)
    expect(brandElement).toBeInTheDocument()
    expect(brandElement.textContent).toContain('🚀')
  })

  it('renders correctly in light mode', () => {
    render(
      <MemoryRouter>
        <Navbar {...defaultProps} />
      </MemoryRouter>
    )
    expect(screen.getByText(/AI Resume Analyzer/i)).toBeInTheDocument()
  })
})

describe('Navbar Component right-side cluster (#244)', () => {
  it('renders all right-side cluster elements without clipping issues', () => {
    render(
      <MemoryRouter>
        <Navbar user={null} onLogin={() => {}} onLogout={() => {}} />
      </MemoryRouter>
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
      <MemoryRouter>
        <Navbar user={user} onLogin={() => {}} onLogout={() => {}} />
      </MemoryRouter>
    )

    expect(screen.getByText(/testuser/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
  })
})

describe('Navbar responsive hamburger (#245)', () => {
  it('renders the hamburger toggle button', () => {
    render(
      <MemoryRouter>
        <Navbar user={null} onLogin={() => {}} onLogout={() => {}} />
      </MemoryRouter>
    )

    const toggle = screen.getByRole('button', { name: /toggle navigation/i })
    expect(toggle).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', 'navbar-menu')
  })

  it('toggles mobile menu open and closed on click', () => {
    render(
      <MemoryRouter>
        <Navbar user={null} onLogin={() => {}} onLogout={() => {}} />
      </MemoryRouter>
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
    render(
      <MemoryRouter>
        <Navbar user={null} onLogin={() => {}} onLogout={() => {}} />
      </MemoryRouter>
    )

    const toggle = screen.getByRole('button', { name: /toggle navigation/i })
    const menu = document.getElementById('navbar-menu')!

    fireEvent.click(toggle)
    expect(menu.className).toContain('mobile-open')

    const atsLink = screen.getByText('ATS Score')
    fireEvent.click(atsLink)
    expect(menu.className).not.toContain('mobile-open')
  })
})

describe('Navbar active/current indicator (#404)', () => {
  it('marks Home as active by default on the root route', () => {
    renderNavbar()

    const homeLink = screen.getByText('Home')
    const analyzeLink = screen.getByText('Analyze Resume')
    const atsLink = screen.getByText('ATS Score')

    expect(homeLink).toHaveClass('active')
    expect(homeLink).toHaveAttribute('aria-current', 'page')

    expect(analyzeLink).not.toHaveClass('active')
    expect(analyzeLink).not.toHaveAttribute('aria-current')

    expect(atsLink).not.toHaveClass('active')
    expect(atsLink).not.toHaveAttribute('aria-current')
  })

  it('activates ATS Score and deactivates Home when ATS Score is clicked', () => {
    renderNavbar()

    const homeLink = screen.getByText('Home')
    const atsLink = screen.getByText('ATS Score')

    fireEvent.click(atsLink)

    expect(atsLink).toHaveClass('active')
    expect(atsLink).toHaveAttribute('aria-current', 'true')
    expect(homeLink).not.toHaveClass('active')
    expect(homeLink).not.toHaveAttribute('aria-current')
  })

  it('marks Analyze Resume as active when located on /analyze route', () => {
    renderNavbar({}, ['/analyze'])

    const homeLink = screen.getByText('Home')
    const analyzeLink = screen.getByText('Analyze Resume')
    const atsLink = screen.getByText('ATS Score')

    expect(analyzeLink).toHaveClass('active')
    expect(analyzeLink).toHaveAttribute('aria-current', 'page')

    expect(homeLink).not.toHaveClass('active')
    expect(homeLink).not.toHaveAttribute('aria-current')

    expect(atsLink).not.toHaveClass('active')
    expect(atsLink).not.toHaveAttribute('aria-current')
  })
})
