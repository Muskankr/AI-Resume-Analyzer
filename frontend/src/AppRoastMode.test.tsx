// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import axios from 'axios'
import App from './App'

// The auto-mock leaves axios.create() returning undefined, and the shared API
// client (src/api/client.ts) calls it at import time to build the instance it
// attaches interceptors to. Supply a usable instance so importing App works.
// Everything is defined inside the factory because vi.mock is hoisted above
// module-level declarations.
vi.mock('axios', () => {
  // The instance returned by `axios.create()` shares the *same* mock functions
  // as the module itself. src/api/client.ts builds the shared `api` instance
  // that way, so a component calling `api.post(...)` and a test configuring
  // `vi.mocked(axios.post)` have to land on one object — otherwise the test
  // sets up one and the component calls the other, and the request quietly
  // resolves to the instance's default instead of the configured value.
  //
  // Keeping them shared also means this mock does not care which of the two
  // App uses, which matters while calls are being migrated onto the client.
  const verbs = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
  }

  const instance = {
    ...verbs,
    defaults: { headers: { common: {} } },
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }

  const mockAxios = {
    ...verbs,
    isAxiosError: vi.fn(),
    create: vi.fn(() => instance),
  }

  return {
    default: mockAxios,
    ...mockAxios,
    AxiosHeaders: { from: (headers: unknown) => headers },
  }
})

const ANALYSIS_RESULT = {
  score: 85,
  skills_found: ['React', 'TypeScript'],
  suggestions: [
    'Add projects or experience with Python',
    'Quantify bullet: Increased revenue',
    'General suggestion test',
  ],
  matched_skills: ['React'],
  missing_skills: ['Python'],
  resume_text: 'Sample Resume Content',
}

describe('Resume Roast Mode (#497)', () => {
  beforeEach(() => {
    // "Try Sample Resume" does `fetch('/sample-resume.pdf')`. Under jsdom there
    // is no origin to resolve a root-relative path against, so the real fetch
    // throws "Failed to parse URL" and the click never reaches the analysis
    // path at all. Serve the fixture from a stub instead.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], {
          type: 'application/pdf',
        }),
      })
    )
    // App reports failures with window.alert, which jsdom does not implement.
    // Stubbing it keeps a genuine failure readable rather than drowning it in
    // "Not implemented" noise.
    vi.stubGlobal('alert', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('toggles roast mode on and off for suggestions', async () => {
    // Analysis runs as a Celery task: POST /api/upload/ returns a task id and
    // the app polls GET /api/status/<id>/ until the state is terminal. This
    // test used to have POST resolve with the finished analysis directly,
    // which stopped being true when the task queue landed — the polling loop
    // then never saw a terminal state and spun until vitest timed it out.
    vi.mocked(axios.post).mockResolvedValue({ data: { task_id: 'task-123' } })
    vi.mocked(axios.get).mockResolvedValue({
      data: { state: 'SUCCESS', result: ANALYSIS_RESULT },
    })
    vi.mocked(axios.isAxiosError).mockReturnValue(false)

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    // Click sample resume button to load initial suggestions
    const sampleBtn = screen.getByText('Try Sample Resume')
    fireEvent.click(sampleBtn)

    // Wait for analysis result to appear
    const doneHeader = await screen.findByText('✅ Resume Analysis Complete', {}, { timeout: 5000 })
    expect(doneHeader).toBeInTheDocument()

    // Check default mode is OFF and heading says "💡 Suggestions"
    expect(screen.getByText('💡 Suggestions')).toBeInTheDocument()

    // Find the roast mode toggle checkbox
    const roastToggle = screen.getByRole('checkbox', { name: /Toggle Resume Roast mode/i })
    expect(roastToggle).not.toBeChecked()

    // Turn roast mode ON
    fireEvent.click(roastToggle)
    expect(roastToggle).toBeChecked()
    expect(screen.getByText('🔥 Resume Roast')).toBeInTheDocument()
    expect(screen.getByText(/🔥 Roast Mode ON/i)).toBeInTheDocument()

    // Turn roast mode OFF again
    fireEvent.click(roastToggle)
    expect(roastToggle).not.toBeChecked()
    expect(screen.getByText('💡 Suggestions')).toBeInTheDocument()
    expect(screen.getByText(/🔥 Roast Mode OFF/i)).toBeInTheDocument()
  })
})
