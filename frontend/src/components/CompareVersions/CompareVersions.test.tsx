// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    // Unambiguous only because the three view switchers are tabs, not buttons.
    // Before that they were plain <button>s and "Compare Local Files" matched
    // this query too, which is what made the suite red.
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

describe('CompareVersions tab bar (#863)', () => {
  const renderDialog = () =>
    render(<CompareVersions entries={mockEntries} token="test-token" onClose={() => {}} />)

  it('exposes the three views as a labelled tablist, not as buttons', () => {
    renderDialog()

    const tablist = screen.getByRole('tablist', { name: 'Comparison view' })
    const tabs = within(tablist).getAllByRole('tab')

    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Versions History',
      'Compare Local Files',
      'Bulk Job Descriptions',
    ])

    // The regression this guards: while these were <button>s, the action
    // button and the "Compare Local Files" switcher shared an accessible name.
    expect(screen.queryByRole('button', { name: 'Compare Local Files' })).toBeNull()
  })

  it('marks exactly one tab selected and points it at the visible panel', () => {
    renderDialog()

    const tabs = screen.getAllByRole('tab')
    const selected = tabs.filter((tab) => tab.getAttribute('aria-selected') === 'true')

    expect(selected).toHaveLength(1)
    expect(selected[0]).toHaveTextContent('Versions History')

    const panel = screen.getByRole('tabpanel')
    expect(panel).toHaveAttribute('id', selected[0].getAttribute('aria-controls'))
    expect(panel).toHaveAttribute('aria-labelledby', selected[0].id)
  })

  it('keeps the whole tablist to a single tab stop', () => {
    renderDialog()

    const tabs = screen.getAllByRole('tab')

    expect(tabs[0]).toHaveAttribute('tabindex', '0')
    expect(tabs[1]).toHaveAttribute('tabindex', '-1')
    expect(tabs[2]).toHaveAttribute('tabindex', '-1')
  })

  it('moves between tabs with the arrow keys and wraps at both ends', async () => {
    const user = userEvent.setup()
    renderDialog()

    const [versions, uploads, bulkJds] = screen.getAllByRole('tab')
    versions.focus()

    await user.keyboard('{ArrowRight}')
    expect(uploads).toHaveAttribute('aria-selected', 'true')
    expect(uploads).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(bulkJds).toHaveAttribute('aria-selected', 'true')

    // Wraps forward off the end...
    await user.keyboard('{ArrowRight}')
    expect(versions).toHaveAttribute('aria-selected', 'true')

    // ...and backward off the start.
    await user.keyboard('{ArrowLeft}')
    expect(bulkJds).toHaveAttribute('aria-selected', 'true')
  })

  it('jumps to the first and last tab with Home and End', async () => {
    const user = userEvent.setup()
    renderDialog()

    const [versions, , bulkJds] = screen.getAllByRole('tab')
    versions.focus()

    await user.keyboard('{End}')
    expect(bulkJds).toHaveAttribute('aria-selected', 'true')
    expect(bulkJds).toHaveFocus()

    await user.keyboard('{Home}')
    expect(versions).toHaveAttribute('aria-selected', 'true')
    expect(versions).toHaveFocus()
  })

  it('leaves other keys to the browser', async () => {
    const user = userEvent.setup()
    renderDialog()

    const [versions] = screen.getAllByRole('tab')
    versions.focus()

    await user.keyboard('{ArrowDown}')

    expect(versions).toHaveAttribute('aria-selected', 'true')
  })

  it('swaps the panel contents when a tab is clicked', async () => {
    const user = userEvent.setup()
    renderDialog()

    expect(screen.getByLabelText('Older version')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Bulk Job Descriptions' }))

    expect(screen.queryByLabelText('Older version')).toBeNull()
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'compare-tabpanel-bulk_jds')
  })
})
