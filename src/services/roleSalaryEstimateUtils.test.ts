/**
 * Unit Tests for Role Salary Estimate Utilities
 */

import { describe, it, expect } from 'vitest';
import { estimateTargetRoleSalaryRange } from './roleSalaryEstimateUtils';

describe('RoleSalaryEstimateUtils', () => {
  it('should calculate estimated median and market salary range for candidate experience level', () => {
    const res = estimateTargetRoleSalaryRange('Senior Full-Stack TypeScript Engineer', 5);
    expect(res.yearsExperience).toBe(5);
    expect(res.estimatedMedianSalaryUSD).toBe(130000);
    expect(res.estimatedMinSalaryUSD).toBe(110500);
  });
});
