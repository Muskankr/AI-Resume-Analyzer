/**
 * Candidate Career Trajectory & Seniority Progression Analyzer
 * Evaluates candidate employment history timeline, title progression velocity,
 * tenure stability, leadership indicators, and promotion cadence.
 */

export interface WorkExperienceEntry {
  companyName: string;
  jobTitle: string;
  startDate: string; // YYYY-MM
  endDate?: string; // YYYY-MM or 'Present'
  isPromotedInternal: boolean;
  teamSizeManaged?: number;
}

export interface CareerTrajectoryResult {
  candidateId: string;
  totalYearsInTech: number;
  averageTenureMonths: number;
  seniorityTier: 'EXECUTIVE_LEAD' | 'SENIOR_STAFF' | 'MID_LEVEL' | 'ENTRY_LEVEL';
  promotionVelocityScore: number; // 0 - 100
  stabilityRating: 'HIGHLY_STABLE' | 'HEALTHY_MOBILITY' | 'FREQUENT_JOB_HOPPING';
  insights: string[];
}

export const SENIOR_TITLE_KEYWORDS = ['Senior', 'Staff', 'Principal', 'Lead', 'Manager', 'Head', 'VP', 'Director', 'Architect'];

/**
 * Evaluates candidate work experience timeline and career advancement trajectory.
 */
export function evaluateCareerTrajectory(
  candidateId: string,
  experience: WorkExperienceEntry[]
): CareerTrajectoryResult {
  if (!experience || experience.length === 0) {
    return {
      candidateId,
      totalYearsInTech: 0,
      averageTenureMonths: 0,
      seniorityTier: 'ENTRY_LEVEL',
      promotionVelocityScore: 0,
      stabilityRating: 'HEALTHY_MOBILITY',
      insights: ['No work experience records available for trajectory analysis.'],
    };
  }

  let totalTenureMonths = 0;
  let seniorTitleCount = 0;
  let internalPromotions = 0;

  for (const job of experience) {
    const start = new Date(job.startDate);
    const end = job.endDate && job.endDate.toLowerCase() !== 'present' ? new Date(job.endDate) : new Date();

    const months = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
    totalTenureMonths += months;

    const isSenior = SENIOR_TITLE_KEYWORDS.some((kw) => new RegExp(`\\b${kw}\\b`, 'i').test(job.jobTitle));
    if (isSenior) seniorTitleCount++;

    if (job.isPromotedInternal) internalPromotions++;
  }

  const jobsCount = experience.length;
  const avgTenure = Math.round(totalTenureMonths / jobsCount);
  const totalYears = parseFloat((totalTenureMonths / 12).toFixed(1));

  let stability: CareerTrajectoryResult['stabilityRating'] = 'HEALTHY_MOBILITY';
  if (avgTenure >= 24) stability = 'HIGHLY_STABLE';
  else if (avgTenure < 12 && jobsCount >= 3) stability = 'FREQUENT_JOB_HOPPING';

  // Promotion velocity score computation
  const tenureFactor = Math.min(50, totalYears * 5);
  const promoFactor = internalPromotions * 15;
  const titleFactor = seniorTitleCount * 10;
  const promoVelocity = Math.min(100, Math.round(tenureFactor + promoFactor + titleFactor));

  let tier: CareerTrajectoryResult['seniorityTier'] = 'MID_LEVEL';
  if (totalYears >= 8 || seniorTitleCount >= 2) tier = 'SENIOR_STAFF';
  else if (totalYears >= 12 && (internalPromotions >= 2 || seniorTitleCount >= 3)) tier = 'EXECUTIVE_LEAD';
  else if (totalYears < 3) tier = 'ENTRY_LEVEL';

  const insights: string[] = [];
  if (internalPromotions > 0) {
    insights.push(`Demonstrated internal career progression with ${internalPromotions} recorded promotion(s).`);
  }
  if (stability === 'HIGHLY_STABLE') {
    insights.push('Strong tenure stability with average company stay exceeding 24 months.');
  } else if (stability === 'FREQUENT_JOB_HOPPING') {
    insights.push('Short average tenure per role; consider highlighting multi-year project deliverables.');
  }

  return {
    candidateId,
    totalYearsInTech: totalYears,
    averageTenureMonths: avgTenure,
    seniorityTier: tier,
    promotionVelocityScore: promoVelocity,
    stabilityRating: stability,
    insights,
  };
}
