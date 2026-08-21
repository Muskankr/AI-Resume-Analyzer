import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AuthModal } from './AuthModal'

describe('AuthModal autocomplete attributes (#531)', () => {
  it('renders login form inputs with correct autocomplete attributes', () => {
    render(<AuthModal onSignup={vi.fn()} onLogin={vi.fn()} onClose={vi.fn()} />)

    const usernameInput = screen.getByPlaceholderText('Username')
    const passwordInput = screen.getByPlaceholderText(/Password/i)

    expect(usernameInput).toHaveAttribute('autocomplete', 'username')
    expect(usernameInput).toHaveAttribute('name', 'username')
    expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
    expect(passwordInput).toHaveAttribute('name', 'password')
  })

  it('renders signup form inputs with new-password autocomplete attribute', () => {
    render(<AuthModal onSignup={vi.fn()} onLogin={vi.fn()} onClose={vi.fn()} />)

    const switchBtn = screen.getByRole('button', { name: /Sign up/i })
    fireEvent.click(switchBtn)

    const usernameInput = screen.getByPlaceholderText('Username')
    const passwordInput = screen.getByPlaceholderText(/Password/i)

    expect(usernameInput).toHaveAttribute('autocomplete', 'username')
    expect(passwordInput).toHaveAttribute('autocomplete', 'new-password')
  })

  it('renders forgot password form input with username autocomplete attribute', () => {
    render(<AuthModal onSignup={vi.fn()} onLogin={vi.fn()} onClose={vi.fn()} />)

    const forgotBtn = screen.getByRole('button', { name: /Forgot password\?/i })
    fireEvent.click(forgotBtn)

    const usernameInput = screen.getByPlaceholderText(/Enter your username/i)
    expect(usernameInput).toHaveAttribute('autocomplete', 'username')
    expect(usernameInput).toHaveAttribute('name', 'username')
  })

  it('renders Google social login button and invokes OAuth handler', async () => {
    const handleOAuth = vi.fn().mockResolvedValue(undefined)
    const handleClose = vi.fn()

    render(
      <AuthModal
        onSignup={vi.fn()}
        onLogin={vi.fn()}
        onOAuthLogin={handleOAuth}
        onClose={handleClose}
      />
    )

    const googleBtn = screen.getByRole('button', { name: /Continue with Google/i })
    expect(googleBtn).toBeInTheDocument()

    fireEvent.click(googleBtn)
    expect(handleOAuth).toHaveBeenCalledWith('google', expect.any(Object))
  })

  it('renders GitHub social login button and invokes OAuth handler', async () => {
    const handleOAuth = vi.fn().mockResolvedValue(undefined)
    const handleClose = vi.fn()

    render(
      <AuthModal
        onSignup={vi.fn()}
        onLogin={vi.fn()}
        onOAuthLogin={handleOAuth}
        onClose={handleClose}
      />
    )

    const githubBtn = screen.getByRole('button', { name: /Continue with GitHub/i })
    expect(githubBtn).toBeInTheDocument()

    fireEvent.click(githubBtn)
    expect(handleOAuth).toHaveBeenCalledWith('github', expect.any(Object))
  })
})
