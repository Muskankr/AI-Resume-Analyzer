import { describe, it, expect } from 'vitest'
import { auditInputTextBounds, auditAuthModalInputs } from './authModalInputAudit'

describe('authModalInputAudit', () => {
  it('detects when an input placeholder text would truncate on narrow container width', () => {
    const result = auditInputTextBounds('security-check-answer-input', 'Answer security question', 120)
    expect(result.isTruncated).toBe(true)
  })

  it('confirms full placeholder visibility on standard modal width (360px+)', () => {
    const result = auditInputTextBounds('security-check-answer-input', 'Answer security question', 360)
    expect(result.isTruncated).toBe(false)
    expect(result.wcagCompliant).toBe(true)
  })

  it('audits all auth modal input fields correctly', () => {
    const results = auditAuthModalInputs(400)
    expect(results.length).toBe(4)
    expect(results.every((r) => r.wcagCompliant)).toBe(true)
  })
})
