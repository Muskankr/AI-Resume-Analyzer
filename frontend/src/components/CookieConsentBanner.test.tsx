// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import CookieConsentBanner from './CookieConsentBanner'
import { COOKIE_CONSENT_STORAGE_KEY } from '../utils/cookieConsent'

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows on first visit and persists accepted consent', () => {
    render(<CookieConsentBanner />)

    expect(screen.getByRole('region', { name: /cookie consent notice/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /accept/i }))

    expect(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe('accepted')
    expect(screen.queryByRole('region', { name: /cookie consent notice/i })).not.toBeInTheDocument()
  })

  it('persists declined consent and stays hidden on later visits', () => {
    const { rerender } = render(<CookieConsentBanner />)

    fireEvent.click(screen.getByRole('button', { name: /decline/i }))

    expect(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe('declined')
    expect(screen.queryByRole('region', { name: /cookie consent notice/i })).not.toBeInTheDocument()

    rerender(<CookieConsentBanner />)

    expect(screen.queryByRole('region', { name: /cookie consent notice/i })).not.toBeInTheDocument()
  })
})
