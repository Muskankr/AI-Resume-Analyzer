// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from './App'
import { MemoryRouter } from 'react-router-dom'

describe('Drag and Drop Zone Contrast & Visual Pairing (#258)', () => {
  it('renders the drag & drop instructional text with high contrast element classes and paired icon', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    const primaryText = screen.getByText(/Drag & Drop Resume or/i)
    expect(primaryText).toBeInTheDocument()
    expect(primaryText.className).toContain('upload-text-primary')

    const browseText = screen.getByText('Click to Browse')
    expect(browseText).toBeInTheDocument()
    expect(browseText.className).toContain('upload-text-browse')

    const secondaryText = screen.getByText('Supports PDF, DOCX, TXT up to 10MB')
    expect(secondaryText).toBeInTheDocument()
    expect(secondaryText.className).toContain('upload-text-secondary')

    // Icon wrapper aria-hidden and container present
    const iconWrapper = primaryText.closest('label')?.querySelector('.upload-icon-wrapper')
    expect(iconWrapper).toBeInTheDocument()
    expect(iconWrapper).toHaveAttribute('aria-hidden', 'true')
  })

  it('updates container style on drag over and drag leave', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    const uploadBox = screen.getByText(/Drag & Drop Resume or/i).closest('.upload-box')!
    expect(uploadBox).not.toHaveClass('dragging')

    fireEvent.dragOver(uploadBox)
    expect(uploadBox).toHaveClass('dragging')

    fireEvent.dragLeave(uploadBox)
    expect(uploadBox).not.toHaveClass('dragging')
  })
})
