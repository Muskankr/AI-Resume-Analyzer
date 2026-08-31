/**
 * Job Description Matcher Action Item Generator Extensions
 */

export interface ActionItemRecommendation {
  skill: string;
  category: string;
  actionText: string;
}

export class JobMatcherActionItemEngine {
  public static generateRecommendations(missingSkills: string[]): ActionItemRecommendation[] {
    return missingSkills.map(skill => ({
      skill,
      category: 'TECHNICAL_SKILL',
      actionText: `Incorporate experience with ${skill} in your recent project bullet points to improve ATS keyword parsing.`
    }));
  }
}
