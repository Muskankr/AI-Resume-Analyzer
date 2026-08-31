// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import App from './App'
import { MemoryRouter } from 'react-router-dom'
describe('Experience Level Selector (#538)', () => {
  vi.mock('./theme/ThemeContext', () => ({
    useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
  }))
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('renders Experience Level selector with Junior, Mid-Level, and Senior options', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    const label = screen.getByLabelText(/Experience Level:/i)
    expect(label).toBeInTheDocument()

    const select = screen.getByRole('combobox', { name: /Experience Level:/i }) as HTMLSelectElement
    expect(select).toBeInTheDocument()
    expect(select.value).toBe('Mid-Level')

    const options = Array.from(select.options).map((opt) => opt.value)
    expect(options).toEqual(['Junior', 'Mid-Level', 'Senior', 'Lead'])
  })

  it('persists selected experience level to localStorage on change', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    const select = screen.getByRole('combobox', { name: /Experience Level:/i }) as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'Senior' } })

    expect(select.value).toBe('Senior')
    expect(localStorage.getItem('selected_experience_level')).toBe('Senior')
  })

  it('loads previously saved experience level from localStorage on initial render', () => {
    localStorage.setItem('selected_experience_level', 'Junior')

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    const select = screen.getByRole('combobox', { name: /Experience Level:/i }) as HTMLSelectElement
    expect(select.value).toBe('Junior')
  })
})
