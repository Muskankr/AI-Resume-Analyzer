// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { HistorySidebar } from './HistorySidebar'
import type { AnalysisEntry } from './hooks/useAnalysisHistory'

const mockEntries: AnalysisEntry[] = [
  {
    id: '1',
    timestamp: 1000,
    score: 85,
    skills: ['React', 'TypeScript'],
    suggestions: ['Improve summary'],
    matchedSkills: ['React'],
    missingSkills: ['Vue'],
    targetRole: 'Frontend Developer',
    fileName: 'resume1.pdf',
  },
  {
    id: '2',
    timestamp: 2000,
    score: 90,
    skills: ['Python', 'Django'],
    suggestions: ['Add project links'],
    matchedSkills: ['Python'],
    missingSkills: ['Flask'],
    targetRole: 'Backend Developer',
    fileName: 'resume2.pdf',
  },
]

describe('HistorySidebar component (#246)', () => {
  it('has clear title/tooltip and aria-label identifying its purpose', () => {
    render(
      <HistorySidebar
        entries={mockEntries}
        unreadCount={2}
        lastViewedTimestamp={0}
        isOpen={false}
        onToggle={() => {}}
        onSelect={() => {}}
        onDelete={() => {}}
        onClear={() => {}}
      />
    )

    const toggleBtn = screen.getByRole('button', {
      name: /notifications and analysis history/i,
    })

    expect(toggleBtn).toBeInTheDocument()
    expect(toggleBtn).toHaveAttribute('title', 'Notifications & Analysis History (2 unread)')
  })

  it('displays the unread badge count when unreadCount > 0 and panel is closed', () => {
    render(
      <HistorySidebar
        entries={mockEntries}
        unreadCount={2}
        lastViewedTimestamp={0}
        isOpen={false}
        onToggle={() => {}}
        onSelect={() => {}}
        onDelete={() => {}}
        onClear={() => {}}
      />
    )

    const badge = screen.getByText('2')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('history-badge')
  })

  it('calls onMarkAllAsViewed and onToggle when clicking the toggle icon', () => {
    const handleToggle = vi.fn()
    const handleMarkAllAsViewed = vi.fn()

    render(
      <HistorySidebar
        entries={mockEntries}
        unreadCount={2}
        lastViewedTimestamp={0}
        isOpen={false}
        onToggle={handleToggle}
        onMarkAllAsViewed={handleMarkAllAsViewed}
        onSelect={() => {}}
        onDelete={() => {}}
        onClear={() => {}}
      />
    )

    const toggleBtn = screen.getByRole('button', {
      name: /notifications and analysis history/i,
    })

    fireEvent.click(toggleBtn)

    expect(handleMarkAllAsViewed).toHaveBeenCalledTimes(1)
    expect(handleToggle).toHaveBeenCalledTimes(1)
  })

  it('opens panel listing the actual notifications with NEW indicators for unread items', () => {
    render(
      <HistorySidebar
        entries={mockEntries}
        unreadCount={1}
        lastViewedTimestamp={1500}
        isOpen={true}
        onToggle={() => {}}
        onSelect={() => {}}
        onDelete={() => {}}
        onClear={() => {}}
      />
    )

    expect(screen.getByRole('heading', { name: /notifications & history/i })).toBeInTheDocument()
    expect(screen.getByText('resume1.pdf')).toBeInTheDocument()
    expect(screen.getByText('resume2.pdf')).toBeInTheDocument()

    // Entry with timestamp 2000 > 1500 should have 'NEW' badge
    const newBadges = screen.getAllByText('NEW')
    expect(newBadges).toHaveLength(1)
  })
})
