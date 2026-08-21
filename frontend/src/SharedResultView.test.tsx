// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import axios from 'axios'

import { SharedResultView } from './SharedResultView'

vi.mock('axios', () => {
  const instance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  }
  const mockAxios = {
    get: vi.fn(),
    post: vi.fn(),
    isAxiosError: vi.fn(),
    create: vi.fn(() => instance),
  }
  return { default: mockAxios, ...mockAxios, AxiosHeaders: { from: (h: unknown) => h } }
})

const SHARE_ID = '2b0c9a1e-5f3d-4a7b-9c2e-8d1f0a6b4c33'

// The shape `PublicSharedAnalysisSerializer` returns. `file_name` is absent
// on purpose — see the payload assertions below.
const SHARED_RESULT = {
  share_id: SHARE_ID,
  score: 72,
  target_role: 'Backend Developer',
  experience_level: 'Senior',
  skills_found: ['python', 'django'],
  matched_skills: ['python'],
  partial_skills: [],
  missing_skills: ['docker'],
  suggestions: ['Add projects or experience with Docker'],
  created_at: '2026-08-01T10:00:00Z',
  expires_at: '2026-09-01T10:00:00Z',
}

function renderAt(shareId = SHARE_ID) {
  return render(
    <MemoryRouter initialEntries={[`/shared/${shareId}`]}>
      <Routes>
        <Route path="/shared/:shareId" element={<SharedResultView />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('SharedResultView (#632)', () => {
  afterEach(() => {
    vi.mocked(axios.get).mockReset()
  })

  it('requests the share endpoint the backend actually serves', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: SHARED_RESULT })

    renderAt()

    await waitFor(() => expect(axios.get).toHaveBeenCalled())

    const requested = vi.mocked(axios.get).mock.calls[0][0] as string

    // The route is `path("shared/<uuid:share_id>/")` inside `analyzer.urls`,
    // which is included under `api/` — not `api/analyzer/`. This asked for
    // `/api/analyzer/shared/<id>/`, so it 404'd every time.
    expect(requested).toContain(`/api/shared/${SHARE_ID}/`)
    expect(requested).not.toContain('/api/analyzer/')
  })

  it('renders the shared analysis once it loads', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: SHARED_RESULT })

    renderAt()

    expect(await screen.findByText(/Backend Developer/)).toBeInTheDocument()
    expect(screen.getByText('python')).toBeInTheDocument()
  })

  it('labels the score with the role and level rather than the filename (#705)', async () => {
    // `Firstname_Lastname_Resume.pdf` identifies the owner, so the public
    // payload no longer carries a filename and this view no longer asks for one.
    vi.mocked(axios.get).mockResolvedValue({ data: SHARED_RESULT })

    renderAt()

    expect(await screen.findByText(/Backend Developer • Senior/)).toBeInTheDocument()
    expect(screen.queryByText(/\.pdf/)).not.toBeInTheDocument()
  })

  it('tells the viewer the link expires (#705)', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: SHARED_RESULT })

    renderAt()

    expect(await screen.findByText(/This link expires in/)).toBeInTheDocument()
  })

  it('shows the not-found state when the share does not exist', async () => {
    vi.mocked(axios.get).mockRejectedValue({
      response: { data: { detail: 'Not found.' } },
    })

    renderAt()

    expect(await screen.findByText('Result Not Found')).toBeInTheDocument()
  })

  it('does not claim the link never existed, since revoked and unknown look the same (#705)', async () => {
    // The backend answers 404 for revoked, expired and never-existed alike, so
    // the copy has to be true of all three.
    vi.mocked(axios.get).mockRejectedValue({ response: { data: {} } })

    renderAt()

    expect(await screen.findByText(/may have expired/)).toBeInTheDocument()
  })
})
