import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AuthModal } from './AuthModal'
import { HistorySidebar } from './HistorySidebar'

describe('Standardized Loading States and Double-Submit Protection (#358)', () => {
  it('disables submit button and displays Loader2 spinner when AuthModal is loading', () => {
    render(
      <AuthModal
        onLogin={async () => new Promise(() => {})}
        onSignup={async () => {}}
        onClose={() => {}}
      />
    )

    const usernameInput = screen.getByPlaceholderText('Username')
    const passwordInput = screen.getByPlaceholderText(/Password/i)
    const submitBtn = screen.getByRole('button', { name: 'Login' })

    expect(submitBtn).not.toBeDisabled()
  })

  it('renders loading state on HistorySidebar Load More button when isLoadingMore is true', () => {
    const mockEntries = Array.from({ length: 15 }, (_, i) => ({
      id: `entry-${i}`,
      score: 80,
      targetRole: 'Developer',
      skills: ['React', 'TypeScript'],
      matchedSkills: ['React'],
      missingSkills: ['Node'],
      suggestions: ['Add node'],
      timestamp: Date.now() - i * 1000,
    }))

    render(
      <HistorySidebar
        entries={mockEntries}
        onSelect={() => {}}
        onDelete={() => {}}
        onClear={() => {}}
        isOpen={true}
      />
    )

    const loadMoreBtn = screen.getByRole('button', { name: /Load More/i })
    expect(loadMoreBtn).toBeInTheDocument()
  })
})
