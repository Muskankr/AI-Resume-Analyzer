/**
 * Unit Tests for Interview Practice Evaluator
 */

import { describe, it, expect } from 'vitest';
import { InterviewPracticeEvaluator } from './InterviewPracticeEvaluator';

describe('InterviewPracticeEvaluator Tests', () => {
  it('should score answers with quantified metrics higher', () => {
    const res = InterviewPracticeEvaluator.evaluateAnswer('Reduced latency by 45% using caching.');
    expect(res.score).toBe(90);
    expect(res.hasQuantifiedMetricInResult).toBe(true);
  });
});
