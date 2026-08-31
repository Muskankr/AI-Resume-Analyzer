import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { HeroBanner } from './HeroBanner'
import { AnalysisDashboardView } from './AnalysisDashboardView'
import { AppFooterSection } from './AppFooterSection'

describe('Extracted App Components Suite (#187)', () => {
  describe('AppHeader Component', () => {
    const defaultProps = {
      theme: 'dark' as const,
      onToggleTheme: vi.fn(),
      user: null,
      onOpenAuthModal: vi.fn(),
      onOpenProfile: vi.fn(),
      onOpenHistory: vi.fn(),
      onOpenCompare: vi.fn(),
      onOpenBulkModal: vi.fn(),
    }

    it('renders logo, brand title, and login button when user is unauthenticated', () => {
      render(
        <MemoryRouter>
          <AppHeader {...defaultProps} />
        </MemoryRouter>
      )

      expect(screen.getByTestId('app-header')).toBeInTheDocument()
      expect(screen.getByText('AI Resume Analyzer')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Log In/i })).toBeInTheDocument()
    })

    it('displays user profile badge when logged in and triggers profile callback', () => {
      const loggedInProps = {
        ...defaultProps,
        user: { username: 'alex_developer', email: 'alex@example.com' },
      }
      render(
        <MemoryRouter>
          <AppHeader {...loggedInProps} />
        </MemoryRouter>
      )

      const profileBtn = screen.getByRole('button', { name: /alex_developer/i })
      expect(profileBtn).toBeInTheDocument()
      fireEvent.click(profileBtn)
      expect(defaultProps.onOpenProfile).toHaveBeenCalled()
    })

    it('triggers theme toggle when theme button is clicked', () => {
      render(
        <MemoryRouter>
          <AppHeader {...defaultProps} />
        </MemoryRouter>
      )
      const themeBtn = screen.getByLabelText(/Switch theme/i)
      fireEvent.click(themeBtn)
      expect(defaultProps.onToggleTheme).toHaveBeenCalled()
    })
  })

  describe('HeroBanner Component', () => {
    it('renders hero titles and value proposition highlights', () => {
      render(<HeroBanner />)
      expect(
        screen.getByRole('heading', { name: /AI-Powered Resume Analysis & ATS Optimization/i })
      ).toBeInTheDocument()
      expect(screen.getByText('No Credit Card Required')).toBeInTheDocument()
      expect(screen.getByText('PDF, DOCX, TXT Supported')).toBeInTheDocument()
    })
  })

  describe('AnalysisDashboardView Component', () => {
    it('renders ATS score, matched & missing skills, and actionable suggestions', () => {
      render(
        <AnalysisDashboardView
          score={85}
          matchedSkills={['React', 'TypeScript']}
          missingSkills={['GraphQL']}
          suggestions={['Include measurable impact metrics in project bullet points.']}
        />
      )

      expect(screen.getByTestId('analysis-dashboard-view')).toBeInTheDocument()
      expect(screen.getByText('Matched Skills (2)')).toBeInTheDocument()
      expect(screen.getByText('React')).toBeInTheDocument()
      expect(screen.getByText('Missing Skills (1)')).toBeInTheDocument()
      expect(screen.getByText('GraphQL')).toBeInTheDocument()
      expect(screen.getByText(/Include measurable impact metrics/i)).toBeInTheDocument()
    })
  })

  describe('AppFooterSection Component', () => {
    it('renders footer container', () => {
      render(
        <MemoryRouter>
          <AppFooterSection />
        </MemoryRouter>
      )
      expect(document.querySelector('.app-footer-wrapper')).toBeInTheDocument()
    })
  })
})
