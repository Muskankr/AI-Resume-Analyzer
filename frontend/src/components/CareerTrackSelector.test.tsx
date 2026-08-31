// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import CareerTrackSelector from './CareerTrackSelector'
import { CAREER_TRACKS, EXPERIENCE_LEVELS } from '../data/careerTracks'

describe('CareerTrackSelector', () => {
  it('renders one labelled dropdown per field', () => {
    render(
      <CareerTrackSelector
        targetRole="Frontend Developer"
        onTargetRoleChange={() => {}}
        experienceLevel="Mid-Level"
        onExperienceLevelChange={() => {}}
      />
    )

    const role = screen.getByRole('combobox', { name: /target career track/i })
    const level = screen.getByRole('combobox', { name: /experience level/i })

    expect(role).toBeInTheDocument()
    expect(level).toBeInTheDocument()
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
  })

  it('offers every career track and experience level', () => {
    render(
      <CareerTrackSelector
        targetRole="Frontend Developer"
        onTargetRoleChange={() => {}}
        experienceLevel="Mid-Level"
        onExperienceLevelChange={() => {}}
      />
    )

    const role = screen.getByRole('combobox', {
      name: /target career track/i,
    }) as HTMLSelectElement
    const level = screen.getByRole('combobox', {
      name: /experience level/i,
    }) as HTMLSelectElement

    expect(Array.from(role.options).map((o) => o.value)).toEqual([...CAREER_TRACKS])
    expect(Array.from(level.options).map((o) => o.value)).toEqual(
      EXPERIENCE_LEVELS.map((l) => l.value)
    )
    expect(Array.from(level.options).map((o) => o.textContent)).toEqual([
      'Junior (0-2 yrs)',
      'Mid-Level (2-5 yrs)',
      'Senior (5+ yrs)',
    ])
  })

  it('reports the selected value back to the caller', () => {
    const onTargetRoleChange = vi.fn()
    const onExperienceLevelChange = vi.fn()

    render(
      <CareerTrackSelector
        targetRole="Frontend Developer"
        onTargetRoleChange={onTargetRoleChange}
        experienceLevel="Mid-Level"
        onExperienceLevelChange={onExperienceLevelChange}
      />
    )

    fireEvent.change(screen.getByRole('combobox', { name: /target career track/i }), {
      target: { value: 'Data Analyst' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: /experience level/i }), {
      target: { value: 'Senior' },
    })

    expect(onTargetRoleChange).toHaveBeenCalledWith('Data Analyst')
    expect(onExperienceLevelChange).toHaveBeenCalledWith('Senior')
  })

  it('reflects the values it is given rather than holding its own state', () => {
    const { rerender } = render(
      <CareerTrackSelector
        targetRole="Frontend Developer"
        onTargetRoleChange={() => {}}
        experienceLevel="Mid-Level"
        onExperienceLevelChange={() => {}}
      />
    )

    expect(screen.getByDisplayValue('Frontend Developer')).toBeInTheDocument()

    rerender(
      <CareerTrackSelector
        targetRole="Backend Developer"
        onTargetRoleChange={() => {}}
        experienceLevel="Junior"
        onExperienceLevelChange={() => {}}
      />
    )

    expect(screen.getByDisplayValue('Backend Developer')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Junior (0-2 yrs)')).toBeInTheDocument()
  })

  it('can be disabled', () => {
    render(
      <CareerTrackSelector
        targetRole="Frontend Developer"
        onTargetRoleChange={() => {}}
        experienceLevel="Mid-Level"
        onExperienceLevelChange={() => {}}
        disabled
      />
    )

    screen.getAllByRole('combobox').forEach((el) => expect(el).toBeDisabled())
  })

  it('namespaces its ids so a second instance does not collide', () => {
    // The original bug was two copies of this markup both hardcoding
    // `id="roleSelect"`. A caller that genuinely wants a second instance has
    // to be able to give it distinct ids.
    const { container } = render(
      <>
        <CareerTrackSelector
          targetRole="Frontend Developer"
          onTargetRoleChange={() => {}}
          experienceLevel="Mid-Level"
          onExperienceLevelChange={() => {}}
        />
        <CareerTrackSelector
          idPrefix="compare-"
          targetRole="Backend Developer"
          onTargetRoleChange={() => {}}
          experienceLevel="Senior"
          onExperienceLevelChange={() => {}}
        />
      </>
    )

    const ids = Array.from(container.querySelectorAll('[id]')).map((el) => el.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('roleSelect')
    expect(ids).toContain('compare-roleSelect')

    // And each select is still reachable by its own label.
    ;(container.querySelectorAll('select') as NodeListOf<HTMLSelectElement>).forEach((select) => {
      expect(select.labels).toHaveLength(1)
    })
  })
})

describe('App renders the career track controls exactly once (#828)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  const renderApp = () =>
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

  it('has no duplicate element ids anywhere in the document', () => {
    // The regression guard. Four elements shared two ids before this change,
    // and the symptom people actually hit was `Found multiple elements with
    // the display value` in unrelated tests.
    const { container } = renderApp()

    const counts = new Map<string, number>()
    container.querySelectorAll('[id]').forEach((el) => {
      counts.set(el.id, (counts.get(el.id) ?? 0) + 1)
    })

    const duplicates = [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([id, count]) => `${id} (×${count})`)

    expect(duplicates).toEqual([])
  })

  it('renders a single Target Career Track control', () => {
    renderApp()
    expect(screen.getAllByRole('combobox', { name: /target career track/i })).toHaveLength(1)
  })

  it('renders a single Experience Level control', () => {
    renderApp()
    expect(screen.getAllByRole('combobox', { name: /experience level/i })).toHaveLength(1)
  })

  it('gives each dropdown exactly one label', () => {
    // `<label for>` resolves through getElementById, which returns the first
    // match. With the ids duplicated, both "Target Career Track:" labels
    // pointed at the first select — it had two labels and the second copy had
    // none, so a screen reader announced the second pair as unnamed.
    const { container } = renderApp()

    const role = container.querySelector('#roleSelect') as HTMLSelectElement
    const level = container.querySelector('#experienceLevelSelect') as HTMLSelectElement

    expect(role.labels).toHaveLength(1)
    expect(level.labels).toHaveLength(1)
    expect(role.labels?.[0].textContent).toMatch(/target career track/i)
    expect(level.labels?.[0].textContent).toMatch(/experience level/i)
  })

  it('is found unambiguously by display value', () => {
    // This is the exact assertion that was failing on main:
    //   TestingLibraryElementError: Found multiple elements with the display
    //   value: Backend Developer.
    localStorage.setItem('selected_target_role', 'Backend Developer')
    localStorage.setItem('selected_experience_level', 'Senior')

    renderApp()

    expect(screen.getByDisplayValue('Backend Developer')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Senior (5+ yrs)')).toBeInTheDocument()
  })
})
