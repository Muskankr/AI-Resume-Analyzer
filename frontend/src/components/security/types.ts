export type ComplianceStandard = 'GDPR' | 'SOC2_TYPE_II' | 'HIPAA' | 'ISO_27001' | 'CCPA'
export type PiiRiskLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type DataRetentionAction =
  'ENCRYPT_AT_REST' | 'ANONYMIZE_PII' | 'AUTO_PURGE_EXPIRED' | 'REDACT_SENSITIVE'

export interface PiiDetectionFinding {
  fieldCategory: 'SSN' | 'PHONE_NUMBER' | 'HOME_ADDRESS' | 'DATE_OF_BIRTH' | 'CONFIDENTIAL_PROJECT'
  detectedTextSnippet: string
  riskLevel: PiiRiskLevel
  recommendedAction: string
  isRedacted: boolean
}

export interface SecurityComplianceReport {
  vaultId: string
  candidateName: string
  documentTitle: string
  complianceScore: number
  piiRiskLevel: PiiRiskLevel
  standardsCompliant: ComplianceStandard[]
  piiFindings: PiiDetectionFinding[]
  retentionDaysRemaining: number
  encryptionStatus: 'AES-256-GCM' | 'RSA-4096' | 'UNENCRYPTED'
  createdAt: string
  lastAuditedAt: string
}

export interface SecurityVaultFilterQuery {
  piiRiskLevel?: string
  complianceStandard?: string
  search?: string
}

export interface SecurityAuditTimelineLog {
  logId: string
  timestamp: string
  eventType:
    | 'PII_REDACTION_APPLIED'
    | 'COMPLIANCE_SCAN_COMPLETED'
    | 'RETENTION_POLICY_TRIGGERED'
    | 'ENCRYPTION_KEY_ROTATED'
  details: string
  actor: string
  complianceImpact: string
}
