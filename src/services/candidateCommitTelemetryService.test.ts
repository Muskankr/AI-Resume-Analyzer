import {
  analyzeCandidateCommitTelemetry,
  RepositoryCommitTelemetry,
} from './candidateCommitTelemetryService';

describe('CandidateCommitTelemetryService', () => {
  const sampleCommits: RepositoryCommitTelemetry[] = [
    {
      commitHash: 'a1b2c3d',
      authorEmail: 'dev@example.com',
      committedDate: '2026-08-01T10:00:00Z',
      linesAdded: 150,
      linesDeleted: 20,
      filesChangedCount: 3,
      commitMessage: 'feat(verification): implement candidate portfolio evaluation pipeline',
      isMergeCommit: false,
    },
    {
      commitHash: 'e4f5g6h',
      authorEmail: 'dev@example.com',
      committedDate: '2026-08-02T11:00:00Z',
      linesAdded: 80,
      linesDeleted: 15,
      filesChangedCount: 2,
      commitMessage: 'test(verification): add unit test coverage for activity pulse analysis',
      isMergeCommit: false,
    },
    {
      commitHash: 'i7j8k9l',
      authorEmail: 'dev@example.com',
      committedDate: '2026-08-03T14:00:00Z',
      linesAdded: 10,
      linesDeleted: 0,
      filesChangedCount: 1,
      commitMessage: 'Merge pull request #12 from dev/feature-branch',
      isMergeCommit: true,
    },
  ];

  it('analyzes candidate commit history and calculates cadence metrics accurately', () => {
    const result = analyzeCandidateCommitTelemetry('repo-telemetry-1', sampleCommits);

    expect(result.repositoryId).toBe('repo-telemetry-1');
    expect(result.totalAnalyzedCommits).toBe(3);
    expect(result.descriptiveCommitPercentage).toBe(100);
    expect(result.codeChurnRatio).toBe(0.15);
    expect(result.collaborationIndex).toBeGreaterThan(0);
    expect(result.insights.length).toBeGreaterThan(0);
  });

  it('handles empty commit telemetry gracefully', () => {
    const result = analyzeCandidateCommitTelemetry('repo-empty', []);

    expect(result.totalAnalyzedCommits).toBe(0);
    expect(result.cadenceHealthTier).toBe('LOW_ACTIVITY');
    expect(result.insights).toContain('No commit telemetry available for activity pulse analysis.');
  });
});
