/**
 * Job Description Matcher Report Export Engine
 */

export interface MatcherExportReport {
  matchScore: number;
  missingSkillsList: string[];
  reportTimestamp: string;
}

export class JobMatcherReportExporter {
  public static exportReportJson(matchScore: number, missingSkills: string[]): MatcherExportReport {
    return {
      matchScore,
      missingSkillsList: missingSkills,
      reportTimestamp: new Date().toISOString()
    };
  }
}
