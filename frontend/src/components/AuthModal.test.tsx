import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { AuthModal } from '../AuthModal'

// Mock CaptchaChallenge to auto-invoke token verification
vi.mock('./CaptchaChallenge', () => ({
  CaptchaChallenge: ({ onVerify }: { onVerify: (token: string) => void }) => {
    return (
      <div data-testid="captcha-mock">
        <button
          type="button"
          onClick={() => onVerify('test-captcha-token')}
          data-testid="captcha-verify-btn"
        >
          Verify Captcha
        </button>
      </div>
    )
  },
}))

describe('AuthModal Component (#105)', () => {
  const defaultProps = {
    onSignup: vi.fn().mockResolvedValue(undefined),
    onLogin: vi.fn().mockResolvedValue(undefined),
    onOAuthLogin: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modal heading and tabs correctly in default login mode', () => {
    render(<AuthModal {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Login/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Sign Up/i })).toHaveAttribute('aria-selected', 'false')
  })

  it('switches between Login and Sign Up modes seamlessly', async () => {
    render(<AuthModal {...defaultProps} />)

    const signUpTab = screen.getByRole('tab', { name: /Sign Up/i })
    fireEvent.click(signUpTab)

    expect(screen.getByRole('heading', { name: /Create Your Account/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Re-enter password')).toBeInTheDocument()

    const loginTab = screen.getByRole('tab', { name: /Login/i })
    fireEvent.click(loginTab)

    expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeInTheDocument()
  })

  it('toggles password visibility when eye icon button is clicked', () => {
    render(<AuthModal {...defaultProps} />)

    const passwordInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement
    expect(passwordInput.type).toBe('password')

    const toggleBtn = screen.getByRole('button', { name: /Show password/i })
    fireEvent.click(toggleBtn)

    expect(passwordInput.type).toBe('text')
    expect(screen.getByRole('button', { name: /Hide password/i })).toBeInTheDocument()
  })

  it('calculates and renders password strength meter in signup mode', () => {
    render(<AuthModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('tab', { name: /Sign Up/i }))

    const passwordInput = screen.getByLabelText(/^Password$/i)
    fireEvent.change(passwordInput, { target: { value: 'StrongP@ssw0rd2026' } })

    expect(screen.getByText(/Password Strength:/i)).toBeInTheDocument()
    expect(screen.getByText(/Strong/i)).toBeInTheDocument()
  })

  it('displays validation error when passwords do not match on signup', async () => {
    render(<AuthModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('tab', { name: /Sign Up/i }))

    const usernameInput = screen.getByLabelText(/Username/i)
    const passwordInput = screen.getByLabelText(/^Password$/i)
    const confirmInput = screen.getByPlaceholderText('Re-enter password')

    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmInput, { target: { value: 'password999' } })

    const captchaBtn = screen.getByTestId('captcha-verify-btn')
    fireEvent.click(captchaBtn)

    const submitBtn = screen.getByRole('button', { name: /Create Account/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument()
    })
    expect(defaultProps.onSignup).not.toHaveBeenCalled()
  })

  it('shows loading state and disables inputs during form submission', async () => {
    let resolveLogin: () => void = () => {}
    const pendingLogin = new Promise<void>((resolve) => {
      resolveLogin = resolve
    })
    const mockLogin = vi.fn().mockImplementation(() => pendingLogin)

    render(<AuthModal {...defaultProps} onLogin={mockLogin} />)

    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'johndoe' } })
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'secretpass' } })
    fireEvent.click(screen.getByTestId('captcha-verify-btn'))

    const submitBtn = screen.getByRole('button', { name: /Log In/i })
    fireEvent.click(submitBtn)

    expect(screen.getByText(/Please wait.../i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Username/i)).toBeDisabled()
    expect(screen.getByLabelText(/^Password$/i)).toBeDisabled()

    resolveLogin()
    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  it('calls onClose when Escape key is pressed', () => {
    render(<AuthModal {...defaultProps} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onOAuthLogin when Google social login button is clicked', async () => {
    render(<AuthModal {...defaultProps} />)
    const googleBtn = screen.getByRole('button', { name: /Continue with Google/i })
    fireEvent.click(googleBtn)

    await waitFor(() => {
      expect(defaultProps.onOAuthLogin).toHaveBeenCalledWith('google', expect.anything())
    })
  })
})
