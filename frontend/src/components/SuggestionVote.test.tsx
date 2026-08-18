// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SuggestionVote } from './SuggestionVote'

const SUGGESTION = 'Add projects or experience with React'

describe('SuggestionVote (#556)', () => {
  it('renders both controls in a labelled group', () => {
    render(<SuggestionVote suggestion={SUGGESTION} onVote={() => {}} />)

    expect(screen.getByRole('group', { name: /was this suggestion helpful/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mark as helpful/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mark as not helpful/i })).toBeInTheDocument()
  })

  it('reports an up vote', () => {
    const onVote = vi.fn()
    render(<SuggestionVote suggestion={SUGGESTION} onVote={onVote} />)

    fireEvent.click(screen.getByRole('button', { name: /mark as helpful/i }))
    expect(onVote).toHaveBeenCalledWith('up')
  })

  it('reports a down vote', () => {
    const onVote = vi.fn()
    render(<SuggestionVote suggestion={SUGGESTION} onVote={onVote} />)

    fireEvent.click(screen.getByRole('button', { name: /mark as not helpful/i }))
    expect(onVote).toHaveBeenCalledWith('down')
  })

  it('withdraws the vote when the active control is clicked again', () => {
    const onVote = vi.fn()
    render(<SuggestionVote suggestion={SUGGESTION} vote="up" onVote={onVote} />)

    fireEvent.click(screen.getByRole('button', { name: /mark as helpful/i }))
    expect(onVote).toHaveBeenCalledWith(null)
  })

  it('switches directly from one vote to the other', () => {
    const onVote = vi.fn()
    render(<SuggestionVote suggestion={SUGGESTION} vote="up" onVote={onVote} />)

    fireEvent.click(screen.getByRole('button', { name: /mark as not helpful/i }))
    expect(onVote).toHaveBeenCalledWith('down')
  })

  it('exposes the current vote with aria-pressed', () => {
    render(<SuggestionVote suggestion={SUGGESTION} vote="down" onVote={() => {}} />)

    expect(screen.getByRole('button', { name: /mark as helpful/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    expect(screen.getByRole('button', { name: /mark as not helpful/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('does not fire while disabled', () => {
    const onVote = vi.fn()
    render(<SuggestionVote suggestion={SUGGESTION} onVote={onVote} disabled />)

    fireEvent.click(screen.getByRole('button', { name: /mark as helpful/i }))
    expect(onVote).not.toHaveBeenCalled()
  })

  it('truncates a long suggestion in its accessible name', () => {
    const long = 'Add projects or experience with '.repeat(5)
    render(<SuggestionVote suggestion={long} onVote={() => {}} />)

    const group = screen.getByRole('group')
    expect(group.getAttribute('aria-label')).toContain('…')
  })
})
