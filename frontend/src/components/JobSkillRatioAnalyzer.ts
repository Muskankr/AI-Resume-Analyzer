/**
 * Job Matcher Hard vs Soft Skill Ratio Analyzer
 */

export interface SkillRatioAnalysis {
  hardSkillPercentage: number;
  softSkillPercentage: number;
  isBalanced: boolean;
}

export class JobSkillRatioAnalyzer {
  public static analyzeRatio(hardSkillCount: number, softSkillCount: number): SkillRatioAnalysis {
    const total = hardSkillCount + softSkillCount || 1;
    const hardSkillPercentage = Math.round((hardSkillCount / total) * 100);
    const softSkillPercentage = 100 - hardSkillPercentage;

    return {
      hardSkillPercentage,
      softSkillPercentage,
      isBalanced: hardSkillPercentage >= 60 && hardSkillPercentage <= 85
    };
  }
}
