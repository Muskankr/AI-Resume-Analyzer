import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

const renderApp = () =>
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )

describe('Recent Career Track Chips (#356)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('hides recent chips for first-time users with no history', () => {
    renderApp()
    expect(screen.queryByText('Recent:')).not.toBeInTheDocument()
  })

  it('displays quick-switch chips when history exists in localStorage', () => {
    localStorage.setItem('recent_career_tracks', JSON.stringify(['Backend Developer', 'Data Analyst']))
    renderApp()

    expect(screen.getByText('Recent:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Backend Developer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Data Analyst' })).toBeInTheDocument()
  })

  it('immediately switches career track when a chip is clicked', () => {
    localStorage.setItem('recent_career_tracks', JSON.stringify(['Backend Developer']))
    renderApp()

    const chipBtn = screen.getByRole('button', { name: 'Backend Developer' })
    fireEvent.click(chipBtn)

    const select = screen.getByLabelText(/Target Career Track/i) as HTMLSelectElement
    expect(select.value).toBe('Backend Developer')
  })
})
