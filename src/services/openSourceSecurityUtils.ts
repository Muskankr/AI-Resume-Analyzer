/**
 * Software Open-Source Licensing Compliance & Security Vulnerability Scan Telemetry Utilities
 */

export interface OpenSourceSecurityMetrics {
  repositoryUrl: string;
  detectedLicenseType: string;
  isPermissiveLicenseApproved: boolean;
  knownSecurityVulnerabilitiesCount: number;
  hasCriticalVulnerabilityAlert: boolean;
}

/**
 * Validates candidate open-source project software license and security vulnerabilities.
 */
export function auditOpenSourceSecurityAndLicensing(
  repoUrl: string,
  license: string,
  vulnerabilities: number
): OpenSourceSecurityMetrics {
  const isApproved = license === 'MIT' || license === 'Apache-2.0' || license === 'BSD-3-Clause';
  const hasCritical = vulnerabilities > 0;

  return {
    repositoryUrl: repoUrl,
    detectedLicenseType: license,
    isPermissiveLicenseApproved: isApproved,
    knownSecurityVulnerabilitiesCount: vulnerabilities,
    hasCriticalVulnerabilityAlert: hasCritical,
  };
}
