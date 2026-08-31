/**
 * Unit Tests for Job Matcher Telemetry Logger
 */

import { describe, it, expect } from 'vitest';
import { JobMatcherTelemetryLogger } from './JobMatcherTelemetryLogger';

describe('JobMatcherTelemetryLogger Tests', () => {
  it('should log job match analysis event correctly', () => {
    const res = JobMatcherTelemetryLogger.logAnalysis(90);
    expect(res.event).toBe('JOB_MATCH_ANALYZED');
    expect(res.matchScore).toBe(90);
  });
});
