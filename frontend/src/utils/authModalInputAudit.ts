/**
 * Auth Modal Input Field Layout Audit Utility
 * 
 * Provides runtime inspection and validation of input label truncation, padding,
 * placeholder length, and container bounds across modal component break-points.
 */

export interface InputAuditResult {
  fieldId: string
  label: string
  placeholder: string
  containerWidthPx: number
  isTruncated: boolean
  hasAdequatePadding: boolean
  wcagCompliant: boolean
}

export const AUTH_MODAL_INPUT_FIELDS = [
  { id: 'auth-username', label: 'Username / Email', placeholder: 'Enter your email or username' },
  { id: 'auth-password', label: 'Password', placeholder: 'Enter your account password' },
  { id: 'security-check-answer-input', label: 'Security Verification', placeholder: 'Answer security question' },
  { id: 'captcha-token-input', label: 'Bot Verification', placeholder: 'Security challenge token' },
]

/**
 * Audits input field text bounds to ensure placeholders are never truncated
 */
export function auditInputTextBounds(
  fieldId: string,
  placeholder: string,
  containerWidthPx: number
): InputAuditResult {
  // Approximate width per character in system font (~8px per char at 14px font size)
  const approxTextWidth = placeholder.length * 8 + 32 // 32px padding
  const isTruncated = approxTextWidth > containerWidthPx && containerWidthPx > 0

  return {
    fieldId,
    label: fieldId,
    placeholder,
    containerWidthPx,
    isTruncated,
    hasAdequatePadding: containerWidthPx >= 280,
    wcagCompliant: !isTruncated && containerWidthPx >= 280,
  }
}

/**
 * Audits all Auth Modal input fields for a target container width
 */
export function auditAuthModalInputs(containerWidthPx: number): InputAuditResult[] {
  return AUTH_MODAL_INPUT_FIELDS.map((field) =>
    auditInputTextBounds(field.id, field.placeholder, containerWidthPx)
  )
}
