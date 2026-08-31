// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ShareResult } from './ShareResult'

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from '../api/client'

const mockedApi = vi.mocked(api, true)

const shareState = {
  share_id: 'abc',
  share_enabled: false,
  share_created_at: null,
  share_expires_at: null,
  share_view_count: 0,
  is_live: false,
  share_url: null,
}

const badgeState = (overrides = {}) => ({
  badge_id: '11111111-1111-1111-1111-111111111111',
  enabled: true,
  badge_url: 'https://example.test/api/badge/11111111-1111-1111-1111-111111111111/svg/',
  markdown:
    '![ATS Score](https://example.test/api/badge/11111111-1111-1111-1111-111111111111/svg/)',
  updated_at: '2026-08-26T10:00:00Z',
  ...overrides,
})

const renderWithBadge = async (badge = badgeState()) => {
  mockedApi.get.mockImplementation((url: string) =>
    url === '/api/badge/'
      ? Promise.resolve({ data: badge })
      : Promise.resolve({ data: shareState })
  )
  render(<ShareResult analysisId={7} />)
  await screen.findByText('Latest ATS Score Badge')
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ShareResult badge controls (#865)', () => {
  it('says the badge is public and offers a way to stop', async () => {
    await renderWithBadge()

    expect(screen.getByRole('status')).toHaveTextContent('Public')
    expect(screen.getByAltText('Latest ATS score badge')).toHaveAttribute(
      'src',
      badgeState().badge_url
    )
    expect(screen.getByRole('button', { name: /stop publishing/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new badge url/i })).toBeInTheDocument()
  })

  it('unpublishes with DELETE and adopts the response', async () => {
    const user = userEvent.setup()
    await renderWithBadge()

    mockedApi.delete.mockResolvedValue({ data: badgeState({ enabled: false }) })

    await user.click(screen.getByRole('button', { name: /stop publishing/i }))

    await waitFor(() => expect(mockedApi.delete).toHaveBeenCalledWith('/api/badge/'))
    expect(screen.getByRole('status')).toHaveTextContent('Not published')
    // The preview and the copy fields go with it -- they would be a broken
    // image and two URLs that 404.
    expect(screen.queryByAltText('Latest ATS score badge')).toBeNull()
    expect(screen.queryByLabelText('ATS score badge URL')).toBeNull()
  })

  it('offers to publish again once it is off, and the URL is the same one', async () => {
    const user = userEvent.setup()
    await renderWithBadge(badgeState({ enabled: false }))

    expect(screen.getByRole('status')).toHaveTextContent('Not published')

    mockedApi.post.mockResolvedValue({ data: badgeState({ enabled: true }) })

    await user.click(screen.getByRole('button', { name: /publish badge/i }))

    await waitFor(() =>
      expect(mockedApi.post).toHaveBeenCalledWith('/api/badge/', { enabled: true })
    )
    expect(screen.getByAltText('Latest ATS score badge')).toHaveAttribute(
      'src',
      badgeState().badge_url
    )
  })

  it('rotates to whatever URL the server returns rather than guessing', async () => {
    const user = userEvent.setup()
    await renderWithBadge()

    const rotated = badgeState({
      badge_id: '22222222-2222-2222-2222-222222222222',
      badge_url: 'https://example.test/api/badge/22222222-2222-2222-2222-222222222222/svg/',
      markdown:
        '![ATS Score](https://example.test/api/badge/22222222-2222-2222-2222-222222222222/svg/)',
    })
    mockedApi.post.mockResolvedValue({ data: rotated })

    await user.click(screen.getByRole('button', { name: /new badge url/i }))

    await waitFor(() =>
      expect(mockedApi.post).toHaveBeenCalledWith('/api/badge/', { rotate: true })
    )
    expect(screen.getByLabelText('ATS score badge URL')).toHaveValue(rotated.badge_url)
    expect(screen.getByLabelText('ATS score badge Markdown')).toHaveValue(rotated.markdown)
  })

  it('leaves the badge alone and says so when the request fails', async () => {
    const user = userEvent.setup()
    await renderWithBadge()

    mockedApi.delete.mockRejectedValue(new Error('offline'))

    await user.click(screen.getByRole('button', { name: /stop publishing/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach the server. The badge was not changed.'
    )
    expect(screen.getByRole('status')).toHaveTextContent('Public')
  })

  it('renders nothing for the badge when the endpoint is unavailable', async () => {
    mockedApi.get.mockImplementation((url: string) =>
      url === '/api/badge/'
        ? Promise.reject(new Error('no badge'))
        : Promise.resolve({ data: shareState })
    )

    render(<ShareResult analysisId={7} />)

    await screen.findByText('Share this analysis')
    expect(screen.queryByText('Latest ATS Score Badge')).toBeNull()
  })
})
