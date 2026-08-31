/**
 * Unit Tests for Job Skill Ratio Analyzer
 */

import { describe, it, expect } from 'vitest';
import { JobSkillRatioAnalyzer } from './JobSkillRatioAnalyzer';

describe('JobSkillRatioAnalyzer Tests', () => {
  it('should calculate hard vs soft skill percentage ratio correctly', () => {
    const res = JobSkillRatioAnalyzer.analyzeRatio(7, 3);
    expect(res.hardSkillPercentage).toBe(70);
    expect(res.softSkillPercentage).toBe(30);
    expect(res.isBalanced).toBe(true);
  });
});
