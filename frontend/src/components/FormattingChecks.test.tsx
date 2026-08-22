// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FormattingChecks, type FormattingChecksData } from './FormattingChecks'

describe('FormattingChecks component (#80)', () => {
  const sampleData: FormattingChecksData = {
    score: 85,
    page_count: 1.5,
    word_count: 420,
    has_tables_or_columns: false,
    length_status: 'optimal',
    layout_status: 'optimal',
    found_sections: ['Work Experience', 'Education', 'Skills'],
    missing_sections: ['Summary / Objective', 'Projects'],
    tips: {
      length: ['Good length (420 words, ~1.5 pages).'],
      sections: ['Found all core ATS sections (Experience, Education, Skills).'],
      layout: ['Clean single-column linear hierarchy detected.'],
      typography: ['Clean standard typography and bullet glyphs detected.'],
    },
    all_actionable_tips: [
      'Good length (420 words, ~1.5 pages).',
      'Found all core ATS sections (Experience, Education, Skills).',
      'Clean single-column linear hierarchy detected.',
      'Clean standard typography and bullet glyphs detected.',
    ],
  }

  it('renders structural formatting score and summary tiles', () => {
    render(<FormattingChecks formattingChecks={sampleData} />)

    expect(screen.getByText(/ATS Structural & Formatting Checks/i)).toBeInTheDocument()
    expect(screen.getByText(/Structure Score: 85\/100/i)).toBeInTheDocument()
    expect(screen.getByText(/~1.5 pages \(420 words\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Single column linear/i)).toBeInTheDocument()
    expect(screen.getByText(/3 found, 2 missing/i)).toBeInTheDocument()
  })

  it('renders actionable tips and toggles expand/collapse', () => {
    render(<FormattingChecks formattingChecks={sampleData} />)

    expect(screen.getByText(/Actionable ATS Formatting Guidance/i)).toBeInTheDocument()
    expect(screen.getByText(/Good length \(420 words, ~1.5 pages\)\./i)).toBeInTheDocument()

    // Collapse
    const header = screen.getByText(/ATS Structural & Formatting Checks/i).closest('div')!
    fireEvent.click(header)

    expect(screen.queryByText(/Actionable ATS Formatting Guidance/i)).not.toBeInTheDocument()
  })
})
