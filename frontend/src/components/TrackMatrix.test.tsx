// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TrackMatrix } from './TrackMatrix'
import type { TrackComparisons } from './TrackMatrix'

const mockComparisons: TrackComparisons = {
  'Frontend Developer': {
    score: 85,
    matched_skills: ['react', 'css'],
    missing_skills: ['typescript'],
    suggestions: ['Add typescript'],
  },
  'Backend Developer': {
    score: 45,
    matched_skills: ['node'],
    missing_skills: ['python', 'sql'],
    suggestions: ['Add python'],
  },
  'Data Analyst': {
    score: 20,
    matched_skills: [],
    missing_skills: ['python', 'sql', 'excel'],
    suggestions: ['Add sql'],
  },
}

describe('TrackMatrix Component', () => {
  it('renders without crashing and displays all tracks sorted by score', () => {
    render(
      <TrackMatrix
        trackComparisons={mockComparisons}
        activeRole="Frontend Developer"
        onRowClick={vi.fn()}
      />
    )

    // Check if table renders
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()

    // Check headers
    expect(screen.getByText(/Career Track/i)).toBeInTheDocument()
    expect(screen.getByText(/Match %/i)).toBeInTheDocument()

    // Check rows exist
    const frontendRow = screen.getByText('Frontend Developer')
    const backendRow = screen.getByText('Backend Developer')
    const dataAnalystRow = screen.getByText('Data Analyst')

    expect(frontendRow).toBeInTheDocument()
    expect(backendRow).toBeInTheDocument()
    expect(dataAnalystRow).toBeInTheDocument()
  })

  it('triggers onRowClick when a row is clicked', () => {
    const onRowClick = vi.fn()
    render(
      <TrackMatrix
        trackComparisons={mockComparisons}
        activeRole="Frontend Developer"
        onRowClick={onRowClick}
      />
    )

    const backendRow = screen.getByText('Backend Developer')
    fireEvent.click(backendRow)

    expect(onRowClick).toHaveBeenCalledWith('Backend Developer')
  })

  it('displays the correct status indicator based on score', () => {
    render(
      <TrackMatrix
        trackComparisons={mockComparisons}
        activeRole="Frontend Developer"
        onRowClick={vi.fn()}
      />
    )

    // 85% -> Strong Match
    expect(screen.getByText('Strong Match')).toBeInTheDocument()
    // 45% -> Potential Match
    expect(screen.getByText('Potential Match')).toBeInTheDocument()
    // 20% -> Needs Improvement
    expect(screen.getByText('Needs Improvement')).toBeInTheDocument()
  })

  it('renders an empty state when no comparisons are provided', () => {
    render(
      <TrackMatrix
        trackComparisons={{}}
        activeRole="Frontend Developer"
        onRowClick={vi.fn()}
      />
    )

    expect(screen.getByText(/No track comparison data available/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
