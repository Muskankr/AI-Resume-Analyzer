import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ActionPlanChecklist } from './ActionPlanChecklist'

vi.mock('jspdf', () => {
  const MockJsPDF = vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setTextColor: vi.fn(),
    setFillColor: vi.fn(),
    setLineWidth: vi.fn(),
    setDrawColor: vi.fn(),
    rect: vi.fn(),
    text: vi.fn(),
    splitTextToSize: vi.fn((str: string) => [str]),
    getTextWidth: vi.fn(() => 20),
    addPage: vi.fn(),
    save: vi.fn(),
  }))
  return { jsPDF: MockJsPDF }
})

describe('ActionPlanChecklist Component', () => {
  const defaultProps = {
    score: 50,
    targetRole: 'Backend Developer',
    missingSkills: ['python', 'django', 'docker'],
    suggestions: ['Add quantifiable bullet metrics'],
    readabilityLabel: 'dense',
    readabilityScore: 30,
  }

  it('renders heading, target role, and ranked action items', () => {
    render(<ActionPlanChecklist {...defaultProps} />)

    expect(screen.getByText('Prioritized Action Plan Checklist')).toBeInTheDocument()
    expect(screen.getAllByText(/Backend Developer/i)[0]).toBeInTheDocument()
    expect(screen.getByText(/Top Priority Rule: Focus on the top 3 items first!/i)).toBeInTheDocument()
  })

  it('allows user to check off completed checklist items', () => {
    render(<ActionPlanChecklist {...defaultProps} />)

    const initialProgress = screen.getByText(/Progress:/i)
    expect(initialProgress).toHaveTextContent('0 /')

    const firstItem = screen.getByText(/Add projects or technical experience demonstrating Python/i)
    fireEvent.click(firstItem)

    const updatedProgress = screen.getByText(/Progress:/i)
    expect(updatedProgress).toHaveTextContent('1 /')
  })

  it('renders Export Markdown and Export PDF buttons', () => {
    render(<ActionPlanChecklist {...defaultProps} />)

    expect(screen.getByText(/Export Markdown \(\.md\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Export PDF \(\.pdf\)/i)).toBeInTheDocument()
  })
})
