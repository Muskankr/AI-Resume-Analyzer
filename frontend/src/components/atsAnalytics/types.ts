export type ScoringTier = 'EXECUTIVE' | 'SENIOR' | 'MID_LEVEL' | 'ENTRY_LEVEL'

export interface AtsCategoryScore {
  categoryName:
    | 'KEYWORD_MATCH'
    | 'FORMATTING_PARSING'
    | 'QUANTIFIED_IMPACT'
    | 'SECTION_COMPLETION'
    | 'BREVITY'
    | 'SECURITY_COMPLIANCE'
  score: number
  weightPercentage: number
  status: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT'
  recommendations: string[]
  benchmarkPercentile: number
}

export interface AtsKeywordMatchMetric {
  keyword: string
  category: 'HARD_SKILL' | 'SOFT_SKILL' | 'CERTIFICATION' | 'DOMAIN_KNOWLEDGE'
  matchFound: boolean
  relevanceWeight: number
  suggestedContextSnippet: string
}

export interface AtsCandidateAnalyticsReport {
  reportId: string
  candidateName: string
  targetRoleTitle: string
  overallAtsScore: number
  scoringTier: ScoringTier
  passProbabilityPercent: number
  categoryBreakdown: AtsCategoryScore[]
  detectedSkillsCount: number
  missingCriticalKeywords: string[]
  keywordMetrics: AtsKeywordMatchMetric[]
  createdAt: string
  lastEvaluatedAt: string
  candidateEmail: string
  parsedSectionCount: number
}

export interface AtsAnalyticsFilterQuery {
  scoringTier?: string
  search?: string
  minScore?: number
}

export interface AtsAnalyticsAuditLog {
  logId: string
  timestamp: string
  eventType:
    'SCORE_RECALCULATED' | 'KEYWORD_MATRIX_UPDATED' | 'REPORT_EXPORTED' | 'PARSER_RULE_UPDATED'
  details: string
  performer: string
  impactScope: string
}
