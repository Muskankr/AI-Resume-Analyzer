import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AtsScore } from './AtsScore'

describe('AtsScore component', () => {
  it('renders correctly with low score (e.g. 20)', () => {
    render(<AtsScore score={20} readabilityLabel="hard" />)

    // Check score text
    expect(screen.getByText('20%')).toBeInTheDocument()

    // Check accessibility meter
    const meter = screen.getByRole('meter', { name: /ATS Match Score/i })
    expect(meter).toHaveAttribute('aria-valuenow', '20')
    expect(meter).toHaveAttribute('aria-valuemin', '0')
    expect(meter).toHaveAttribute('aria-valuemax', '100')

    // Check region and heading
    expect(screen.getByRole('region', { name: /ATS Resume Score Summary/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /ATS Resume Score/i })).toBeInTheDocument()

    // Check readability label
    expect(screen.getByText(/Readability:/i)).toBeInTheDocument()
    expect(screen.getByText('hard')).toBeInTheDocument()
  })

  it('renders correctly with medium score (e.g. 60)', () => {
    render(<AtsScore score={60} readabilityLabel="medium" />)

    expect(screen.getByText('60%')).toBeInTheDocument()
    const meter = screen.getByRole('meter', { name: /ATS Match Score/i })
    expect(meter).toHaveAttribute('aria-valuenow', '60')
    expect(screen.getByText('medium')).toBeInTheDocument()
  })

  it('renders correctly with high score (e.g. 95)', () => {
    render(<AtsScore score={95} readabilityLabel="easy" />)

    expect(screen.getByText('95%')).toBeInTheDocument()
    const meter = screen.getByRole('meter', { name: /ATS Match Score/i })
    expect(meter).toHaveAttribute('aria-valuenow', '95')
    expect(screen.getByText('easy')).toBeInTheDocument()
  })

  it('renders without readability label when not provided', () => {
    render(<AtsScore score={85} />)

    expect(screen.getByText('85%')).toBeInTheDocument()
    expect(screen.queryByText(/Readability:/i)).not.toBeInTheDocument()
  })
})
