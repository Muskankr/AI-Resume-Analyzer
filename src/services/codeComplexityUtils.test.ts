/**
 * Unit Tests for Code Complexity Utilities
 */

import { describe, it, expect } from 'vitest';
import { calculateCodeComplexityMetrics } from './codeComplexityUtils';

describe('CodeComplexityUtils', () => {
  it('should validate clean and maintainable code metrics', () => {
    const res = calculateCodeComplexityMetrics(5, 88);
    expect(res.cyclomaticComplexityNumber).toBe(5);
    expect(res.isCodeCleanAndMaintainable).toBe(true);
  });
});
