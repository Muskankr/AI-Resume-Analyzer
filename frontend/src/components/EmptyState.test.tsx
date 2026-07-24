// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import EmptyState from './EmptyState'

describe('EmptyState component (#275)', () => {
  it('renders heading, description, and icon with correct CSS classes and structure', () => {
    const { container } = render(<EmptyState />)

    const heading = screen.getByRole('heading', { level: 3, name: /no resume uploaded yet/i })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveClass('empty-state-title')

    const description = screen.getByText(/upload a resume to see your ats score/i)
    expect(description).toBeInTheDocument()
    expect(description).toHaveClass('empty-state-description')

    const mainContainer = container.querySelector('.empty-state-container')
    expect(mainContainer).toBeInTheDocument()

    const iconWrapper = container.querySelector('.empty-state-icon-wrapper')
    expect(iconWrapper).toBeInTheDocument()
    expect(iconWrapper).toHaveAttribute('aria-hidden', 'true')
  })
})
