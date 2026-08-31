/**
 * Candidate Portfolio Repository Commit Telemetry & Activity Pulse Analyzer
 * Evaluates candidate contribution consistency over time, commit message clarity,
 * code revision churn rate, and collaboration ratio across open-source repositories.
 */

export interface RepositoryCommitTelemetry {
  commitHash: string;
  authorEmail: string;
  committedDate: string;
  linesAdded: number;
  linesDeleted: number;
  filesChangedCount: number;
  commitMessage: string;
  isMergeCommit: boolean;
}

export interface ActivityPulseAnalysisResult {
  repositoryId: string;
  totalAnalyzedCommits: number;
  averageCommitMessageLength: number;
  descriptiveCommitPercentage: number; // 0 - 100
  codeChurnRatio: number; // deletions / additions
  collaborationIndex: number; // 0 - 100
  cadenceHealthTier: 'SUSTAINED_ENGINEERING_CADENCE' | 'REGULAR_CONTRIBUTOR' | 'UNHEALTHY_CHURN' | 'LOW_ACTIVITY';
  insights: string[];
}

/**
 * Analyzes repository commit telemetry log to compute developer engineering discipline metrics.
 */
export function analyzeCandidateCommitTelemetry(
  repositoryId: string,
  commits: RepositoryCommitTelemetry[]
): ActivityPulseAnalysisResult {
  if (!commits || commits.length === 0) {
    return {
      repositoryId,
      totalAnalyzedCommits: 0,
      averageCommitMessageLength: 0,
      descriptiveCommitPercentage: 0,
      codeChurnRatio: 0,
      collaborationIndex: 0,
      cadenceHealthTier: 'LOW_ACTIVITY',
      insights: ['No commit telemetry available for activity pulse analysis.'],
    };
  }

  let totalMessageLength = 0;
  let descriptiveCommitsCount = 0;
  let totalAdditions = 0;
  let totalDeletions = 0;
  let mergeCommitCount = 0;

  for (const c of commits) {
    const msgTrimmed = c.commitMessage.trim();
    totalMessageLength += msgTrimmed.length;

    // A commit message is considered descriptive if it has > 15 characters and clear action verbs/scopes
    if (msgTrimmed.length >= 15 && !/^(wip|fix|update|test|stuff|asdf)$/i.test(msgTrimmed)) {
      descriptiveCommitsCount++;
    }

    totalAdditions += c.linesAdded;
    totalDeletions += c.linesDeleted;

    if (c.isMergeCommit) {
      mergeCommitCount++;
    }
  }

  const count = commits.length;
  const avgMsgLen = Math.round(totalMessageLength / count);
  const descriptivePct = Math.round((descriptiveCommitsCount / count) * 100);
  const churnRatio = totalAdditions > 0 ? parseFloat((totalDeletions / totalAdditions).toFixed(2)) : 0;
  const collaborationIndex = Math.min(100, Math.round((mergeCommitCount / count) * 200));

  const insights: string[] = [];
  if (descriptivePct >= 80) {
    insights.push('Candidate consistently writes informative git commit messages adhering to conventional standards.');
  } else {
    insights.push('Commit messages could benefit from more detailed context and descriptive scope markers.');
  }

  if (churnRatio > 1.5) {
    insights.push('High code churn ratio detected, indicating frequent code rewrites or unstable specifications.');
  } else if (churnRatio >= 0.1 && churnRatio <= 0.6) {
    insights.push('Optimal code addition/deletion ratio representing healthy refactoring and iteration.');
  }

  let tier: ActivityPulseAnalysisResult['cadenceHealthTier'] = 'REGULAR_CONTRIBUTOR';
  if (descriptivePct >= 75 && churnRatio <= 1.0 && count >= 20) {
    tier = 'SUSTAINED_ENGINEERING_CADENCE';
  } else if (churnRatio > 2.0) {
    tier = 'UNHEALTHY_CHURN';
  } else if (count < 5) {
    tier = 'LOW_ACTIVITY';
  }

  return {
    repositoryId,
    totalAnalyzedCommits: count,
    averageCommitMessageLength: avgMsgLen,
    descriptiveCommitPercentage: descriptivePct,
    codeChurnRatio: churnRatio,
    collaborationIndex,
    cadenceHealthTier: tier,
    insights,
  };
}
