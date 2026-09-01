/**
 * Automated CI/CD Pipeline Integration & GitHub Actions Workflow Audit Telemetry Utilities
 */

export interface CiPipelineAuditMetrics {
  repositoryUrl: string;
  hasGithubActionsWorkflow: boolean;
  isCiBuildPassing: boolean;
  automatedTestExecutionTimeSeconds: number;
}

/**
 * Validates candidate repository CI/CD pipeline automation and test execution speed.
 */
export function auditRepositoryCiPipeline(
  repoUrl: string,
  hasActions: boolean,
  isBuildPassing: boolean,
  testTimeSeconds: number
): CiPipelineAuditMetrics {
  return {
    repositoryUrl: repoUrl,
    hasGithubActionsWorkflow: hasActions,
    isCiBuildPassing: isBuildPassing && hasActions,
    automatedTestExecutionTimeSeconds: testTimeSeconds,
  };
}
