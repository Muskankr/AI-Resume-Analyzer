// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CompareVersions } from './CompareVersions'
import type { AnalysisEntry } from '../../hooks/useAnalysisHistory'
import type { VersionComparison } from '../../hooks/useCompareVersions'

vi.mock('../../hooks/useCompareVersions', () => ({
  useCompareVersions: vi.fn(),
}))

vi.mock('../../utils/exportComparisonPdf', () => ({
  exportComparisonPdf: vi.fn(),
}))

import { useCompareVersions } from '../../hooks/useCompareVersions'

const mockEntries: AnalysisEntry[] = [
  {
    id: '1',
    timestamp: 1000,
    score: 85,
    skills: ['React'],
    suggestions: [],
    matchedSkills: ['React'],
    missingSkills: ['Vue'],
    targetRole: 'Frontend Developer',
    fileName: 'resume-v1.pdf',
  },
  {
    id: '2',
    timestamp: 2000,
    score: 92,
    skills: ['React', 'TypeScript'],
    suggestions: [],
    matchedSkills: ['React', 'TypeScript'],
    missingSkills: [],
    targetRole: 'Frontend Developer',
    fileName: 'resume-v2.pdf',
  },
]

const mockedUseCompareVersions = vi.mocked(useCompareVersions)

beforeEach(() => {
  mockedUseCompareVersions.mockReturnValue({
    comparison: null,
    loading: false,
    error: null,
    compare: vi.fn(),
    reset: vi.fn(),
  })
})

describe('CompareVersions diff viewer (#543)', () => {
  it('lets the user pick two saved uploads to diff', () => {
    render(<CompareVersions entries={mockEntries} token="test-token" onClose={() => {}} />)

    const older = screen.getByLabelText('Older version')
    const newer = screen.getByLabelText('Newer version')

    expect(older).toBeInTheDocument()
    expect(newer).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(4)
    expect(screen.getByRole('button', { name: /compare/i })).toBeInTheDocument()
  })

  it('shows a sign-in prompt when there is no token', () => {
    render(<CompareVersions entries={mockEntries} token={undefined} onClose={() => {}} />)

    expect(screen.getByText('Sign in to compare your saved resume versions.')).toBeInTheDocument()
  })

  it('highlights added and removed diff lines clearly', () => {
    const comparison: VersionComparison = {
      older_id: 1,
      newer_id: 2,
      older_label: 'resume-v1.pdf — Jan 01, 2026 10:00',
      newer_label: 'resume-v2.pdf — Jan 02, 2026 10:00',
      older_score: 85,
      newer_score: 92,
      score_delta: 7,
      added_skills: ['typescript'],
      removed_skills: ['vue'],
      newly_matched_skills: ['typescript'],
      newly_missing_skills: [],
      still_missing_skills: [],
      text_diff: [
        { type: 'removed', text: 'Familiar with Vue components' },
        { type: 'added', text: 'Built UIs with TypeScript and React' },
      ],
      insights: ['Your ATS score improved by 7 points.'],
    }

    mockedUseCompareVersions.mockReturnValue({
      comparison,
      loading: false,
      error: null,
      compare: vi.fn(),
      reset: vi.fn(),
    })

    render(<CompareVersions entries={mockEntries} token="test-token" onClose={() => {}} />)

    const removedLine = screen.getByText('- Familiar with Vue components')
    const addedLine = screen.getByText('+ Built UIs with TypeScript and React')

    expect(removedLine).toHaveClass('compare-diff-line--removed')
    expect(addedLine).toHaveClass('compare-diff-line--added')
  })
})
