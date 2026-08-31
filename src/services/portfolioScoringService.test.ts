/**
 * AI Candidate Portfolio Project Impact & Open-Source Code Quality Telemetry Service Unit Test Suite
 */

import { describe, it, expect } from 'vitest';
import {
  evaluatePortfolioProjectImpact,
  calculateGithubRepositoryScore,
  generatePortfolioAuditReport,
  PORTFOLIO_PROJECT_TYPES,
} from './portfolioScoringService';

describe('PortfolioScoringService', () => {
  const sampleProject = {
    projectId: 'PROJ-PORT-101',
    projectName: 'Distributed Consensus Microservices Engine',
    projectType: PORTFOLIO_PROJECT_TYPES.SYSTEMS_ARCHITECTURE,
    githubRepositoryUrl: 'https://github.com/candidate/distributed-consensus',
    starsCount: 1420,
    forksCount: 310,
    unitTestCoveragePercent: 94.5,
    hasLiveProductionDeploymentUrl: true,
    evaluatedAt: '2026-08-30T10:00:00Z',
  };

  it('should evaluate portfolio project engineering complexity and impact', () => {
    const res = evaluatePortfolioProjectImpact(sampleProject);

    expect(res).toBeDefined();
    expect(res.isProjectApproved).toBe(true);
    expect(res.projectImpactScore).toBeGreaterThan(80);
    expect(res.engineeringQualityTier).toBe('ENTERPRISE_GRADE_PROJECT');
  });

  it('should calculate GitHub repository star/fork engagement score', () => {
    const score = calculateGithubRepositoryScore(sampleProject.starsCount, sampleProject.forksCount, sampleProject.unitTestCoveragePercent);

    expect(score).toBeDefined();
    expect(score.repositoryEngagementScore).toBeGreaterThan(850);
    expect(score.codeHealthStatus).toBe('HIGH_CODE_HEALTH_PASS');
  });

  it('should generate portfolio audit report with deployment recommendations', () => {
    const report = generatePortfolioAuditReport(
      sampleProject.projectId,
      sampleProject.projectName,
      94.5,
      sampleProject.hasLiveProductionDeploymentUrl
    );

    expect(report).toBeDefined();
    expect(report.projectId).toBe('PROJ-PORT-101');
    expect(report.portfolioAuditStatus).toBe('PORTFOLIO_AUDIT_PASSED_CERTIFIED');
    expect(report.recommendations.length).toBeGreaterThanOrEqual(3);
  });
});
