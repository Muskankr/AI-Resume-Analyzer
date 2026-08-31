import type { IndustryPeerComparison, PeerBenchmarkFilterQuery, BenchmarkAuditLog } from './types'

export class ResumeBenchmarkingEngine {
  private static initialComparisons: IndustryPeerComparison[] = [
    {
      targetRole: 'Senior Full Stack Engineer',
      industryDomain: 'FinTech & Banking',
      experienceLevel: 'Senior',
      userScore: 84,
      industryAverageScore: 71,
      top10PercentileScore: 93,
      missingHighImpactKeywords: [
        'Kafka',
        'Microfrontends',
        'Distributed Transactions',
        'Kubernetes',
        'PCI-DSS',
      ],
      recommendedCertifications: [
        'AWS Certified Solutions Architect',
        'Certified Kubernetes Application Developer (CKAD)',
      ],
      benchmarkMetrics: {
        percentileRank: 82,
        atsPassProbability: 89,
        keywordDensityScore: 78,
        formattingScore: 92,
        brevityConcisenessScore: 85,
        actionVerbImpactScore: 88,
        leadershipQuantificationScore: 80,
      },
    },
    {
      targetRole: 'Lead AI Infrastructure Engineer',
      industryDomain: 'Artificial Intelligence / DeepTech',
      experienceLevel: 'Executive',
      userScore: 89,
      industryAverageScore: 76,
      top10PercentileScore: 96,
      missingHighImpactKeywords: [
        'PyTorch Distributed',
        'vLLM Optimization',
        'CUDA Kernels',
        'Triton Server',
        'MLOps Pipeline',
      ],
      recommendedCertifications: ['NVIDIA Certified Associate - Generative AI', 'AWS ML Specialty'],
      benchmarkMetrics: {
        percentileRank: 91,
        atsPassProbability: 94,
        keywordDensityScore: 86,
        formattingScore: 90,
        brevityConcisenessScore: 88,
        actionVerbImpactScore: 94,
        leadershipQuantificationScore: 92,
      },
    },
    {
      targetRole: 'Product Manager - Core Platform',
      industryDomain: 'SaaS & Enterprise Cloud',
      experienceLevel: 'Mid-Career',
      userScore: 76,
      industryAverageScore: 68,
      top10PercentileScore: 88,
      missingHighImpactKeywords: [
        'Product-Led Growth (PLG)',
        'ARR Expansion',
        'User Retention Funnel',
        'SQL Data Warehouse',
        'Customer Discovery',
      ],
      recommendedCertifications: ['Certified Scrum Product Owner (CSPO)', 'Product School PMC'],
      benchmarkMetrics: {
        percentileRank: 73,
        atsPassProbability: 81,
        keywordDensityScore: 72,
        formattingScore: 88,
        brevityConcisenessScore: 79,
        actionVerbImpactScore: 82,
        leadershipQuantificationScore: 75,
      },
    },
    {
      targetRole: 'Cybersecurity Operations Lead',
      industryDomain: 'Healthcare & HealthTech',
      experienceLevel: 'Senior',
      userScore: 91,
      industryAverageScore: 74,
      top10PercentileScore: 95,
      missingHighImpactKeywords: [
        'HIPAA Compliance',
        'SIEM Integration',
        'Zero-Trust Architecture',
        'Threat Hunting',
        'SOC2 Type II',
      ],
      recommendedCertifications: [
        'CISSP - Certified Information Systems Security Professional',
        'CEH Master',
      ],
      benchmarkMetrics: {
        percentileRank: 94,
        atsPassProbability: 96,
        keywordDensityScore: 90,
        formattingScore: 94,
        brevityConcisenessScore: 91,
        actionVerbImpactScore: 89,
        leadershipQuantificationScore: 87,
      },
    },
  ]

  private static initialAuditLogs: BenchmarkAuditLog[] = [
    {
      id: 'LOG-8801',
      timestamp: '2026-08-22 05:42:11',
      action: 'BENCHMARK_CALCULATED',
      details: 'Calculated Industry Percentile vs 14,250 Senior Software Engineers in FinTech.',
      performer: 'Enterprise ATS Engine v4.2',
      scoreDelta: '+5% above domain median',
    },
    {
      id: 'LOG-8802',
      timestamp: '2026-08-22 05:45:30',
      action: 'TARGET_ROLE_UPDATED',
      details: 'Updated target role from Full Stack Engineer to Senior Full Stack Engineer.',
      performer: 'User Candidate',
      scoreDelta: 'Re-indexed benchmark metrics',
    },
    {
      id: 'LOG-8803',
      timestamp: '2026-08-22 05:50:04',
      action: 'PDF_EXPORTED',
      details:
        'Generated executive peer benchmark analysis PDF report with high-impact keyword audit.',
      performer: 'Export Service',
      scoreDelta: 'Export Successful',
    },
  ]

  public static getComparisons(filters: PeerBenchmarkFilterQuery): IndustryPeerComparison[] {
    return this.initialComparisons.filter((item) => {
      if (
        filters.industryDomain &&
        filters.industryDomain !== 'All' &&
        item.industryDomain !== filters.industryDomain
      ) {
        return false
      }
      if (
        filters.experienceLevel &&
        filters.experienceLevel !== 'All' &&
        item.experienceLevel !== filters.experienceLevel
      ) {
        return false
      }
      if (filters.search && filters.search.trim() !== '') {
        const query = filters.search.toLowerCase()
        const matchesRole = item.targetRole.toLowerCase().includes(query)
        const matchesIndustry = item.industryDomain.toLowerCase().includes(query)
        if (!matchesRole && !matchesIndustry) return false
      }
      return true
    })
  }

  public static getAuditLogs(): BenchmarkAuditLog[] {
    return [...this.initialAuditLogs]
  }

  public static calculateCustomScore(userScore: number, missingCount: number): number {
    const penalty = missingCount * 1.5
    return Math.max(0, Math.min(100, Math.round(userScore - penalty)))
  }
}
