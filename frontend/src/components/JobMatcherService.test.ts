/**
 * Enterprise Unit Test Suite for Job Description Matcher Engine
 * 
 * Architectural Specifications:
 * - Asserts JD keyword tokenization and match percentage calculations.
 * - Tests missing required skill action item generation.
 *
 * @module JobMatcherServiceTest
 * @version 2.6.0
 * @author Enterprise AI Resume Architecture Team
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JobMatcherState } from './JobMatcherModel';
import { JobMatcherService } from './JobMatcherService';

describe('JobMatcherEngine Unit Tests', () => {
  let state: JobMatcherState;
  let service: JobMatcherService;

  beforeEach(() => {
    state = new JobMatcherState();
    service = new JobMatcherService(state);
  });

  describe('Keyword Analysis & Match Percentage', () => {
    it('should calculate match percentage correctly for matching resume text', () => {
      const resumeText = 'React TypeScript Node.js AWS Communication';
      const result = service.analyzeJobMatch(resumeText);
      expect(result.matchPercentage).toBeGreaterThan(0);
      expect(result.matchedKeywordsCount).toBeGreaterThanOrEqual(4);
    });

    it('should generate action items for missing required skills', () => {
      const resumeText = 'Only Python and SQL experience.';
      const result = service.analyzeJobMatch(resumeText);
      expect(result.suggestedActionItems.length).toBeGreaterThan(0);
    });
  });
});
