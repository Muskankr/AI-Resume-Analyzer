import {
  evaluateCandidatePortfolioVerification,
  calculateCommitActivityCadence,
  analyzeProjectSecurityRisk,
  CandidateRepositoryDetails,
} from './candidatePortfolioVerificationService';

describe('CandidatePortfolioVerificationService', () => {
  const mockRepo1: CandidateRepositoryDetails = {
    repositoryId: 'repo-101',
    repositoryName: 'enterprise-microservices-core',
    ownerUsername: 'dev-pro',
    primaryLanguage: 'TypeScript',
    totalCommitCount: 240,
    openIssuesCount: 2,
    closedIssuesCount: 45,
    forksCount: 25,
    starsCount: 150,
    watchersCount: 30,
    hasLicense: true,
    licenseType: 'MIT',
    hasCiCdPipeline: true,
    hasLiveDeployment: true,
    deploymentUrl: 'https://demo.example.com',
    testCoveragePercent: 92,
    documentationQualityScore: 90,
    codeComplexityScore: 30,
    securityVulnerabilityCount: 0,
    createdAt: '2025-01-01T00:00:00Z',
    lastCommitAt: new Date().toISOString(),
  };

  const mockRepo2: CandidateRepositoryDetails = {
    repositoryId: 'repo-102',
    repositoryName: 'legacy-demo-script',
    ownerUsername: 'dev-pro',
    primaryLanguage: 'JavaScript',
    totalCommitCount: 15,
    openIssuesCount: 5,
    closedIssuesCount: 0,
    forksCount: 0,
    starsCount: 2,
    watchersCount: 1,
    hasLicense: false,
    hasCiCdPipeline: false,
    hasLiveDeployment: false,
    testCoveragePercent: 40,
    documentationQualityScore: 50,
    codeComplexityScore: 70,
    securityVulnerabilityCount: 4,
    createdAt: '2024-01-01T00:00:00Z',
    lastCommitAt: '2024-06-01T00:00:00Z',
  };

  it('evaluates overall verification score and assigns appropriate tier', () => {
    const result = evaluateCandidatePortfolioVerification('candidate-789', [mockRepo1]);

    expect(result.candidateId).toBe('candidate-789');
    expect(result.passedVerification).toBe(true);
    expect(result.tierLevel).toBe('ENTERPRISE_ARCHITECT');
    expect(result.overallScore).toBeGreaterThanOrEqual(85);
    expect(result.breakdown.testCoverageScore).toBe(92);
    expect(result.breakdown.securityScore).toBe(100);
  });

  it('handles candidate with no submitted repositories', () => {
    const result = evaluateCandidatePortfolioVerification('candidate-empty', []);

    expect(result.candidateId).toBe('candidate-empty');
    expect(result.passedVerification).toBe(false);
    expect(result.tierLevel).toBe('UNVERIFIED');
    expect(result.overallScore).toBe(0);
    expect(result.auditFlags).toContain('No repositories submitted for evaluation.');
  });

  it('flags low coverage, missing deployment, and security vulnerabilities', () => {
    const result = evaluateCandidatePortfolioVerification('candidate-mixed', [mockRepo2]);

    expect(result.passedVerification).toBe(false);
    expect(result.tierLevel).toBe('EMERGING_DEVELOPER');
    expect(result.auditFlags.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('calculates commit activity cadence correctly', () => {
    const now = new Date().toISOString();
    const cadence = calculateCommitActivityCadence(120, '2025-01-01T00:00:00Z', now);

    expect(cadence.totalCommits).toBe(120);
    expect(cadence.hasConsistentActivity).toBe(true);
    expect(cadence.cadenceRating).toBe('HIGHLY_CONSISTENT');
  });

  it('analyzes project security risk accurately', () => {
    const secAudited = analyzeProjectSecurityRisk(0);
    expect(secAudited.securityRating).toBe('SECURE_AUDITED');
    expect(secAudited.hasCriticalVulnerability).toBe(false);

    const secCritical = analyzeProjectSecurityRisk(4);
    expect(secCritical.securityRating).toBe('NEEDS_PATCHING');
    expect(secCritical.hasCriticalVulnerability).toBe(true);
  });
});
