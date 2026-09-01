import type {
  AtsCandidateAnalyticsReport,
  AtsAnalyticsFilterQuery,
  AtsAnalyticsAuditLog,
} from './types'

export class AtsScoringAnalyticsEngine {
  private static mockReports: AtsCandidateAnalyticsReport[] = [
    {
      reportId: 'ATS-8001',
      candidateName: 'Samantha Reed',
      candidateEmail: 'samantha.reed@enterprise-architects.io',
      targetRoleTitle: 'Senior Cloud Solutions Architect',
      overallAtsScore: 91,
      scoringTier: 'SENIOR',
      passProbabilityPercent: 95,
      parsedSectionCount: 6,
      categoryBreakdown: [
        {
          categoryName: 'KEYWORD_MATCH',
          score: 88,
          weightPercentage: 35,
          status: 'EXCELLENT',
          benchmarkPercentile: 94,
          recommendations: [
            'Add explicit Kubernetes ingress controller keywords.',
            'Include AWS Transit Gateway architecture experience.',
          ],
        },
        {
          categoryName: 'FORMATTING_PARSING',
          score: 96,
          weightPercentage: 25,
          status: 'EXCELLENT',
          benchmarkPercentile: 98,
          recommendations: [
            'Font hierarchy and section tags fully compliant with Taleo & Workday ATS.',
          ],
        },
        {
          categoryName: 'QUANTIFIED_IMPACT',
          score: 90,
          weightPercentage: 20,
          status: 'EXCELLENT',
          benchmarkPercentile: 92,
          recommendations: [
            'Quantified cloud cost optimization metrics ($1.2M annual savings included).',
          ],
        },
        {
          categoryName: 'SECURITY_COMPLIANCE',
          score: 95,
          weightPercentage: 20,
          status: 'EXCELLENT',
          benchmarkPercentile: 96,
          recommendations: ['Zero PII leakage detected. GDPR and SOC2 compliant.'],
        },
      ],
      keywordMetrics: [
        {
          keyword: 'Kubernetes',
          category: 'HARD_SKILL',
          matchFound: true,
          relevanceWeight: 0.95,
          suggestedContextSnippet:
            'Orchestrated multi-region Kubernetes clusters handling 5M daily requests.',
        },
        {
          keyword: 'Terraform Cloud',
          category: 'HARD_SKILL',
          matchFound: false,
          relevanceWeight: 0.88,
          suggestedContextSnippet:
            'Automated infrastructure provisioning using HCL and Terraform Cloud pipelines.',
        },
      ],
      detectedSkillsCount: 24,
      missingCriticalKeywords: [
        'Terraform Cloud',
        'FinOps',
        'AWS Transit Gateway',
        'Zero Trust Network Architecture',
      ],
      createdAt: '2026-08-21 16:00:00',
      lastEvaluatedAt: '2026-08-22 06:15:00',
    },
    {
      reportId: 'ATS-8002',
      candidateName: 'David Chen',
      candidateEmail: 'david.chen@devops-lead.com',
      targetRoleTitle: 'Staff Backend Software Engineer',
      overallAtsScore: 76,
      scoringTier: 'MID_LEVEL',
      passProbabilityPercent: 78,
      parsedSectionCount: 5,
      categoryBreakdown: [
        {
          categoryName: 'KEYWORD_MATCH',
          score: 70,
          weightPercentage: 35,
          status: 'NEEDS_IMPROVEMENT',
          benchmarkPercentile: 72,
          recommendations: [
            'Missing distributed caching (Redis, Memcached) terminology.',
            'Add PostgreSQL index optimization examples.',
          ],
        },
        {
          categoryName: 'FORMATTING_PARSING',
          score: 92,
          weightPercentage: 25,
          status: 'EXCELLENT',
          benchmarkPercentile: 90,
          recommendations: ['Clean single-column layout parsed successfully.'],
        },
        {
          categoryName: 'QUANTIFIED_IMPACT',
          score: 68,
          weightPercentage: 20,
          status: 'NEEDS_IMPROVEMENT',
          benchmarkPercentile: 65,
          recommendations: ['Include percentage metrics for API latency reductions.'],
        },
      ],
      keywordMetrics: [
        {
          keyword: 'PostgreSQL',
          category: 'HARD_SKILL',
          matchFound: true,
          relevanceWeight: 0.9,
          suggestedContextSnippet: 'Designed highly available PostgreSQL database schemas.',
        },
      ],
      detectedSkillsCount: 16,
      missingCriticalKeywords: [
        'gRPC',
        'PostgreSQL Index Tuning',
        'Distributed Locking',
        'Redis Enterprise',
      ],
      createdAt: '2026-08-22 02:00:00',
      lastEvaluatedAt: '2026-08-22 06:10:00',
    },
    {
      reportId: 'ATS-8003',
      candidateName: 'Victoria Sterling',
      candidateEmail: 'victoria.sterling@fintech-exec.org',
      targetRoleTitle: 'VP of Engineering (Financial Systems)',
      overallAtsScore: 98,
      scoringTier: 'EXECUTIVE',
      passProbabilityPercent: 99,
      parsedSectionCount: 7,
      categoryBreakdown: [
        {
          categoryName: 'KEYWORD_MATCH',
          score: 99,
          weightPercentage: 35,
          status: 'EXCELLENT',
          benchmarkPercentile: 99,
          recommendations: ['Flawless keyword alignment across Executive & Board-level criteria.'],
        },
      ],
      keywordMetrics: [
        {
          keyword: 'SOC2 Type II',
          category: 'CERTIFICATION',
          matchFound: true,
          relevanceWeight: 0.99,
          suggestedContextSnippet:
            'Led annual SOC2 Type II audit compliance with zero non-conformances.',
        },
      ],
      detectedSkillsCount: 38,
      missingCriticalKeywords: [],
      createdAt: '2026-08-22 05:00:00',
      lastEvaluatedAt: '2026-08-22 06:18:00',
    },
  ]

  private static mockAuditLogs: AtsAnalyticsAuditLog[] = [
    {
      logId: 'ATS-LOG-1',
      timestamp: '2026-08-22 06:15:10',
      eventType: 'SCORE_RECALCULATED',
      details:
        'Recalculated ATS keyword match matrix against 2026 enterprise cloud role benchmarks.',
      performer: 'ATS Analytics Service',
      impactScope: '3 Candidate Reports Updated',
    },
    {
      logId: 'ATS-LOG-2',
      timestamp: '2026-08-22 06:17:00',
      eventType: 'KEYWORD_MATRIX_UPDATED',
      details:
        'Ingested 45 new high-impact FinOps & Kubernetes keywords from modern tech job specs.',
      performer: 'AI Taxonomy Sync Pipeline',
      impactScope: 'Global ATS Keyword Dictionary',
    },
  ]

  public static getReports(filters: AtsAnalyticsFilterQuery): AtsCandidateAnalyticsReport[] {
    return this.mockReports.filter((item) => {
      if (
        filters.scoringTier &&
        filters.scoringTier !== 'All' &&
        item.scoringTier !== filters.scoringTier
      ) {
        return false
      }
      if (filters.minScore && item.overallAtsScore < filters.minScore) {
        return false
      }
      if (filters.search && filters.search.trim() !== '') {
        const q = filters.search.toLowerCase()
        const matchesName = item.candidateName.toLowerCase().includes(q)
        const matchesRole = item.targetRoleTitle.toLowerCase().includes(q)
        const matchesEmail = item.candidateEmail.toLowerCase().includes(q)
        if (!matchesName && !matchesRole && !matchesEmail) return false
      }
      return true
    })
  }

  public static getAuditLogs(): AtsAnalyticsAuditLog[] {
    return [...this.mockAuditLogs]
  }
}
