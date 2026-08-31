export type ReadinessLabel = 'Excellent Fit' | 'Strong Fit' | 'Developing Fit' | 'Awaiting Calibration';

export interface ReadinessInputs {
  resumeAtsScore: number;       // Raw text/keyword keyword match score (0-100)
  experienceYears: number;      // Candidate's cumulative professional timeline
  targetExperienceLevel: 'Junior' | 'Mid' | 'Senior' | 'Lead';
  hasJobDescription: boolean;   // Flag identifying if a target JD was provided
  careerTrackAlignment: number;  // Structural role/domain mapping match (0-100)
}

export interface ReadinessReport {
  score: number;                // Aggregated composite percentage (0-100)
  label: ReadinessLabel;        // Human-scannable status string
  formulaApplied: string;       // Verification tag tracking calculation weight
  diagnosticFeedback: string;   // Contextual narrative explaining the metric focus
}

/**
 * Calculates a holistic readiness score combining resume content, experience parameters, 
 * and structural intent. Distinct from raw ATS keyword string matchers.
 */
export function calculateReadinessScore(inputs: ReadinessInputs): ReadinessReport {
  const { resumeAtsScore, experienceYears, targetExperienceLevel, hasJobDescription, careerTrackAlignment } = inputs;
  
  // 1. Establish structural baseline requirements based on target seniority levels
  let experienceScore = 0;
  switch (targetExperienceLevel) {
    case 'Junior':
      experienceScore = experienceYears >= 1 ? 100 : experienceYears * 70;
      break;
    case 'Mid':
      experienceScore = experienceYears >= 3 ? 100 : (experienceYears / 3) * 100;
      break;
    case 'Senior':
      experienceScore = experienceYears >= 5 ? 100 : (experienceYears / 5) * 100;
      break;
    case 'Lead':
      experienceScore = experienceYears >= 8 ? 100 : (experienceYears / 8) * 100;
      break;
  }
  experienceScore = Math.min(100, Math.max(0, experienceScore));

  // 2. Execute Dynamic Weighing based on Context Availability (Graceful Degradation)
  let compositeScore = 0;
  let formulaApplied = '';
  let diagnosticFeedback = '';

  if (hasJobDescription) {
    // Context scenario A: Full inputs provided.
    // Weights: 40% Target JD requirements, 35% Domain Alignment, 25% Seniority Baseline
    compositeScore = (resumeAtsScore * 0.40) + (careerTrackAlignment * 0.35) + (experienceScore * 0.25);
    formulaApplied = 'Full-Context Matrix (40% JD Fit, 35% Domain Track, 25% Timeline Seniority)';
    diagnosticFeedback = 'This holistic score evaluates your competitive standing against the specific Job Description requirements alongside your general target path metrics.';
  } else {
    // Context scenario B: Graceful Degradation (Job Description Left Blank)
    // Shift weight completely to Career Track Alignment (60%) and Experience Level Fit (40%)
    compositeScore = (careerTrackAlignment * 0.60) + (experienceScore * 0.40);
    formulaApplied = 'Profile-Only Baseline (60% Domain Track Alignment, 40% Timeline Seniority)';
    diagnosticFeedback = 'Calculated without a target Job Description. This score represents your foundational readiness for this career track and target experience level based on raw background dimensions.';
  }

  // Final sanitization of composite number boundaries
  const sanitizedScore = Math.round(Math.min(100, Math.max(0, compositeScore)));

  // 3. Derive Semantic Visual Labels
  let label: ReadinessLabel = 'Awaiting Calibration';
  if (sanitizedScore >= 85) label = 'Excellent Fit';
  else if (sanitizedScore >= 70) label = 'Strong Fit';
  else if (sanitizedScore >= 45) label = 'Developing Fit';

  return {
    score: sanitizedScore,
    label,
    formulaApplied,
    diagnosticFeedback,
  };
}
