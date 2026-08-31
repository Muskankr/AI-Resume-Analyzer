/**
 * Job Description Seniority & Role Level Evaluator
 */

export interface SeniorityAnalysisResult {
  detectedSeniorityLevel: 'JUNIOR' | 'MID_LEVEL' | 'SENIOR' | 'LEAD' | 'EXECUTIVE';
  requiredYearsExperience: number;
  isExperienceMatch: boolean;
}

export class JobSeniorityEvaluator {
  public static evaluateSeniority(jdText: string, candidateYearsExperience: number): SeniorityAnalysisResult {
    let detectedLevel: SeniorityAnalysisResult['detectedSeniorityLevel'] = 'MID_LEVEL';
    let requiredYears = 3;

    if (jdText.toLowerCase().includes('senior') || jdText.toLowerCase().includes('5+ years')) {
      detectedLevel = 'SENIOR';
      requiredYears = 5;
    } else if (jdText.toLowerCase().includes('lead') || jdText.toLowerCase().includes('principal')) {
      detectedLevel = 'LEAD';
      requiredYears = 8;
    }

    return {
      detectedSeniorityLevel: detectedLevel,
      requiredYearsExperience: requiredYears,
      isExperienceMatch: candidateYearsExperience >= requiredYears
    };
  }
}
