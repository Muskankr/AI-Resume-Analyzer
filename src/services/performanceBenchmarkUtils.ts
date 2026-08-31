/**
 * Candidate Portfolio Project Performance Benchmark & Latency SLA Telemetry Utilities
 */

export interface PerformanceBenchmarkMetrics {
  projectId: string;
  apiResponseLatencyMs: number;
  requestsPerSecondThroughput: number;
  isSlaCompliant: boolean;
}

/**
 * Validates candidate system architecture API response latency against enterprise SLA thresholds (< 200ms).
 */
export function evaluateProjectPerformanceSla(
  projectId: string,
  latencyMs: number,
  rps: number
): PerformanceBenchmarkMetrics {
  const isCompliant = latencyMs <= 200 && rps >= 500;

  return {
    projectId,
    apiResponseLatencyMs: latencyMs,
    requestsPerSecondThroughput: rps,
    isSlaCompliant,
  };
}
