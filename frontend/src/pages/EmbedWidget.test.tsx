import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import EmbedWidget from './EmbedWidget'

describe('EmbedWidget Component', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders with default parameters', () => {
    render(
      <MemoryRouter initialEntries={['/embed']}>
        <EmbedWidget />
      </MemoryRouter>
    )

    // Check default brand name in heading
    expect(screen.getByRole('heading', { name: 'AI Resume Analyzer' })).toBeInTheDocument()

    // Check target career track and experience level selects
    expect(screen.getByLabelText(/Target Career Track:/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Experience Level:/i)).toBeInTheDocument()

    // Check drag & drop instructions
    expect(screen.getByText(/Drag & Drop Resume/i)).toBeInTheDocument()
  })

  it('honors brandName, hideTargetRole, and hideJd query parameters', () => {
    render(
      <MemoryRouter
        initialEntries={['/embed?brandName=Custom+Bootcamp&hideTargetRole=true&hideJd=true']}
      >
        <EmbedWidget />
      </MemoryRouter>
    )

    // Check custom brand name in heading
    expect(screen.getByRole('heading', { name: 'Custom Bootcamp' })).toBeInTheDocument()

    // Check selectors are hidden
    expect(screen.queryByLabelText(/Target Career Track:/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Experience Level:/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Job Description/i)).not.toBeInTheDocument()
  })
})
