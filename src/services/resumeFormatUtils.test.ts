/**
 * Unit Tests for Resume Format Utilities
 */

import { describe, it, expect } from 'vitest';
import { evaluateResumeFormatDensity } from './resumeFormatUtils';

describe('ResumeFormatUtils', () => {
  it('should validate optimal resume page length and word count density', () => {
    const res = evaluateResumeFormatDensity(1, 650, false);
    expect(res.pageCount).toBe(1);
    expect(res.isLengthOptimal).toBe(true);
    expect(res.hasUnreadableTablesOrImages).toBe(false);
  });
});
