import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

describe('Job Description Draft Auto-Save (#533)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('restores draft from localStorage on initial render', () => {
    localStorage.setItem('jd_draft', 'Senior React Developer with TypeScript experience')

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    const textarea = screen.getByPlaceholderText(/Paste job description text here/i) as HTMLTextAreaElement
    expect(textarea.value).toBe('Senior React Developer with TypeScript experience')
  })

  it('auto-saves draft to localStorage on debounced input', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    const textarea = screen.getByPlaceholderText(/Paste job description text here/i)

    fireEvent.change(textarea, {
      target: { value: 'Python Django Backend Engineer with PostgreSQL' },
    })

    // Before debounce timer fires
    expect(localStorage.getItem('jd_draft')).toBeNull()

    // Fast-forward timers for debounce
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(localStorage.getItem('jd_draft')).toBe('Python Django Backend Engineer with PostgreSQL')
    expect(screen.getByText(/💾 Draft auto-saved/i)).toBeInTheDocument()
  })

  it('clears draft from localStorage when user clicks clear draft', async () => {
    localStorage.setItem('jd_draft', 'Existing draft text')

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    const clearBtn = screen.getByRole('button', { name: /Clear Draft/i })
    fireEvent.click(clearBtn)

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(localStorage.getItem('jd_draft')).toBeNull()
    const textarea = screen.getByPlaceholderText(/Paste job description text here/i) as HTMLTextAreaElement
    expect(textarea.value).toBe('')
  })

  it('shows a quality warning when the job description is less than 50 words', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    const textarea = screen.getByPlaceholderText(/Paste job description text here/i)

    // Type a short JD (5 words)
    fireEvent.change(textarea, {
      target: { value: 'This is a short description' },
    })

    expect(screen.getByText(/Friendly tip: Very short job descriptions/i)).toBeInTheDocument()

    // Type a longer JD (52 words)
    const longText = 'word '.repeat(52)
    fireEvent.change(textarea, {
      target: { value: longText },
    })

    expect(screen.queryByText(/Friendly tip: Very short job descriptions/i)).not.toBeInTheDocument()
  })

  it('renders character counter and updates live', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    expect(screen.getByText('0 / 20,000 characters')).toBeInTheDocument()

    const textarea = screen.getByPlaceholderText(/Paste job description text here/i)
    fireEvent.change(textarea, {
      target: { value: 'A'.repeat(150) },
    })

    expect(screen.getByText('150 / 20,000 characters')).toBeInTheDocument()
  })
})
