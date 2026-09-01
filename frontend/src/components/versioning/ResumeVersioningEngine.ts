import type { ResumeVersionRecord, VersionFilterQuery, VersionAuditLog } from './types'

export class ResumeVersioningEngine {
  private static mockVersions: ResumeVersionRecord[] = [
    {
      versionId: 'VER-101',
      versionNumber: 'v2.4',
      versionTag: 'ATS_OPTIMIZED',
      author: 'Candidate (AI Optimizer)',
      createdAt: '2026-08-22 05:30:00',
      atsScore: 92,
      atsScoreDelta: 14,
      fileSizeKb: 142,
      isCurrentActiveVersion: true,
      sectionDiffs: [
        {
          sectionName: 'WORK_EXPERIENCE',
          originalText: 'Managed a team of developers working on microservices.',
          revisedText:
            'Spearheaded an agile team of 8 senior engineers building Kubernetes-orchestrated microservices, improving throughput by 42%.',
          diffStatus: 'MODIFIED',
          keywordScoreGain: 8,
        },
        {
          sectionName: 'SKILLS',
          originalText: 'React, Node, SQL',
          revisedText:
            'React 18, TypeScript, Node.js, PostgreSQL, Redis, Apache Kafka, Docker, Kubernetes',
          diffStatus: 'ADDED',
          keywordScoreGain: 6,
        },
      ],
    },
    {
      versionId: 'VER-100',
      versionNumber: 'v1.0',
      versionTag: 'INITIAL_DRAFT',
      author: 'Candidate',
      createdAt: '2026-08-20 10:15:00',
      atsScore: 78,
      atsScoreDelta: 0,
      fileSizeKb: 135,
      isCurrentActiveVersion: false,
      sectionDiffs: [],
    },
  ]

  private static mockAuditLogs: VersionAuditLog[] = [
    {
      logId: 'LOG-701',
      timestamp: '2026-08-22 05:30:12',
      action: 'VERSION_CREATED',
      details: 'Created v2.4 (ATS_OPTIMIZED) with +14 ATS score gain.',
      performer: 'AI Versioning Engine',
    },
    {
      logId: 'LOG-702',
      timestamp: '2026-08-22 05:35:00',
      action: 'DIFF_COMPARISON_EXPORTED',
      details: 'Exported side-by-side diff matrix between v1.0 and v2.4.',
      performer: 'Candidate',
    },
  ]

  public static getVersions(filters: VersionFilterQuery): ResumeVersionRecord[] {
    return this.mockVersions.filter((item) => {
      if (
        filters.versionTag &&
        filters.versionTag !== 'All' &&
        item.versionTag !== filters.versionTag
      ) {
        return false
      }
      if (filters.search && filters.search.trim() !== '') {
        const q = filters.search.toLowerCase()
        const matchesVer = item.versionNumber.toLowerCase().includes(q)
        const matchesAuthor = item.author.toLowerCase().includes(q)
        if (!matchesVer && !matchesAuthor) return false
      }
      return true
    })
  }

  public static getAuditLogs(): VersionAuditLog[] {
    return [...this.mockAuditLogs]
  }
}
