export interface IndustryBenchmarkMetrics {
  percentileRank: number
  atsPassProbability: number
  keywordDensityScore: number
  formattingScore: number
  brevityConcisenessScore: number
  actionVerbImpactScore: number
  leadershipQuantificationScore: number
}

export interface IndustryPeerComparison {
  targetRole: string
  industryDomain: string
  experienceLevel: 'Entry-Level' | 'Mid-Career' | 'Senior' | 'Executive'
  userScore: number
  industryAverageScore: number
  top10PercentileScore: number
  missingHighImpactKeywords: string[]
  recommendedCertifications: string[]
  benchmarkMetrics: IndustryBenchmarkMetrics
}

export interface PeerBenchmarkFilterQuery {
  industryDomain?: string
  targetRole?: string
  experienceLevel?: string
  search?: string
}

export interface BenchmarkAuditLog {
  id: string
  timestamp: string
  action: 'BENCHMARK_CALCULATED' | 'TARGET_ROLE_UPDATED' | 'PDF_EXPORTED' | 'METRIC_COMPARISON_RAN'
  details: string
  performer: string
  scoreDelta?: string
}
