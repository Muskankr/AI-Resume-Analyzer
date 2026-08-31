/**
 * GitHub Open-Source Commit Consistency & Activity Frequency Telemetry Utilities
 */

export interface GithubCommitActivityMetrics {
  totalCommitsLastYear: number;
  longestCommitStreakDays: number;
  isContributionActive: boolean;
}

/**
 * Validates GitHub contribution commit frequency and activity streak.
 */
export function evaluateGithubCommitActivity(
  totalCommits: number,
  streakDays: number
): GithubCommitActivityMetrics {
  const isActive = totalCommits >= 100 && streakDays >= 7;

  return {
    totalCommitsLastYear: totalCommits,
    longestCommitStreakDays: streakDays,
    isContributionActive: isActive,
  };
}
