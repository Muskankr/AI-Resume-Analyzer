/**
 * AI Candidate Portfolio Project Impact & Open-Source Code Quality Telemetry Service
 * Evaluates candidate GitHub repositories, live demo URL deployments, unit test coverage percentages,
 * open-source contribution stars/forks, and code architecture complexity metrics.
 */

export const PORTFOLIO_PROJECT_TYPES = {
  FULLSTACK_WEB_APP: 'Full-Stack Modern Web Application',
  SYSTEMS_ARCHITECTURE: 'High-Performance Systems Architecture',
  AI_ML_MODEL_PIPELINE: 'AI/ML Deep Learning Model Pipeline',
  OPEN_SOURCE_LIBRARY: 'Open-Source NPM/PyPI Developer Utility',
};

export interface PortfolioProjectData {
  projectId: string;
  projectName: string;
  projectType: string;
  githubRepositoryUrl: string;
  starsCount: number;
  forksCount: number;
  unitTestCoveragePercent: number;
  hasLiveProductionDeploymentUrl: boolean;
  evaluatedAt: string;
}

export interface PortfolioImpactResult {
  isProjectApproved: boolean;
  projectImpactScore: number;
  engineeringQualityTier: 'ENTERPRISE_GRADE_PROJECT' | 'SOLID_PORTFOLIO_DEMO' | 'NEEDS_CODE_TESTING_ENHANCEMENT';
}

export interface RepositoryEngagementMetrics {
  repositoryEngagementScore: number;
  codeHealthStatus: 'HIGH_CODE_HEALTH_PASS' | 'MODERATE_CODE_HEALTH' | 'LOW_TEST_COVERAGE_WARNING';
}

export interface PortfolioAuditReport {
  projectId: string;
  projectName: string;
  testCoveragePercent: number;
  portfolioAuditStatus: 'PORTFOLIO_AUDIT_PASSED_CERTIFIED' | 'MISSING_LIVE_DEMO_URL' | 'REPOSITORY_UNREACHABLE';
  recommendations: string[];
}

/**
 * Evaluates candidate portfolio project impact and engineering quality tier.
 */
export function evaluatePortfolioProjectImpact(data: PortfolioProjectData): PortfolioImpactResult {
  let score = 50;
  if (data.hasLiveProductionDeploymentUrl) score += 20;
  if (data.unitTestCoveragePercent >= 80.0) score += 20;
  if (data.starsCount > 100) score += 10;

  let tier: PortfolioImpactResult['engineeringQualityTier'] = 'SOLID_PORTFOLIO_DEMO';
  if (score >= 85) tier = 'ENTERPRISE_GRADE_PROJECT';
  else if (score < 60) tier = 'NEEDS_CODE_TESTING_ENHANCEMENT';

  return {
    isProjectApproved: score >= 60,
    projectImpactScore: score,
    engineeringQualityTier: tier,
  };
}

/**
 * Calculates GitHub repository engagement score and code health status.
 */
export function calculateGithubRepositoryScore(
  stars: number,
  forks: number,
  coveragePercent: number
): RepositoryEngagementMetrics {
  const engagement = stars * 3 + forks * 5;
  let status: RepositoryEngagementMetrics['codeHealthStatus'] = 'MODERATE_CODE_HEALTH';
  if (coveragePercent >= 85.0 && engagement > 100) status = 'HIGH_CODE_HEALTH_PASS';
  else if (coveragePercent < 50.0) status = 'LOW_TEST_COVERAGE_WARNING';

  return {
    repositoryEngagementScore: engagement,
    codeHealthStatus: status,
  };
}

/**
 * Generates portfolio project audit report with deployment and testing recommendations.
 */
export function generatePortfolioAuditReport(
  projectId: string,
  projectName: string,
  testCoverage: number,
  hasLiveDemo: boolean
): PortfolioAuditReport {
  const recommendations: string[] = [
    'Add an interactive live demo URL hosted on Vercel/AWS.',
    'Increase Vitest/Jest unit test statement coverage above 80%.',
    'Include a comprehensive README.md with system architecture diagrams.',
  ];

  return {
    projectId,
    projectName,
    testCoveragePercent: testCoverage,
    portfolioAuditStatus: hasLiveDemo ? 'PORTFOLIO_AUDIT_PASSED_CERTIFIED' : 'MISSING_LIVE_DEMO_URL',
    recommendations,
  };
}
