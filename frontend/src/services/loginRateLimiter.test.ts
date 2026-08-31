import { describe, it, expect, beforeEach } from 'vitest'
import { loginRateLimiter, DEFAULT_RATE_LIMITER_CONFIG } from './loginRateLimiter'

describe('loginRateLimiter', () => {
  beforeEach(() => {
    loginRateLimiter.clearAllRecords()
    if (typeof window !== 'undefined') {
      localStorage.clear()
    }
  })

  it('tracks failed login attempts up to maximum allowed threshold', () => {
    const user = 'testuser@example.com'

    let state = loginRateLimiter.getLockoutState(user)
    expect(state.isLocked).toBe(false)
    expect(state.failedAttempts).toBe(0)
    expect(state.attemptsRemaining).toBe(DEFAULT_RATE_LIMITER_CONFIG.maxAttempts)

    // Record 4 failed attempts
    for (let i = 1; i <= 4; i++) {
      state = loginRateLimiter.recordFailedAttempt(user)
      expect(state.failedAttempts).toBe(i)
      expect(state.isLocked).toBe(false)
    }

    expect(state.attemptsRemaining).toBe(1)
  })

  it('locks out account upon reaching maximum failed attempts', () => {
    const user = 'bruteforce@example.com'

    for (let i = 0; i < 5; i++) {
      loginRateLimiter.recordFailedAttempt(user)
    }

    const state = loginRateLimiter.getLockoutState(user)
    expect(state.isLocked).toBe(true)
    expect(state.attemptsRemaining).toBe(0)
    expect(state.cooldownSecondsRemaining).toBeGreaterThan(0)
    expect(state.unlockToken).toBeDefined()
    expect(state.message).toContain('Account temporarily locked')
  })

  it('resets attempts after a successful login', () => {
    const user = 'validuser@example.com'

    loginRateLimiter.recordFailedAttempt(user)
    loginRateLimiter.recordFailedAttempt(user)
    expect(loginRateLimiter.getLockoutState(user).failedAttempts).toBe(2)

    loginRateLimiter.recordSuccessfulLogin(user)
    expect(loginRateLimiter.getLockoutState(user).failedAttempts).toBe(0)
  })

  it('allows unlock via generated unlock token', () => {
    const user = 'lockeduser@example.com'

    let state: any
    for (let i = 0; i < 5; i++) {
      state = loginRateLimiter.recordFailedAttempt(user)
    }

    expect(state.isLocked).toBe(true)
    const token = state.unlockToken!

    const success = loginRateLimiter.unlockWithToken(user, token)
    expect(success).toBe(true)
    expect(loginRateLimiter.getLockoutState(user).isLocked).toBe(false)
  })
})
