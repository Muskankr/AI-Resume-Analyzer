// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BulkResumeAnalysisModal } from './BulkResumeAnalysisModal'
import axios from 'axios'

vi.mock('axios')
const mockedAxios = vi.mocked(axios, true)

describe('BulkResumeAnalysisModal (#57)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders bulk resume modal with multi-file input and role selection', () => {
    render(<BulkResumeAnalysisModal onClose={() => {}} />)

    expect(screen.getByRole('heading', { name: /Bulk Resume Analysis/i })).toBeInTheDocument()
    expect(screen.getByText(/Drag & Drop Multiple Resumes/i)).toBeInTheDocument()
    expect(screen.getByText(/Analyze Resumes/i)).toBeInTheDocument()
  })

  it('allows adding files and triggering multi-file upload analysis with summary table', async () => {
    const mockApiResponse = {
      data: {
        target_role: 'Frontend Developer',
        experience_level: 'Mid-Level',
        total_resumes: 2,
        resumes: [
          {
            index: 0,
            file_name: 'candidate_alice.pdf',
            score: 88,
            matched_skills: ['react', 'typescript', 'css'],
            missing_skills: ['webpack'],
            skills_found: ['react', 'typescript', 'css', 'html'],
            suggestions: ['Add projects with Webpack'],
            target_role: 'Frontend Developer',
            experience_level: 'Mid-Level',
          },
          {
            index: 1,
            file_name: 'candidate_bob.docx',
            score: 55,
            matched_skills: ['html', 'css'],
            missing_skills: ['react', 'typescript'],
            skills_found: ['html', 'css'],
            suggestions: ['Add projects with React'],
            target_role: 'Frontend Developer',
            experience_level: 'Mid-Level',
          },
        ],
      },
    }

    mockedAxios.post.mockResolvedValueOnce(mockApiResponse)

    render(<BulkResumeAnalysisModal onClose={() => {}} />)

    // Simulate file input
    const file1 = new File(['dummy resume 1'], 'candidate_alice.pdf', { type: 'application/pdf' })
    const file2 = new File(['dummy resume 2'], 'candidate_bob.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    const input = document.getElementById('bulkFileUpload') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [file1, file2] },
    })

    expect(screen.getByText('candidate_alice.pdf')).toBeInTheDocument()
    expect(screen.getByText('candidate_bob.docx')).toBeInTheDocument()

    const analyzeBtn = screen.getByRole('button', { name: /Analyze 2 Resumes/i })
    expect(analyzeBtn).not.toBeDisabled()

    fireEvent.click(analyzeBtn)

    await waitFor(() => {
      expect(screen.getByText(/Analysis Summary \(2 Resumes Analyzed\)/i)).toBeInTheDocument()
    })

    // Table rows
    expect(screen.getByText('candidate_alice.pdf')).toBeInTheDocument()
    expect(screen.getByText('88%')).toBeInTheDocument()
    expect(screen.getByText('candidate_bob.docx')).toBeInTheDocument()
    expect(screen.getByText('55%')).toBeInTheDocument()

    // Clicking a row displays detailed result
    const detailsButtons = screen.getAllByRole('button', { name: /View Details/i })
    fireEvent.click(detailsButtons[0])

    expect(screen.getByText(/Back to Summary Table/i)).toBeInTheDocument()
    expect(screen.getByText(/Matched Skills \(3\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Missing Skills \(1\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Add projects with Webpack/i)).toBeInTheDocument()

    // Back to summary
    fireEvent.click(screen.getByText(/Back to Summary Table/i))
    expect(screen.getByText(/Analysis Summary \(2 Resumes Analyzed\)/i)).toBeInTheDocument()
  })
})
