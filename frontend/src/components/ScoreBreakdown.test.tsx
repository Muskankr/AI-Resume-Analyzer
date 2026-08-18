// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ScoreBreakdown, type ScoreBreakdownData } from './ScoreBreakdown'

const BREAKDOWN: ScoreBreakdownData = {
  overall: 62,
  summary: 'Solid resume with room to improve. Biggest opportunity: quantified achievements.',
  factors: [
    {
      key: 'keyword_match',
      label: 'Keyword & role match',
      earned: 32,
      possible: 40,
      status: 'partial',
      detail: '8 of 10 target keywords found (80% coverage).',
    },
    {
      key: 'sections',
      label: 'Section coverage',
      earned: 15,
      possible: 15,
      status: 'strong',
      detail: 'All four expected sections are present.',
    },
    {
      key: 'quantification',
      label: 'Quantified achievements',
      earned: 2,
      possible: 10,
      status: 'weak',
      detail: '6 accomplishment bullet(s) have no metric.',
    },
  ],
}

describe('ScoreBreakdown (#554)', () => {
  it('renders nothing when no breakdown is available', () => {
    const { container } = render(<ScoreBreakdown breakdown={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the breakdown has no factors', () => {
    const { container } = render(
      <ScoreBreakdown breakdown={{ overall: 0, summary: '', factors: [] }} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the overall score and summary without being expanded', () => {
    render(<ScoreBreakdown breakdown={BREAKDOWN} />)

    expect(screen.getByText('62/100')).toBeInTheDocument()
    expect(screen.getByText(/Solid resume with room to improve/)).toBeInTheDocument()
    expect(screen.queryByText('Section coverage')).not.toBeInTheDocument()
  })

  it('expands and collapses the factor list', () => {
    render(<ScoreBreakdown breakdown={BREAKDOWN} />)
    const toggle = screen.getByRole('button', { name: /how this score was calculated/i })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Section coverage')).toBeInTheDocument()

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Section coverage')).not.toBeInTheDocument()
  })

  it('lists every factor with its points and explanation', () => {
    render(<ScoreBreakdown breakdown={BREAKDOWN} defaultExpanded />)

    expect(screen.getByText('32 / 40 pts')).toBeInTheDocument()
    expect(screen.getByText('15 / 15 pts')).toBeInTheDocument()
    expect(screen.getByText('2 / 10 pts')).toBeInTheDocument()
    expect(screen.getByText(/8 of 10 target keywords found/)).toBeInTheDocument()
  })

  it('exposes each factor as a labelled progress bar', () => {
    render(<ScoreBreakdown breakdown={BREAKDOWN} defaultExpanded />)

    const bar = screen.getByRole('progressbar', {
      name: /Section coverage: 15 of 15 points/i,
    })
    expect(bar).toHaveAttribute('aria-valuenow', '15')
    expect(bar).toHaveAttribute('aria-valuemax', '15')
  })

  it('calls out the weakest factor and the points still available', () => {
    render(<ScoreBreakdown breakdown={BREAKDOWN} defaultExpanded />)

    const footnote = screen.getByText(/biggest single opportunity/i)
    expect(footnote).toHaveTextContent('quantified achievements')
    expect(footnote).toHaveTextContent('8 more points')
  })

  it('marks weak factors with a status class rather than colour alone', () => {
    const { container } = render(<ScoreBreakdown breakdown={BREAKDOWN} defaultExpanded />)

    expect(container.querySelectorAll('.score-breakdown__factor--weak')).toHaveLength(1)
    expect(container.querySelectorAll('.score-breakdown__factor--strong')).toHaveLength(1)
    expect(screen.getAllByTitle('Weak')).toHaveLength(1)
  })
})
