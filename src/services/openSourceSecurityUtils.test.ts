/**
 * Unit Tests for Open-Source Security Utilities
 */

import { describe, it, expect } from 'vitest';
import { auditOpenSourceSecurityAndLicensing } from './openSourceSecurityUtils';

describe('OpenSourceSecurityUtils', () => {
  it('should validate MIT open-source license approval and zero vulnerability count', () => {
    const res = auditOpenSourceSecurityAndLicensing('https://github.com/candidate/lib', 'MIT', 0);
    expect(res.isPermissiveLicenseApproved).toBe(true);
    expect(res.hasCriticalVulnerabilityAlert).toBe(false);
  });
});
