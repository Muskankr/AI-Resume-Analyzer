import { describe, it, expect } from 'vitest'
import { captchaService } from './captchaService'

describe('captchaService', () => {
  it('manages provider configurations correctly', () => {
    const initial = captchaService.getConfig()
    expect(initial.provider).toBe('hcaptcha')

    captchaService.setProvider('turnstile', 'custom-site-key')
    const updated = captchaService.getConfig()
    expect(updated.provider).toBe('turnstile')
    expect(updated.siteKey).toBe('custom-site-key')
  })

  it('validates demo tokens server side', async () => {
    const result = await captchaService.verifyTokenServerSide('10000000-ffff-ffff-ffff-000000000001')
    expect(result.success).toBe(true)
    expect(result.score).toBeGreaterThan(0.5)
  })

  it('handles empty or missing tokens gracefully', async () => {
    const result = await captchaService.verifyTokenServerSide('')
    expect(result.success).toBe(false)
    expect(result.error).toContain('missing')
  })

  it('generates and verifies accessible fallback math challenges', () => {
    const challenge = captchaService.generateFallbackChallenge()
    expect(challenge.challengeId).toBeDefined()
    expect(challenge.question).toContain('What is')

    const isCorrect = captchaService.verifyFallbackAnswer(challenge.challengeId, challenge.answer)
    expect(isCorrect).toBe(true)

    // Second attempt fails (one-time use token)
    const secondAttempt = captchaService.verifyFallbackAnswer(challenge.challengeId, challenge.answer)
    expect(secondAttempt).toBe(false)
  })
})
