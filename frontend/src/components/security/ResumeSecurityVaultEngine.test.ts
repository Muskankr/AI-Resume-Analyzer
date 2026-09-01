import { describe, it, expect } from 'vitest'
import { ResumeSecurityVaultEngine } from './ResumeSecurityVaultEngine'

describe('ResumeSecurityVaultEngine Unit Tests', () => {
  it('filters vault reports accurately based on PII risk level', () => {
    const results = ResumeSecurityVaultEngine.getVaultReports({
      piiRiskLevel: 'HIGH',
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results[0].piiRiskLevel).toBe('HIGH')
  })

  it('applies redaction mask successfully to PII finding', () => {
    const success = ResumeSecurityVaultEngine.applyRedaction('VAULT-9002', 'SSN')
    expect(success).toBe(true)

    const report = ResumeSecurityVaultEngine.getVaultReports({ search: 'Elena' })[0]
    const finding = report.piiFindings.find((f) => f.fieldCategory === 'SSN')
    expect(finding?.isRedacted).toBe(true)
  })
})
