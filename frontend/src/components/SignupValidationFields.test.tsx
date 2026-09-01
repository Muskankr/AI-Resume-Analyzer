import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SignupValidationFields } from './SignupValidationFields'

describe('SignupValidationFields (#743)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders username and email input fields', () => {
    render(<SignupValidationFields />)
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
  })

  it('debounces and displays available indicator for username', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({ isAvailable: true, field: 'username' }),
      })
    )

    render(<SignupValidationFields />)
    const usernameInput = screen.getByLabelText(/Username/i)

    fireEvent.change(usernameInput, { target: { value: 'uniqueuser' } })

    await waitFor(
      () => {
        expect(screen.getByText('✓ Available')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )
  })

  it('displays taken error copy for taken username', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({ isAvailable: false, field: 'username' }),
      })
    )

    render(<SignupValidationFields />)
    const usernameInput = screen.getByLabelText(/Username/i)

    fireEvent.change(usernameInput, { target: { value: 'existinguser' } })

    await waitFor(
      () => {
        expect(screen.getByText('✖ Username is already taken.')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )
  })

  it('displays soft security error copy for taken email address', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({ isAvailable: false, field: 'email' }),
      })
    )

    render(<SignupValidationFields />)
    const emailInput = screen.getByLabelText(/Email Address/i)

    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } })

    await waitFor(
      () => {
        expect(
          screen.getByText('This email format cannot be registered. Try logging in.')
        ).toBeInTheDocument()
      },
      { timeout: 2000 }
    )
  })
})
