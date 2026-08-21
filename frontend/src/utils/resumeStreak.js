export function calculateResumeStreak(history = []) {
  if (!Array.isArray(history) || history.length < 2) {
    return { hasStreak: false, totalAnalyses: history.length, percentageImprovement: 0 };
  }

  // Sort history by timestamp ascending
  const sorted = [...history].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  
  const initialScore = Number(sorted[0].score) || 0;
  const latestScore = Number(sorted[sorted.length - 1].score) || 0;

  if (initialScore === 0) {
    return { hasStreak: true, totalAnalyses: history.length, percentageImprovement: 0 };
  }

  const diff = latestScore - initialScore;
  const percentageImprovement = Math.round((diff / initialScore) * 100);

  return {
    hasStreak: true,
    totalAnalyses: history.length,
    percentageImprovement,
    isImproved: percentageImprovement > 0,
  };
}
