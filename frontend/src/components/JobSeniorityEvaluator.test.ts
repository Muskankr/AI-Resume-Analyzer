/**
 * Unit Tests for Job Seniority Evaluator
 */

import { describe, it, expect } from 'vitest';
import { JobSeniorityEvaluator } from './JobSeniorityEvaluator';

describe('JobSeniorityEvaluator Tests', () => {
  it('should detect Senior level requirement from JD text correctly', () => {
    const res = JobSeniorityEvaluator.evaluateSeniority('Senior Software Engineer 5+ years experience', 6);
    expect(res.detectedSeniorityLevel).toBe('SENIOR');
    expect(res.isExperienceMatch).toBe(true);
  });
});
