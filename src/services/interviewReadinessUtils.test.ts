/**
 * Unit Tests for Interview Readiness Utilities
 */

import { describe, it, expect } from 'vitest';
import { calculateCandidateInterviewReadiness } from './interviewReadinessUtils';

describe('InterviewReadinessUtils', () => {
  it('should calculate technical interview readiness score and flag screen qualification', () => {
    const res = calculateCandidateInterviewReadiness('CAN-RES-901', 80.0, 6);
    expect(res.candidateId).toBe('CAN-RES-901');
    expect(res.interviewPrepScorePercent).toBe(86);
    expect(res.isReadyForTechnicalScreen).toBe(true);
  });
});
