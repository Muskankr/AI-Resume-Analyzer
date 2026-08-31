import { benchmarkCandidateResume, CandidateResumeInput } from './resumeBenchmarkingService';

describe('ResumeBenchmarkingService', () => {
  const candidateFullStack: CandidateResumeInput = {
    candidateId: 'cand-101',
    candidateName: 'Alice Dev',
    targetRole: 'FULLSTACK',
    totalYearsExperience: 6,
    extractedKeywords: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'AWS', 'Jest', 'CI/CD', 'GraphQL'],
    projectsCount: 4,
    certificationsCount: 2,
    highestDegree: 'BACHELORS',
    resumeWordCount: 650,
    actionVerbDensityScore: 88,
  };

  const candidateJunior: CandidateResumeInput = {
    candidateId: 'cand-102',
    candidateName: 'Bob Junior',
    targetRole: 'FULLSTACK',
    totalYearsExperience: 1,
    extractedKeywords: ['React', 'JavaScript'],
    projectsCount: 1,
    certificationsCount: 0,
    highestDegree: 'BOOTCAMP',
    resumeWordCount: 200,
    actionVerbDensityScore: 40,
  };

  it('evaluates senior fullstack candidate resume accurately', () => {
    const result = benchmarkCandidateResume(candidateFullStack);

    expect(result.candidateId).toBe('cand-101');
    expect(result.overallPercentileScore).toBeGreaterThanOrEqual(90);
    expect(result.matchGrade).toBe('TOP_1_PERCENT');
    expect(result.keywordMatchPercentage).toBe(100);
    expect(result.missingCriticalKeywords.length).toBe(0);
  });

  it('identifies missing keywords and area of improvements for junior candidate', () => {
    const result = benchmarkCandidateResume(candidateJunior);

    expect(result.candidateId).toBe('cand-102');
    expect(result.overallPercentileScore).toBeLessThan(60);
    expect(result.matchGrade).toBe('NEEDS_OPTIMIZATION');
    expect(result.missingCriticalKeywords).toContain('TypeScript');
    expect(result.improvementAreas.length).toBeGreaterThan(0);
  });
});
