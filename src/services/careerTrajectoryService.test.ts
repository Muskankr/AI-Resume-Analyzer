import { evaluateCareerTrajectory, WorkExperienceEntry } from './careerTrajectoryService';

describe('CareerTrajectoryService', () => {
  const sampleHistory: WorkExperienceEntry[] = [
    {
      companyName: 'TechCorp',
      jobTitle: 'Software Engineer',
      startDate: '2020-01',
      endDate: '2022-01',
      isPromotedInternal: false,
    },
    {
      companyName: 'TechCorp',
      jobTitle: 'Senior Full-Stack Engineer',
      startDate: '2022-01',
      endDate: '2024-01',
      isPromotedInternal: true,
    },
    {
      companyName: 'CloudScale Inc',
      jobTitle: 'Staff Software Architect',
      startDate: '2024-01',
      endDate: 'Present',
      isPromotedInternal: false,
    },
  ];

  it('evaluates candidate career trajectory and promotion velocity correctly', () => {
    const result = evaluateCareerTrajectory('cand-traj-101', sampleHistory);

    expect(result.candidateId).toBe('cand-traj-101');
    expect(result.totalYearsInTech).toBeGreaterThanOrEqual(4);
    expect(result.seniorityTier).toBe('SENIOR_STAFF');
    expect(result.stabilityRating).toBe('HIGHLY_STABLE');
    expect(result.promotionVelocityScore).toBeGreaterThan(60);
    expect(result.insights).toContain('Demonstrated internal career progression with 1 recorded promotion(s).');
  });

  it('handles empty work history', () => {
    const result = evaluateCareerTrajectory('cand-empty', []);

    expect(result.totalYearsInTech).toBe(0);
    expect(result.seniorityTier).toBe('ENTRY_LEVEL');
  });
});
