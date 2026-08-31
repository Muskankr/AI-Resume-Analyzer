// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ResumeStreakBadge } from './ResumeStreakBadge'

const at = (timestamp: number, score: number) => ({ timestamp, score })

describe('ResumeStreakBadge (#866)', () => {
  it('shows a rise as a rise', () => {
    render(<ResumeStreakBadge analysisHistory={[at(2_000, 80), at(1_000, 60)]} />)

    expect(screen.getByText(/2 analyses, \+33%/)).toBeInTheDocument()
  })

  it('shows a fall as a fall, rather than congratulating the user on it', () => {
    // The old component rendered an upward-trending arrow unconditionally,
    // beside a percentage whose sign was reversed.
    const { container } = render(
      <ResumeStreakBadge analysisHistory={[at(2_000, 60), at(1_000, 80)]} />
    )

    expect(screen.getByText(/2 analyses, -25%/)).toBeInTheDocument()
    expect(container.querySelector('.resume-streak-badge')).toHaveClass('is-down')
    expect(container.querySelector('.lucide-trending-up')).toBeNull()
  })

  it('says "no change" instead of "+0%"', () => {
    const { container } = render(
      <ResumeStreakBadge analysisHistory={[at(2_000, 70), at(1_000, 70)]} />
    )

    expect(screen.getByText(/2 analyses, no change/)).toBeInTheDocument()
    expect(container.querySelector('.resume-streak-badge')).toHaveClass('is-flat')
  })

  it('names the two scores it compared, for anyone who cannot see the chart', () => {
    render(<ResumeStreakBadge analysisHistory={[at(2_000, 80), at(1_000, 60)]} />)

    expect(screen.getByText(/first analysis scored 60%, latest scored 80%/)).toBeInTheDocument()
  })

  it('renders nothing without enough history', () => {
    const { container } = render(<ResumeStreakBadge analysisHistory={[at(1_000, 70)]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing with no history at all', () => {
    const { container } = render(<ResumeStreakBadge />)
    expect(container).toBeEmptyDOMElement()
  })
})
