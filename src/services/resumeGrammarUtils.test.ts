/**
 * Unit Tests for Resume Grammar Utilities
 */

import { describe, it, expect } from 'vitest';
import { evaluateResumeGrammarQuality } from './resumeGrammarUtils';

describe('ResumeGrammarUtils', () => {
  it('should pass grammar audit when resume has zero spelling errors and high quality score', () => {
    const res = evaluateResumeGrammarQuality(0, 1, 500);
    expect(res.grammarQualityScorePercent).toBeGreaterThanOrEqual(95);
    expect(res.isGrammarAuditPassed).toBe(true);
  });
});
