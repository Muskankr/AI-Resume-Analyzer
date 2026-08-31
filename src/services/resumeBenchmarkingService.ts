/**
 * AI Resume Industry Benchmarking & Scoring Engine
 * Compares candidate resumes against real-world tech industry benchmarks, role specific keyword densities,
 * seniority progression indicators, and candidate peer percentiles.
 */

export interface RoleBenchmarkCriteria {
  roleId: string;
  roleTitle: string;
  industryCategory: 'FRONTEND' | 'BACKEND' | 'FULLSTACK' | 'DEVOPS' | 'DATA_SCIENCE' | 'AI_ML';
  targetExperienceYears: number;
  coreKeywords: string[];
  expectedProjectsCount: number;
  expectedCertificationsCount: number;
  minimumTestCoverageBenchmark: number;
}

export interface CandidateResumeInput {
  candidateId: string;
  candidateName: string;
  targetRole: string;
  totalYearsExperience: number;
  extractedKeywords: string[];
  projectsCount: number;
  certificationsCount: number;
  highestDegree: 'BACHELORS' | 'MASTERS' | 'PHD' | 'SELF_TAUGHT' | 'BOOTCAMP';
  resumeWordCount: number;
  actionVerbDensityScore: number; // 0 - 100
}

export interface ResumeBenchmarkScore {
  candidateId: string;
  targetRole: string;
  overallPercentileScore: number; // 0 - 100
  matchGrade: 'TOP_1_PERCENT' | 'TOP_10_PERCENT' | 'ABOVE_AVERAGE' | 'NEEDS_OPTIMIZATION';
  keywordMatchPercentage: number;
  experienceAlignmentScore: number; // 0 - 100
  actionVerbQualityScore: number; // 0 - 100
  missingCriticalKeywords: string[];
  improvementAreas: string[];
  benchmarkTimestamp: string;
}

export const INDUSTRY_ROLE_BENCHMARKS: Record<string, RoleBenchmarkCriteria> = {
  FULLSTACK: {
    roleId: 'role-fullstack-01',
    roleTitle: 'Senior Full-Stack Engineer',
    industryCategory: 'FULLSTACK',
    targetExperienceYears: 5,
    coreKeywords: ['React', 'TypeScript', 'Node.js', 'GraphQL', 'Docker', 'PostgreSQL', 'CI/CD', 'AWS', 'Jest'],
    expectedProjectsCount: 3,
    expectedCertificationsCount: 1,
    minimumTestCoverageBenchmark: 80,
  },
  DEVOPS: {
    roleId: 'role-devops-01',
    roleTitle: 'DevOps & Site Reliability Engineer',
    industryCategory: 'DEVOPS',
    targetExperienceYears: 4,
    coreKeywords: ['Kubernetes', 'Docker', 'Terraform', 'Prometheus', 'Grafana', 'CI/CD', 'Python', 'AWS'],
    expectedProjectsCount: 2,
    expectedCertificationsCount: 2,
    minimumTestCoverageBenchmark: 75,
  },
  AI_ML: {
    roleId: 'role-aiml-01',
    roleTitle: 'AI / Machine Learning Infrastructure Engineer',
    industryCategory: 'AI_ML',
    targetExperienceYears: 3,
    coreKeywords: ['PyTorch', 'TensorFlow', 'Python', 'CUDA', 'LLM', 'Model Fine-tuning', 'Vector DB', 'MLOps'],
    expectedProjectsCount: 4,
    expectedCertificationsCount: 1,
    minimumTestCoverageBenchmark: 70,
  },
};

/**
 * Benchmarks a candidate's resume metrics against targeted tech industry benchmarks.
 */
export function benchmarkCandidateResume(
  candidate: CandidateResumeInput,
  criteria?: RoleBenchmarkCriteria
): ResumeBenchmarkScore {
  const benchmark =
    criteria || INDUSTRY_ROLE_BENCHMARKS[candidate.targetRole.toUpperCase()] || INDUSTRY_ROLE_BENCHMARKS.FULLSTACK;

  // Keyword match calculation
  const candidateKeywordSet = new Set(candidate.extractedKeywords.map((k) => k.toLowerCase()));
  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  for (const kw of benchmark.coreKeywords) {
    if (candidateKeywordSet.has(kw.toLowerCase())) {
      matchedKeywords.push(kw);
    } else {
      missingKeywords.push(kw);
    }
  }

  const keywordPct = Math.round((matchedKeywords.length / benchmark.coreKeywords.length) * 100);

  // Experience alignment calculation
  const expDelta = candidate.totalYearsExperience - benchmark.targetExperienceYears;
  let expScore = 70;
  if (expDelta >= 0) expScore = Math.min(100, 85 + expDelta * 5);
  else expScore = Math.max(20, 70 + expDelta * 15);

  // Action verb & readability score
  let verbScore = candidate.actionVerbDensityScore;
  if (candidate.resumeWordCount < 300) verbScore -= 20;
  else if (candidate.resumeWordCount > 1200) verbScore -= 10;
  verbScore = Math.max(0, Math.min(100, verbScore));

  // Overall percentile score computation
  const overallScore = Math.round(keywordPct * 0.45 + expScore * 0.35 + verbScore * 0.2);

  let matchGrade: ResumeBenchmarkScore['matchGrade'] = 'ABOVE_AVERAGE';
  if (overallScore >= 90) matchGrade = 'TOP_1_PERCENT';
  else if (overallScore >= 78) matchGrade = 'TOP_10_PERCENT';
  else if (overallScore < 60) matchGrade = 'NEEDS_OPTIMIZATION';

  const improvementAreas: string[] = [];
  if (missingKeywords.length > 0) {
    improvementAreas.push(`Incorporate key industry skills: ${missingKeywords.join(', ')}.`);
  }
  if (expDelta < 0) {
    improvementAreas.push(`Highlight impactful projects to compensate for experience target differential.`);
  }
  if (candidate.resumeWordCount < 300) {
    improvementAreas.push(`Expand resume bullet points with concrete metrics and achievements.`);
  }

  return {
    candidateId: candidate.candidateId,
    targetRole: benchmark.roleTitle,
    overallPercentileScore: overallScore,
    matchGrade,
    keywordMatchPercentage: keywordPct,
    experienceAlignmentScore: expScore,
    actionVerbQualityScore: verbScore,
    missingCriticalKeywords: missingKeywords,
    improvementAreas,
    benchmarkTimestamp: new Date().toISOString(),
  };
}
