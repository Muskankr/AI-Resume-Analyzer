// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import PrivacyPolicyPage from './PrivacyPolicyPage'

describe('PrivacyPolicyPage Component', () => {
  it('renders the Privacy Policy heading and commitment summary', () => {
    render(
      <BrowserRouter>
        <PrivacyPolicyPage />
      </BrowserRouter>
    )

    expect(screen.getByRole('heading', { level: 1, name: /Privacy Policy/i })).toBeInTheDocument()
    expect(screen.getByText(/Privacy Commitment Summary:/i)).toBeInTheDocument()
  })

  it('explicitly details resume file handling and immediate deletion', () => {
    render(
      <BrowserRouter>
        <PrivacyPolicyPage />
      </BrowserRouter>
    )

    expect(
      screen.getByRole('heading', { level: 2, name: /Resume File Handling & Retention/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/permanently deleted from disk/i)).toBeInTheDocument()
    expect(screen.getByText(/No Raw File Storage:/i)).toBeInTheDocument()
  })

  it('details user data control and deletion rights', () => {
    render(
      <BrowserRouter>
        <PrivacyPolicyPage />
      </BrowserRouter>
    )

    expect(
      screen.getByRole('heading', { level: 2, name: /Your Data Control & Deletion Rights/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/Delete Individual Analysis Entries:/i)).toBeInTheDocument()
    expect(screen.getByText(/Clear Entire History:/i)).toBeInTheDocument()
  })

  it('includes a back navigation link to the main workspace', () => {
    render(
      <BrowserRouter>
        <PrivacyPolicyPage />
      </BrowserRouter>
    )

    const backLink = screen.getByRole('link', { name: /Back to Resume Analyzer/i })
    expect(backLink).toBeInTheDocument()
    expect(backLink).toHaveAttribute('href', '/')
  })
})
