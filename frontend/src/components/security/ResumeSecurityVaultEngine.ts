import type {
  SecurityComplianceReport,
  SecurityVaultFilterQuery,
  SecurityAuditTimelineLog,
} from './types'

export class ResumeSecurityVaultEngine {
  private static mockVaultReports: SecurityComplianceReport[] = [
    {
      vaultId: 'VAULT-9001',
      candidateName: 'Alexander Wright',
      documentTitle: 'Sr_Principal_Architect_Resume_2026.pdf',
      complianceScore: 94,
      piiRiskLevel: 'LOW',
      standardsCompliant: ['GDPR', 'SOC2_TYPE_II', 'ISO_27001'],
      piiFindings: [
        {
          fieldCategory: 'PHONE_NUMBER',
          detectedTextSnippet: '+1 (555) 019-2834',
          riskLevel: 'LOW',
          recommendedAction: 'Mask phone number on public candidate views.',
          isRedacted: true,
        },
        {
          fieldCategory: 'CONFIDENTIAL_PROJECT',
          detectedTextSnippet: 'Project Titan - US DoD Defense Cloud',
          riskLevel: 'MEDIUM',
          recommendedAction: 'Apply pseudonymization for security clearance details.',
          isRedacted: false,
        },
      ],
      retentionDaysRemaining: 180,
      encryptionStatus: 'AES-256-GCM',
      createdAt: '2026-08-20 14:22:00',
      lastAuditedAt: '2026-08-22 06:00:00',
    },
    {
      vaultId: 'VAULT-9002',
      candidateName: 'Elena Rostova',
      documentTitle: 'Lead_Cybersecurity_Researcher_CV.pdf',
      complianceScore: 78,
      piiRiskLevel: 'HIGH',
      standardsCompliant: ['GDPR', 'CCPA'],
      piiFindings: [
        {
          fieldCategory: 'SSN',
          detectedTextSnippet: 'XXX-XX-4921',
          riskLevel: 'CRITICAL',
          recommendedAction: 'Immediate automated redaction required.',
          isRedacted: false,
        },
        {
          fieldCategory: 'HOME_ADDRESS',
          detectedTextSnippet: '742 Evergreen Terrace, Seattle WA',
          riskLevel: 'HIGH',
          recommendedAction: 'Truncate street address to Metropolitan Statistical Area (MSA).',
          isRedacted: false,
        },
      ],
      retentionDaysRemaining: 45,
      encryptionStatus: 'AES-256-GCM',
      createdAt: '2026-08-21 09:15:30',
      lastAuditedAt: '2026-08-22 05:30:00',
    },
    {
      vaultId: 'VAULT-9003',
      candidateName: 'Marcus Vance',
      documentTitle: 'VP_Engineering_Executive_Resume.pdf',
      complianceScore: 98,
      piiRiskLevel: 'NONE',
      standardsCompliant: ['GDPR', 'SOC2_TYPE_II', 'HIPAA', 'ISO_27001', 'CCPA'],
      piiFindings: [],
      retentionDaysRemaining: 365,
      encryptionStatus: 'RSA-4096',
      createdAt: '2026-08-22 01:10:00',
      lastAuditedAt: '2026-08-22 06:10:00',
    },
  ]

  private static mockAuditLogs: SecurityAuditTimelineLog[] = [
    {
      logId: 'AUD-501',
      timestamp: '2026-08-22 06:05:12',
      eventType: 'COMPLIANCE_SCAN_COMPLETED',
      details: 'Automated DLP scanner analyzed 3 candidate resumes against GDPR & SOC2 standards.',
      actor: 'Enterprise Compliance Scanner v2.1',
      complianceImpact: 'Passed (Avg Score: 90%)',
    },
    {
      logId: 'AUD-502',
      timestamp: '2026-08-22 06:08:44',
      eventType: 'PII_REDACTION_APPLIED',
      details: 'Applied regex-based redaction mask on 2 detected phone number strings.',
      actor: 'Auto-Redactor Module',
      complianceImpact: 'Risk level downgraded from HIGH to LOW',
    },
    {
      logId: 'AUD-503',
      timestamp: '2026-08-22 06:10:00',
      eventType: 'ENCRYPTION_KEY_ROTATED',
      details: 'Rotated KMS envelope key for AES-256-GCM encrypted document blobs.',
      actor: 'KMS Service',
      complianceImpact: 'Key Rotation Verified',
    },
  ]

  public static getVaultReports(filters: SecurityVaultFilterQuery): SecurityComplianceReport[] {
    return this.mockVaultReports.filter((item) => {
      if (
        filters.piiRiskLevel &&
        filters.piiRiskLevel !== 'All' &&
        item.piiRiskLevel !== filters.piiRiskLevel
      ) {
        return false
      }
      if (filters.search && filters.search.trim() !== '') {
        const query = filters.search.toLowerCase()
        const matchesName = item.candidateName.toLowerCase().includes(query)
        const matchesDoc = item.documentTitle.toLowerCase().includes(query)
        if (!matchesName && !matchesDoc) return false
      }
      return true
    })
  }

  public static getAuditLogs(): SecurityAuditTimelineLog[] {
    return [...this.mockAuditLogs]
  }

  public static applyRedaction(vaultId: string, fieldCategory: string): boolean {
    const report = this.mockVaultReports.find((r) => r.vaultId === vaultId)
    if (!report) return false
    const finding = report.piiFindings.find((f) => f.fieldCategory === fieldCategory)
    if (finding) {
      finding.isRedacted = true
      return true
    }
    return false
  }
}
