// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { HistorySidebar } from './HistorySidebar'
import type { AnalysisEntry } from './hooks/useAnalysisHistory'

function makeEntries(count: number): AnalysisEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    id: String(index + 1),
    timestamp: 1000 + index,
    score: 70,
    skills: ['React'],
    suggestions: [],
    matchedSkills: ['React'],
    missingSkills: [],
    targetRole: 'Frontend Developer',
    fileName: `resume-${index + 1}.pdf`,
  }))
}

function renderSidebar(props: Partial<React.ComponentProps<typeof HistorySidebar>> = {}) {
  return render(
    <HistorySidebar
      entries={makeEntries(3)}
      isOpen
      onToggle={() => {}}
      onSelect={() => {}}
      onDelete={() => {}}
      onClear={() => {}}
      {...props}
    />
  )
}

describe('HistorySidebar server paging (#555)', () => {
  it('hides Load More when everything held locally is already shown', () => {
    renderSidebar()
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
  })

  it('offers Load More when the server reports older analyses', () => {
    renderSidebar({ hasMoreOnServer: true, onLoadMoreFromServer: vi.fn() })
    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
  })

  it('asks the server for the next page once local entries are exhausted', async () => {
    const onLoadMoreFromServer = vi.fn().mockResolvedValue(undefined)
    renderSidebar({ hasMoreOnServer: true, onLoadMoreFromServer })

    fireEvent.click(screen.getByRole('button', { name: /load more/i }))

    await waitFor(() => expect(onLoadMoreFromServer).toHaveBeenCalledTimes(1))
  })

  it('reveals locally held entries before going back to the server', () => {
    const onLoadMoreFromServer = vi.fn()
    // 12 entries with a local page size of 10 — the first click is local.
    renderSidebar({
      entries: makeEntries(12),
      hasMoreOnServer: true,
      onLoadMoreFromServer,
    })

    fireEvent.click(screen.getByRole('button', { name: /load more/i }))

    expect(onLoadMoreFromServer).not.toHaveBeenCalled()
  })

  it('does not break when no server-paging handler is supplied', () => {
    renderSidebar({ hasMoreOnServer: true })

    fireEvent.click(screen.getByRole('button', { name: /load more/i }))

    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
  })
})
