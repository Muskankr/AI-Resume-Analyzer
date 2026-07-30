// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CuratedTips } from './CuratedTips'
import { careerResumeTips } from '../data/careerResumeTips'

// Mock the data module so we can test predictably
vi.mock('../data/careerResumeTips', () => ({
  careerResumeTips: {
    'Frontend Developer': ['Tip 1 for frontend', 'Tip 2 for frontend'],
    'Backend Developer': ['Tip 1 for backend'],
  },
}))

describe('CuratedTips Component', () => {
  it('renders curated tips when available for the target role', () => {
    render(<CuratedTips targetRole="Frontend Developer" />)

    expect(screen.getByText('Curated Tips for Frontend Developer')).toBeInTheDocument()
    expect(screen.getByText('Tip 1 for frontend')).toBeInTheDocument()
    expect(screen.getByText('Tip 2 for frontend')).toBeInTheDocument()
  })

  it('renders the fallback message when no tips exist for the target role', () => {
    render(<CuratedTips targetRole="Unknown Track" />)

    expect(screen.getByText('Curated Tips for Unknown Track')).toBeInTheDocument()
    expect(
      screen.getByText('No additional curated resume tips are available for this career track.')
    ).toBeInTheDocument()
  })

  it('switches career tracks and renders new tips', () => {
    const { rerender } = render(<CuratedTips targetRole="Frontend Developer" />)

    expect(screen.getByText('Tip 1 for frontend')).toBeInTheDocument()

    // Switch to Backend Developer
    rerender(<CuratedTips targetRole="Backend Developer" />)

    expect(screen.getByText('Curated Tips for Backend Developer')).toBeInTheDocument()
    expect(screen.getByText('Tip 1 for backend')).toBeInTheDocument()
    expect(screen.queryByText('Tip 1 for frontend')).not.toBeInTheDocument()
  })

  it('verifies data loading and graceful handling of empty tip arrays', () => {
    // If a track is defined but has an empty array, it should show fallback
    vi.mocked(careerResumeTips)['Empty Track'] = []

    render(<CuratedTips targetRole="Empty Track" />)

    expect(
      screen.getByText('No additional curated resume tips are available for this career track.')
    ).toBeInTheDocument()
  })
})
