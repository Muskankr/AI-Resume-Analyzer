/**
 * Candidate Portfolio Verification Suite - Automated Verification Engine
 * Analyzes repository architectural patterns, commit frequency cadence, dependency security vulnerabilities,
 * code quality metrics, unit test coverage standards, and live production deployment telemetry.
 */

export interface CandidateRepositoryDetails {
  repositoryId: string;
  repositoryName: string;
  ownerUsername: string;
  primaryLanguage: string;
  totalCommitCount: number;
  openIssuesCount: number;
  closedIssuesCount: number;
  forksCount: number;
  starsCount: number;
  watchersCount: number;
  hasLicense: boolean;
  licenseType?: string;
  hasCiCdPipeline: boolean;
  hasLiveDeployment: boolean;
  deploymentUrl?: string;
  testCoveragePercent: number;
  documentationQualityScore: number; // 0 - 100
  codeComplexityScore: number; // 0 - 100
  securityVulnerabilityCount: number;
  createdAt: string;
  lastCommitAt: string;
}

export interface VerificationTierResult {
  candidateId: string;
  overallScore: number; // 0 - 100
  tierLevel: 'UNVERIFIED' | 'EMERGING_DEVELOPER' | 'PROFICIENT_ENGINEER' | 'ENTERPRISE_ARCHITECT';
  passedVerification: boolean;
  breakdown: {
    codeQualityScore: number;
    testCoverageScore: number;
    activityCadenceScore: number;
    deploymentScore: number;
    securityScore: number;
  };
  auditFlags: string[];
  recommendations: string[];
  verifiedTimestamp: string;
}

export interface CommitActivityCadence {
  totalCommits: number;
  activeMonths: number;
  averageCommitsPerMonth: number;
  hasConsistentActivity: boolean;
  cadenceRating: 'HIGHLY_CONSISTENT' | 'MODERATE_ACTIVITY' | 'SPORADIC_BURSTS' | 'INACTIVE';
}

export interface ProjectSecuritySummary {
  vulnerabilityCount: number;
  hasCriticalVulnerability: boolean;
  securityRating: 'SECURE_AUDITED' | 'LOW_RISK' | 'NEEDS_PATCHING' | 'HIGH_RISK_EXPOSURE';
  remediationSuggestions: string[];
}

/**
 * Computes overall verification score and assigns enterprise engineering tier.
 */
export function evaluateCandidatePortfolioVerification(
  candidateId: string,
  repos: CandidateRepositoryDetails[]
): VerificationTierResult {
  if (!repos || repos.length === 0) {
    return {
      candidateId,
      overallScore: 0,
      tierLevel: 'UNVERIFIED',
      passedVerification: false,
      breakdown: {
        codeQualityScore: 0,
        testCoverageScore: 0,
        activityCadenceScore: 0,
        deploymentScore: 0,
        securityScore: 0,
      },
      auditFlags: ['No repositories submitted for evaluation.'],
      recommendations: ['Connect GitHub profile and submit public repositories.'],
      verifiedTimestamp: new Date().toISOString(),
    };
  }

  let totalQuality = 0;
  let totalCoverage = 0;
  let totalActivity = 0;
  let totalDeployment = 0;
  let totalSecurity = 0;

  const flags: string[] = [];
  const recs: string[] = [];

  for (const repo of repos) {
    // Code Quality calculation
    const repoQuality = Math.min(
      100,
      repo.documentationQualityScore * 0.4 + (100 - repo.codeComplexityScore * 0.5) * 0.6
    );
    totalQuality += repoQuality;

    // Test coverage
    totalCoverage += repo.testCoveragePercent;

    // Activity calculation
    const cadence = calculateCommitActivityCadence(repo.totalCommitCount, repo.createdAt, repo.lastCommitAt);
    let actScore = 40;
    if (cadence.cadenceRating === 'HIGHLY_CONSISTENT') actScore = 95;
    else if (cadence.cadenceRating === 'MODERATE_ACTIVITY') actScore = 75;
    else if (cadence.cadenceRating === 'SPORADIC_BURSTS') actScore = 55;
    totalActivity += actScore;

    // Deployment calculation
    let depScore = 30;
    if (repo.hasLiveDeployment) depScore += 40;
    if (repo.hasCiCdPipeline) depScore += 30;
    totalDeployment += depScore;

    // Security calculation
    const secSummary = analyzeProjectSecurityRisk(repo.securityVulnerabilityCount);
    let secScore = 100 - repo.securityVulnerabilityCount * 15;
    if (secScore < 0) secScore = 0;
    totalSecurity += secScore;

    if (repo.testCoveragePercent < 60) {
      flags.push(`Repository ${repo.repositoryName} has low unit test coverage (${repo.testCoveragePercent}%).`);
      recs.push(`Increase automated test suite coverage for ${repo.repositoryName} to at least 80%.`);
    }
    if (!repo.hasLiveDeployment) {
      flags.push(`Repository ${repo.repositoryName} lacks a verified production deployment URL.`);
      recs.push(`Deploy ${repo.repositoryName} to a cloud host (e.g. Vercel, AWS, Netlify).`);
    }
    if (secSummary.hasCriticalVulnerability) {
      flags.push(`Repository ${repo.repositoryName} contains critical dependency security vulnerabilities.`);
      recs.push(`Audit and update vulnerable packages in ${repo.repositoryName}.`);
    }
  }

  const count = repos.length;
  const avgQuality = Math.round(totalQuality / count);
  const avgCoverage = Math.round(totalCoverage / count);
  const avgActivity = Math.round(totalActivity / count);
  const avgDeployment = Math.round(totalDeployment / count);
  const avgSecurity = Math.round(totalSecurity / count);

  const overallScore = Math.round(
    avgQuality * 0.25 + avgCoverage * 0.25 + avgActivity * 0.15 + avgDeployment * 0.2 + avgSecurity * 0.15
  );

  let tier: VerificationTierResult['tierLevel'] = 'UNVERIFIED';
  if (overallScore >= 85) tier = 'ENTERPRISE_ARCHITECT';
  else if (overallScore >= 70) tier = 'PROFICIENT_ENGINEER';
  else if (overallScore >= 50) tier = 'EMERGING_DEVELOPER';

  return {
    candidateId,
    overallScore,
    tierLevel: tier,
    passedVerification: overallScore >= 65,
    breakdown: {
      codeQualityScore: avgQuality,
      testCoverageScore: avgCoverage,
      activityCadenceScore: avgActivity,
      deploymentScore: avgDeployment,
      securityScore: avgSecurity,
    },
    auditFlags: Array.from(new Set(flags)),
    recommendations: Array.from(new Set(recs)),
    verifiedTimestamp: new Date().toISOString(),
  };
}

/**
 * Calculates candidate commit activity cadence across repository lifecycle.
 */
export function calculateCommitActivityCadence(
  totalCommits: number,
  createdAt: string,
  lastCommitAt: string
): CommitActivityCadence {
  const created = new Date(createdAt).getTime();
  const lastCommit = new Date(lastCommitAt).getTime();
  const now = Date.now();

  const activeDays = Math.max(1, (lastCommit - created) / (1000 * 60 * 60 * 24));
  const activeMonths = Math.max(1, Math.round(activeDays / 30));
  const avgCommitsPerMonth = Math.round(totalCommits / activeMonths);

  const monthsSinceLastCommit = (now - lastCommit) / (1000 * 60 * 60 * 24 * 30);

  let rating: CommitActivityCadence['cadenceRating'] = 'MODERATE_ACTIVITY';
  if (monthsSinceLastCommit > 12) {
    rating = 'INACTIVE';
  } else if (avgCommitsPerMonth >= 20 && monthsSinceLastCommit <= 2) {
    rating = 'HIGHLY_CONSISTENT';
  } else if (avgCommitsPerMonth >= 8) {
    rating = 'MODERATE_ACTIVITY';
  } else {
    rating = 'SPORADIC_BURSTS';
  }

  return {
    totalCommits,
    activeMonths,
    averageCommitsPerMonth: avgCommitsPerMonth,
    hasConsistentActivity: rating === 'HIGHLY_CONSISTENT' || rating === 'MODERATE_ACTIVITY',
    cadenceRating: rating,
  };
}

/**
 * Analyzes project security risk profile based on vulnerability telemetry.
 */
export function analyzeProjectSecurityRisk(vulnerabilityCount: number): ProjectSecuritySummary {
  const hasCritical = vulnerabilityCount >= 3;
  let rating: ProjectSecuritySummary['securityRating'] = 'SECURE_AUDITED';

  if (vulnerabilityCount === 0) rating = 'SECURE_AUDITED';
  else if (vulnerabilityCount <= 2) rating = 'LOW_RISK';
  else if (vulnerabilityCount <= 5) rating = 'NEEDS_PATCHING';
  else rating = 'HIGH_RISK_EXPOSURE';

  const suggestions: string[] = [];
  if (vulnerabilityCount > 0) {
    suggestions.push('Run `npm audit fix` or dependabot updates to resolve vulnerable dependencies.');
    suggestions.push('Integrate automated Snyk or GitHub CodeQL security scanning into CI pipeline.');
  } else {
    suggestions.push('Maintain regular dependency updates to avoid zero-day exposures.');
  }

  return {
    vulnerabilityCount,
    hasCriticalVulnerability: hasCritical,
    securityRating: rating,
    remediationSuggestions: suggestions,
  };
}
