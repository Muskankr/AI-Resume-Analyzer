import {
  generateInterviewReadinessAssessment,
  CandidateProfileInput,
} from './candidateInterviewReadinessService';

describe('CandidateInterviewReadinessService', () => {
  const seniorProfile: CandidateProfileInput = {
    candidateId: 'cand-int-101',
    targetRole: 'Senior Full Stack Engineer',
    experienceLevel: 'SENIOR',
    primaryLanguages: ['TypeScript', 'Python'],
    frameworks: ['React', 'Node.js'],
    databases: ['PostgreSQL', 'Redis'],
    cloudPlatforms: ['AWS', 'Docker'],
    projectsSummary: [
      {
        projectName: 'AI Resume Platform',
        description: 'Microservices architecture for candidate resume parsing.',
        techStack: ['TypeScript', 'React', 'Node.js'],
      },
      {
        projectName: 'Distributed Cache Service',
        description: 'High performance Redis cache wrapper.',
        techStack: ['Python', 'Redis'],
      },
    ],
  };

  it('generates system design and technical questions for senior candidates', () => {
    const result = generateInterviewReadinessAssessment(seniorProfile);

    expect(result.candidateId).toBe('cand-int-101');
    expect(result.readinessScore).toBeGreaterThanOrEqual(85);
    expect(result.readinessTier).toBe('EXCEPTIONAL_PREPARATION');
    expect(result.generatedQuestions.length).toBeGreaterThanOrEqual(3);

    const sysDesignQ = result.generatedQuestions.find((q) => q.category === 'SYSTEM_DESIGN');
    expect(sysDesignQ).toBeDefined();
    expect(sysDesignQ?.questionText).toContain('AWS');
  });

  it('provides focus areas and prep hours when database/cloud skills are missing', () => {
    const juniorProfile: CandidateProfileInput = {
      candidateId: 'cand-int-102',
      targetRole: 'Junior Developer',
      experienceLevel: 'JUNIOR',
      primaryLanguages: ['JavaScript'],
      frameworks: ['React'],
      databases: [],
      cloudPlatforms: [],
      projectsSummary: [],
    };

    const result = generateInterviewReadinessAssessment(juniorProfile);

    expect(result.readinessScore).toBeLessThan(50);
    expect(result.focusAreas.length).toBeGreaterThan(0);
    expect(result.recommendedPreparationHours).toBeGreaterThan(15);
  });
});
