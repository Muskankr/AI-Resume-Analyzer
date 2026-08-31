import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { SecurityCheckInput } from './SecurityCheckInput'

describe('SecurityCheckInput Component', () => {
  it('renders full "Answer security question" placeholder without clipping', () => {
    const handleChange = vi.fn()
    render(
      <SecurityCheckInput
        questionText="What is 7 + 4?"
        value=""
        onChange={handleChange}
        placeholder="Answer security question"
      />
    )

    const inputEl = screen.getByPlaceholderText('Answer security question') as HTMLInputElement
    expect(inputEl).toBeDefined()
    expect(inputEl.placeholder).toBe('Answer security question')
    expect(inputEl.placeholder).not.toBe('Answ')
  })

  it('updates input value on user typing', () => {
    const handleChange = vi.fn()
    render(
      <SecurityCheckInput
        questionText="What is 10 + 5?"
        value=""
        onChange={handleChange}
      />
    )

    const inputEl = screen.getByPlaceholderText('Answer security question')
    fireEvent.change(inputEl, { target: { value: '15' } })

    expect(handleChange).toHaveBeenCalledWith('15')
  })

  it('displays error text when validation fails', () => {
    render(
      <SecurityCheckInput
        questionText="What is 2 + 2?"
        value="9"
        onChange={() => {}}
        error="Incorrect security check answer."
      />
    )

    expect(screen.getByRole('alert')).toBeDefined()
    expect(screen.getByText('Incorrect security check answer.')).toBeDefined()
  })

  it('triggers onRefreshQuestion callback when refresh button is clicked', () => {
    const handleRefresh = vi.fn()
    render(
      <SecurityCheckInput
        questionText="What is 3 + 3?"
        value=""
        onChange={() => {}}
        onRefreshQuestion={handleRefresh}
      />
    )

    const refreshBtn = screen.getByRole('button', { name: /Refresh Challenge/i })
    fireEvent.click(refreshBtn)
    expect(handleRefresh).toHaveBeenCalledTimes(1)
  })
})
