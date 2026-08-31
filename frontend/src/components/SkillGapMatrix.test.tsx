// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { SkillGapMatrix } from './SkillGapMatrix'
import type { ClassifiedSkill } from '../utils/jdSkillParser'

describe('SkillGapMatrix Component (#106)', () => {
  const mockSkills: ClassifiedSkill[] = [
    { name: 'React', priority: 'REQUIRED', contextPhrase: 'React is required for UI building' },
    { name: 'Python', priority: 'REQUIRED', contextPhrase: 'Python is a core requirement' },
    { name: 'Docker', priority: 'PREFERRED', contextPhrase: 'Experience with Docker is preferred' },
    { name: 'Git', priority: 'STANDARD', contextPhrase: 'Standard version control tool' },
  ]

  it('renders score overview, critical gap alerts, and skills correctly', () => {
    const candidateSkills = ['React', 'Git']
    render(<SkillGapMatrix extractedSkills={mockSkills} candidateSkills={candidateSkills} />)

    expect(screen.getByText('Skill Gap Priority Matrix')).toBeInTheDocument()
    expect(screen.getByText(/50%/i)).toBeInTheDocument() // 2 of 4 skills verified
    expect(screen.getByText(/Critical Gap Alert:/i)).toBeInTheDocument()
    expect(screen.getByText(/1 required skill is missing/i)).toBeInTheDocument()

    // Skills check
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Python')).toBeInTheDocument()
    expect(screen.getByText('Docker')).toBeInTheDocument()
    expect(screen.getByText('Git')).toBeInTheDocument()
  })

  it('filters skills when priority chips are clicked', () => {
    const candidateSkills = ['React']
    render(<SkillGapMatrix extractedSkills={mockSkills} candidateSkills={candidateSkills} />)

    // Click preferred chip tab
    const preferredTab = screen.getByRole('tab', { name: /preferred/i })
    fireEvent.click(preferredTab)

    expect(screen.getByText('Docker')).toBeInTheDocument()
    expect(screen.queryByText('React')).not.toBeInTheDocument()
    expect(screen.queryByText('Python')).not.toBeInTheDocument()
  })

  it('filters skills via search query input', () => {
    const candidateSkills = ['React', 'Python']
    render(<SkillGapMatrix extractedSkills={mockSkills} candidateSkills={candidateSkills} />)

    const searchInput = screen.getByPlaceholderText(/Search skills or context.../i)
    fireEvent.change(searchInput, { target: { value: 'Docker' } })

    expect(screen.getByText('Docker')).toBeInTheDocument()
    expect(screen.queryByText('React')).not.toBeInTheDocument()
    expect(screen.queryByText('Python')).not.toBeInTheDocument()
  })

  it('switches between Grid and Table view modes', () => {
    const candidateSkills = ['React']
    render(<SkillGapMatrix extractedSkills={mockSkills} candidateSkills={candidateSkills} />)

    const tableViewBtn = screen.getByLabelText('Table View')
    fireEvent.click(tableViewBtn)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('JD Context Excerpt')).toBeInTheDocument()

    const gridViewBtn = screen.getByLabelText('Grid View')
    fireEvent.click(gridViewBtn)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders empty state illustration when no skills match active filters', () => {
    render(<SkillGapMatrix extractedSkills={mockSkills} candidateSkills={['React']} />)

    const searchInput = screen.getByPlaceholderText(/Search skills or context.../i)
    fireEvent.change(searchInput, { target: { value: 'NonExistentSkill123' } })

    expect(screen.getByText(/No skills match your filters/i)).toBeInTheDocument()

    const resetBtn = screen.getByRole('button', { name: /Reset All Filters/i })
    fireEvent.click(resetBtn)

    expect(screen.getByText('React')).toBeInTheDocument()
  })

  it('opens detail modal when a skill card is clicked', () => {
    render(<SkillGapMatrix extractedSkills={mockSkills} candidateSkills={['React']} />)

    const skillCard = screen.getByText('React').closest('.sgm-card')!
    fireEvent.click(skillCard)

    expect(screen.getByRole('heading', { level: 3, name: 'React' })).toBeInTheDocument()
    expect(screen.getByText(/Found in Resume/i)).toBeInTheDocument()

    const closeBtn = screen.getByLabelText('Close detail modal')
    fireEvent.click(closeBtn)
    expect(screen.queryByRole('heading', { level: 3, name: 'React' })).not.toBeInTheDocument()
  })
})
