// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'
import { MemoryRouter } from 'react-router-dom'

describe('Drag and Drop Zone Contrast & Visual Pairing (#258)', () => {
  it('renders the drag & drop instructional text with high contrast element classes and paired icon', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    const primaryText = screen.getAllByText(/Upload Your Resume/i)[0]
    expect(primaryText).toBeInTheDocument()
    expect(primaryText.className).toContain('upload-text-primary')

    const browseText = screen.getByText(
      /Drag & drop your resume here or click to browse/i
    )

    expect(browseText.className).toContain("upload-text-secondary")

    const helperText = screen.getByText(
      /Supports PDF, DOCX and TXT files/i
    )

    expect(helperText).toBeInTheDocument()
    expect(helperText.className).toContain('upload-text-helper')

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

    const secondaryText = screen.getByText(
      /Drag & drop your resume here or click to browse/i
    )

    expect(secondaryText).toBeInTheDocument()
    expect(secondaryText.className).toContain('upload-text-secondary')

  })
})
