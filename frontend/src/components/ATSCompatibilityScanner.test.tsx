// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ATSCompatibilityScanner } from './ATSCompatibilityScanner'

vi.mock('../services/atsCompatibilityApi', () => ({
  fetchAtsCompatibility: vi.fn(),
}))

import { fetchAtsCompatibility, type AtsCompatibilityReport } from '../services/atsCompatibilityApi'

const mockedFetch = vi.mocked(fetchAtsCompatibility)

const REPORT: AtsCompatibilityReport = {
  overall_score: 72,
  grade: 'C',
  rating: 'Needs work',
  estimated_ats_pass_rate: 63,
  word_count: 410,
  summary: { passed: 6, warnings: 2, failed: 2 },
  criteria: [
    {
      id: 'section_headers',
      label: 'Standard section headings',
      earned: 10,
      max: 10,
      status: 'pass',
      why_it_matters: 'Parsers file content by heading.',
      evidence: ['Detected headings: Work Experience, Education, Skills.'],
      fixes: [],
    },
    {
      id: 'contact_info',
      label: 'Contact information',
      earned: 4,
      max: 10,
      status: 'fail',
      why_it_matters: 'Recruiters filter on these fields.',
      evidence: ['No phone number detected.'],
      fixes: [{ text: 'Add a phone number, e.g. (555) 123-4567.', points: 3 }],
    },
  ],
  prioritized_fixes: [
    {
      category: 'Contact information',
      severity: 'high',
      text: 'Add a phone number, e.g. (555) 123-4567.',
      points: 3,
    },
  ],
}

describe('ATSCompatibilityScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the input form before any analysis', () => {
    render(<ATSCompatibilityScanner />)
    expect(screen.getByRole('heading', { name: /ATS Compatibility Checker/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Resume text/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Analyze resume/i })).toBeInTheDocument()
  })

  it('validates that some resume text was provided', async () => {
    const user = userEvent.setup()
    render(<ATSCompatibilityScanner />)
    await user.click(screen.getByRole('button', { name: /Analyze resume/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/at least a few lines/i)
    expect(mockedFetch).not.toHaveBeenCalled()
  })

  it('calls the API and renders the score, grade, pass rate and a fix', async () => {
    mockedFetch.mockResolvedValueOnce(REPORT)
    const user = userEvent.setup()
    render(<ATSCompatibilityScanner />)

    await user.click(screen.getByRole('button', { name: /Load sample/i }))
    await user.click(screen.getByRole('button', { name: /Analyze resume/i }))

    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1))
    expect(mockedFetch.mock.calls[0][0].resume_text).toMatch(/Jordan Lee/)

    expect(await screen.findByText('72/100')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.getByText('63%')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Priority fixes/i })).toBeInTheDocument()
    expect(
      screen.getAllByText(/Add a phone number, e.g. \(555\) 123-4567\./i).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText('Standard section headings')).toBeInTheDocument()
  })

  it('shows an error message when the API call fails', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('network down'))
    const user = userEvent.setup()
    render(<ATSCompatibilityScanner />)

    await user.click(screen.getByRole('button', { name: /Load sample/i }))
    await user.click(screen.getByRole('button', { name: /Analyze resume/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not reach the ATS compatibility service/i)
  })
})
