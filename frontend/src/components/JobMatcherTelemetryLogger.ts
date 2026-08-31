/**
 * Job Matcher Telemetry Logger
 */

export interface JobMatcherTelemetryEvent {
  event: 'JOB_MATCH_ANALYZED' | 'MISSING_SKILL_CLICKED';
  matchScore: number;
  timestamp: string;
}

export class JobMatcherTelemetryLogger {
  public static logAnalysis(matchScore: number): JobMatcherTelemetryEvent {
    return {
      event: 'JOB_MATCH_ANALYZED',
      matchScore,
      timestamp: new Date().toISOString()
    };
  }
}
