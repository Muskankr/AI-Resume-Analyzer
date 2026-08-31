/**
 * Unit Tests for Job Matcher Report Exporter
 */

import { describe, it, expect } from 'vitest';
import { JobMatcherReportExporter } from './JobMatcherReportExporter';

describe('JobMatcherReportExporter Tests', () => {
  it('should export match report JSON correctly', () => {
    const res = JobMatcherReportExporter.exportReportJson(85, ['GraphQL']);
    expect(res.matchScore).toBe(85);
    expect(res.missingSkillsList).toEqual(['GraphQL']);
  });
});
