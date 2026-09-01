export type LighthouseMetricType =
  'PERFORMANCE' | 'ACCESSIBILITY' | 'BEST_PRACTICES' | 'SEO' | 'PWA'
export type MetricStatus = 'PASSED' | 'WARNING' | 'FAILED'

export interface LighthouseAuditMetric {
  metricId: string
  title: string
  type: LighthouseMetricType
  score: number
  weight: number
  status: MetricStatus
  recommendation: string
  documentationUrl: string
}

export interface LighthouseReportSuite {
  reportId: string
  targetPageUrl: string
  overallScore: number
  performanceScore: number
  accessibilityScore: number
  bestPracticesScore: number
  seoScore: number
  pwaScore: number
  auditMetrics: LighthouseAuditMetric[]
  evaluatedAt: string
}

export interface LighthouseFilterQuery {
  metricType?: string
  status?: string
  search?: string
}

export interface LighthouseAuditTimelineLog {
  logId: string
  timestamp: string
  eventType:
    | 'AUDIT_RUN_COMPLETED'
    | 'ACCESSIBILITY_FIX_APPLIED'
    | 'SEO_TAG_INJECTED'
    | 'LIGHTHOUSE_CI_VERIFIED'
  details: string
  performer: string
  impactScoreGain: number
}

export interface AuditMetricCategorySummary {
  performance: number
  accessibility: number
  bestPractices: number
  seo: number
}
