export type VersionTag =
  'INITIAL_DRAFT' | 'ATS_OPTIMIZED' | 'EXECUTIVE_REVISED' | 'TAILORED_APPLIED'

export interface ResumeSectionDiff {
  sectionName: 'SUMMARY' | 'WORK_EXPERIENCE' | 'SKILLS' | 'EDUCATION' | 'PROJECTS'
  originalText: string
  revisedText: string
  diffStatus: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED'
  keywordScoreGain: number
}

export interface ResumeVersionRecord {
  versionId: string
  versionNumber: string
  versionTag: VersionTag
  author: string
  createdAt: string
  atsScore: number
  atsScoreDelta: number
  sectionDiffs: ResumeSectionDiff[]
  fileSizeKb: number
  isCurrentActiveVersion: boolean
}

export interface VersionFilterQuery {
  versionTag?: string
  search?: string
}

export interface VersionAuditLog {
  logId: string
  timestamp: string
  action: 'VERSION_CREATED' | 'VERSION_RESTORED' | 'DIFF_COMPARISON_EXPORTED'
  details: string
  performer: string
}
