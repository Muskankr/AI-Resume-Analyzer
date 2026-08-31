// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ShareResult } from './ShareResult'
import { formatExpiry, type ShareState } from '../utils/shareLink'
import { api } from '../api/client'

vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  BACKEND_URL: 'http://127.0.0.1:8000',
}))

const IN_A_MONTH = new Date(Date.now() + 30 * 86_400_000).toISOString()

function state(overrides: Partial<ShareState> = {}): ShareState {
  return {
    share_id: '2b0c9a1e-5f3d-4a7b-9c2e-8d1f0a6b4c33',
    share_enabled: false,
    share_created_at: null,
    share_expires_at: null,
    share_view_count: 0,
    is_live: false,
    share_url: null,
    ...overrides,
  }
}

const LIVE = state({
  share_enabled: true,
  share_created_at: new Date().toISOString(),
  share_expires_at: IN_A_MONTH,
  share_view_count: 4,
  is_live: true,
  share_url: 'https://resume.example.com/shared/2b0c9a1e-5f3d-4a7b-9c2e-8d1f0a6b4c33',
})

describe('ShareResult (#705)', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({ data: state() })
    // jsdom defines `navigator.clipboard` as a getter-only property, so it has
    // to be redefined rather than assigned.
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn() },
      configurable: true,
    })
  })

  afterEach(() => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.post).mockReset()
    vi.mocked(api.delete).mockReset()
  })

  it('renders nothing without a saved analysis', () => {
    const { container } = render(<ShareResult analysisId={null} />)

    expect(container).toBeEmptyDOMElement()
    expect(api.get).not.toHaveBeenCalled()
  })

  it('reads share state from the server rather than assuming it', async () => {
    render(<ShareResult analysisId={12} />)

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/history/12/share/'))
  })

  it('offers to create a link when the analysis is private', async () => {
    render(<ShareResult analysisId={12} />)

    expect(await screen.findByRole('button', { name: /create link/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /copy link/i })).not.toBeInTheDocument()
  })

  it('shows no copyable URL before sharing is turned on', async () => {
    // The old component built a link in the browser and showed it immediately,
    // which is the behaviour this issue is about.
    render(<ShareResult analysisId={12} />)

    await screen.findByRole('button', { name: /create link/i })
    expect(screen.queryByLabelText(/public link/i)).not.toBeInTheDocument()
  })

  it('creates a link with the chosen lifetime', async () => {
    const user = userEvent.setup()
    vi.mocked(api.post).mockResolvedValue({ data: LIVE })
    render(<ShareResult analysisId={12} />)

    await user.selectOptions(await screen.findByLabelText(/link lasts/i), '7')
    await user.click(screen.getByRole('button', { name: /create link/i }))

    expect(api.post).toHaveBeenCalledWith('/api/history/12/share/', { lifetime_days: 7 })
  })

  it('shows the URL the server returned, not one built locally', async () => {
    const user = userEvent.setup()
    vi.mocked(api.post).mockResolvedValue({ data: LIVE })
    render(<ShareResult analysisId={12} />)

    await user.click(await screen.findByRole('button', { name: /create link/i }))

    expect(await screen.findByDisplayValue(LIVE.share_url as string)).toBeInTheDocument()
  })

  it('reports the expiry and the view count', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: LIVE })
    render(<ShareResult analysisId={12} />)

    expect(await screen.findByText(/expires in 30 days/)).toBeInTheDocument()
    expect(screen.getByText(/4 views/)).toBeInTheDocument()
  })

  it('renders a QR code for the live share URL', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: LIVE })
    render(<ShareResult analysisId={12} />)

    expect(await screen.findByRole('img', { name: /qr code for this analysis/i })).toBeInTheDocument()
    expect(screen.getByText(/scan to open this shared analysis/i)).toBeInTheDocument()
  })

  it('revokes through the API and drops back to the private state', async () => {
    const user = userEvent.setup()
    vi.mocked(api.get).mockResolvedValue({ data: LIVE })
    vi.mocked(api.delete).mockResolvedValue({ data: state() })
    render(<ShareResult analysisId={12} />)

    await user.click(await screen.findByRole('button', { name: /stop sharing/i }))

    expect(api.delete).toHaveBeenCalledWith('/api/history/12/share/')
    expect(await screen.findByRole('button', { name: /create link/i })).toBeInTheDocument()
  })

  it('rotates to a fresh id on request', async () => {
    const user = userEvent.setup()
    vi.mocked(api.get).mockResolvedValue({ data: LIVE })
    vi.mocked(api.post).mockResolvedValue({ data: LIVE })
    render(<ShareResult analysisId={12} />)

    await user.click(await screen.findByRole('button', { name: /new link/i }))

    expect(api.post).toHaveBeenCalledWith('/api/history/12/share/', {
      lifetime_days: 30,
      rotate: true,
    })
  })

  it('copies the server-issued URL', async () => {
    const user = userEvent.setup()
    // `userEvent.setup()` installs its own clipboard stub, so the spy has to go
    // in after it rather than in `beforeEach`.
    const writeText = vi.fn()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    vi.mocked(api.get).mockResolvedValue({ data: LIVE })
    render(<ShareResult analysisId={12} />)

    await user.click(await screen.findByRole('button', { name: /copy link/i }))

    expect(writeText).toHaveBeenCalledWith(LIVE.share_url)
  })

  it('says so when the server shortened the requested lifetime', async () => {
    const user = userEvent.setup()
    vi.mocked(api.post).mockResolvedValue({
      data: { ...LIVE, lifetime_clamped_to_days: 365 },
    })
    render(<ShareResult analysisId={12} />)

    await user.click(await screen.findByRole('button', { name: /create link/i }))

    expect(await screen.findByText(/at most 365 days/)).toBeInTheDocument()
  })

  it('reports a failed request instead of showing a state that was never saved', async () => {
    const user = userEvent.setup()
    vi.mocked(api.post).mockRejectedValue(new Error('offline'))
    render(<ShareResult analysisId={12} />)

    await user.click(await screen.findByRole('button', { name: /create link/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/Nothing was changed/)
    expect(screen.getByRole('button', { name: /create link/i })).toBeInTheDocument()
  })

  it('promises the reader that the resume text is not published', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: LIVE })
    render(<ShareResult analysisId={12} />)

    expect(await screen.findByText(/never includes your resume text/i)).toBeInTheDocument()
  })
})

describe('formatExpiry', () => {
  it('counts down in hours under a day', () => {
    expect(formatExpiry(new Date(Date.now() + 5 * 3_600_000).toISOString())).toBe(
      'expires in 5 hours'
    )
  })

  it('singularises one hour', () => {
    expect(formatExpiry(new Date(Date.now() + 3_600_000).toISOString())).toBe('expires in 1 hour')
  })

  it('counts down in days beyond a day', () => {
    expect(formatExpiry(new Date(Date.now() + 3 * 86_400_000).toISOString())).toBe(
      'expires in 3 days'
    )
  })

  it('reports an elapsed date as expired rather than a negative countdown', () => {
    expect(formatExpiry(new Date(Date.now() - 60_000).toISOString())).toBe('expired')
  })

  it('returns an empty string for null and for junk', () => {
    expect(formatExpiry(null)).toBe('')
    expect(formatExpiry('not a date')).toBe('')
  })
})
