// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ContributorCertificate } from './ContributorCertificate'

vi.mock('../services/contributorService', () => ({
  getContributorCertificate: vi.fn(),
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import { getContributorCertificate } from '../services/contributorService'
import { useAuth } from '../hooks/useAuth'

const mockedGetContributorCertificate = vi.mocked(getContributorCertificate)
const mockedUseAuth = vi.mocked(useAuth)

describe('ContributorCertificate', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockedUseAuth.mockReturnValue({
      user: { username: 'testcontributor', token: 'fake-token' } as any,
      signup: vi.fn(),
      login: vi.fn(),
      loginWithOAuth: vi.fn(),
      logout: vi.fn(),
      sessionExpired: false,
      dismissSessionExpired: vi.fn(),
      updateProfileSession: vi.fn(),
      updateUserAvatar: vi.fn(),
      exportUserData: vi.fn(),
    })
  })

  it('renders certificate generator title and search form with default user', () => {
    render(<ContributorCertificate />)

    expect(screen.getByText(/Contributor Certificate Generator/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Enter GitHub username/i)).toHaveValue('testcontributor')
    expect(screen.getByRole('button', { name: /generate certificate/i })).toBeInTheDocument()
  })

  it('fetches and displays certificate details on submit', async () => {
    mockedGetContributorCertificate.mockResolvedValueOnce({
      certificate_id: 'ARA-CONTR-TEST1234',
      contributor: {
        username: 'testcontributor',
        name: 'Test Contributor',
        avatar_url: 'https://github.com/testcontributor.png',
        profile_url: 'https://github.com/testcontributor',
        bio: 'Open Source Builder',
      },
      project: {
        name: 'AI Resume Analyzer',
        repo: 'Muskankr/AI-Resume-Analyzer',
        repo_url: 'https://github.com/Muskankr/AI-Resume-Analyzer',
      },
      statistics: {
        merged_prs_count: 4,
        tier: 'Silver Contributor',
        tier_badge: '🥈',
        tier_title: 'Active Project Contributor',
        first_contribution_date: '2026-08-01',
        latest_contribution_date: '2026-08-31',
      },
      pull_requests: [
        {
          number: 963,
          title: 'Add certificate of contribution generator',
          html_url: 'https://github.com/Muskankr/AI-Resume-Analyzer/pull/963',
          created_at: '2026-08-31T10:00:00Z',
          closed_at: '2026-08-31T12:00:00Z',
        },
      ],
      issued_date: 'August 31, 2026',
      verification_url: 'https://github.com/Muskankr/AI-Resume-Analyzer/pulls?q=is%3Apr+is%3Amerged+author%3Atestcontributor',
    })

    render(<ContributorCertificate />)

    fireEvent.click(screen.getByRole('button', { name: /generate certificate/i }))

    await waitFor(() => {
      expect(screen.getByText('Test Contributor')).toBeInTheDocument()
    })

    expect(screen.getByText('@testcontributor')).toBeInTheDocument()
    expect(screen.getByText(/Silver Contributor/i)).toBeInTheDocument()
    expect(screen.getAllByText('ARA-CONTR-TEST1234').length).toBeGreaterThan(0)
    expect(screen.getByText(/#963: Add certificate of contribution generator/i)).toBeInTheDocument()
  })

  it('displays error message when certificate fetch fails', async () => {
    mockedGetContributorCertificate.mockRejectedValueOnce({
      response: {
        data: {
          error: 'No merged pull requests found for @nonexistent in Muskankr/AI-Resume-Analyzer.',
        },
      },
    })

    render(<ContributorCertificate />)

    fireEvent.change(screen.getByPlaceholderText(/Enter GitHub username/i), {
      target: { value: 'nonexistent' },
    })
    fireEvent.click(screen.getByRole('button', { name: /generate certificate/i }))

    expect(
      await screen.findByText(/No merged pull requests found for @nonexistent/i)
    ).toBeInTheDocument()
  })

  it('copies share text to clipboard when copy button is clicked', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    mockedGetContributorCertificate.mockResolvedValueOnce({
      certificate_id: 'ARA-CONTR-TEST1234',
      contributor: {
        username: 'testuser',
        name: 'Test User',
        avatar_url: 'https://github.com/testuser.png',
        profile_url: 'https://github.com/testuser',
        bio: '',
      },
      project: {
        name: 'AI Resume Analyzer',
        repo: 'Muskankr/AI-Resume-Analyzer',
        repo_url: 'https://github.com/Muskankr/AI-Resume-Analyzer',
      },
      statistics: {
        merged_prs_count: 2,
        tier: 'Silver Contributor',
        tier_badge: '🥈',
        tier_title: 'Active Project Contributor',
        first_contribution_date: '2026-08-01',
        latest_contribution_date: '2026-08-31',
      },
      pull_requests: [],
      issued_date: 'August 31, 2026',
      verification_url: 'https://github.com/...',
    })

    render(<ContributorCertificate />)
    fireEvent.click(screen.getByRole('button', { name: /generate certificate/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy for linkedin/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /copy for linkedin/i }))

    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('ARA-CONTR-TEST1234'))
    expect(await screen.findByText(/Copied!/i)).toBeInTheDocument()
  })
})
