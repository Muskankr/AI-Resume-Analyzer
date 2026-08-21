// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { TimelinePanel } from './TimelinePanel'
import {
  formatDuration,
  formatEndpoint,
  formatRange,
  type TimelineData,
} from '../utils/timelineFormat'

function timeline(overrides: Partial<TimelineData> = {}): TimelineData {
  return {
    parsed: true,
    ranges: [
      {
        start_year: 2020,
        start_month: 1,
        end_year: null,
        end_month: null,
        is_current: true,
        text: 'Jan 2020 - Present',
        line: 'Senior Backend Engineer, Acme Corp',
      },
    ],
    findings: [],
    total_months: 79,
    total_years: 6.6,
    largest_gap_months: 0,
    has_current_role: true,
    formats_seen: ['Jan 2020', 'Present'],
    ...overrides,
  }
}

describe('TimelinePanel (#709)', () => {
  it('renders nothing without a timeline', () => {
    const { container } = render(<TimelinePanel timeline={null} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('summarises total experience and role count', () => {
    render(<TimelinePanel timeline={timeline()} />)

    expect(screen.getByText(/6 years 7 months across 1 role/)).toBeInTheDocument()
  })

  it('says when the person is currently employed', () => {
    render(<TimelinePanel timeline={timeline()} />)

    expect(screen.getByText(/currently employed/)).toBeInTheDocument()
  })

  it('keeps the detail collapsed until asked', () => {
    render(<TimelinePanel timeline={timeline()} />)

    expect(screen.queryByText('Jan 2020 – Present')).not.toBeInTheDocument()
  })

  it('lists the parsed ranges once expanded', async () => {
    const user = userEvent.setup()
    render(<TimelinePanel timeline={timeline()} />)

    await user.click(screen.getByRole('button'))

    expect(screen.getByText('Jan 2020 – Present')).toBeInTheDocument()
    expect(screen.getByText('Senior Backend Engineer, Acme Corp')).toBeInTheDocument()
  })

  it('shows the findings with their severity', async () => {
    const user = userEvent.setup()
    render(
      <TimelinePanel
        timeline={timeline({
          findings: [
            { code: 'employment_gap', severity: 'high', message: 'There is a gap of 2 years.' },
          ],
        })}
      />
    )

    await user.click(screen.getByRole('button'))

    expect(screen.getByText('There is a gap of 2 years.')).toBeInTheDocument()
    expect(screen.getByTitle('Fix this')).toBeInTheDocument()
  })

  it('counts the findings on the collapsed header', () => {
    render(
      <TimelinePanel
        timeline={timeline({
          findings: [
            { code: 'a', severity: 'medium', message: 'One' },
            { code: 'b', severity: 'low', message: 'Two' },
          ],
        })}
      />
    )

    expect(screen.getByText('2 notes')).toBeInTheDocument()
  })

  it('says so plainly when there is nothing to report', async () => {
    const user = userEvent.setup()
    render(<TimelinePanel timeline={timeline()} defaultExpanded />)

    expect(screen.getByText(/Nothing stands out/)).toBeInTheDocument()
    await user.click(screen.getByRole('button'))
  })

  it('reports the largest gap when there is one', () => {
    render(<TimelinePanel timeline={timeline({ largest_gap_months: 14 })} defaultExpanded />)

    expect(screen.getByText(/1 year 2 months/)).toBeInTheDocument()
  })

  it('does not claim a resume has no dates when we merely could not read them', () => {
    // The distinction the whole feature turns on: a false "you forgot your
    // dates" sends people hunting for a problem they do not have.
    render(
      <TimelinePanel
        timeline={timeline({
          parsed: false,
          ranges: [],
          findings: [
            {
              code: 'no_dates_found',
              severity: 'info',
              message: 'We could not read any employment dates from this resume.',
            },
          ],
        })}
      />
    )

    expect(screen.getByText(/could not read any employment dates/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('formatEndpoint', () => {
  it('renders a month and year', () => {
    expect(formatEndpoint(2020, 3)).toBe('Mar 2020')
  })

  it('leaves a year-only date as a year', () => {
    // Inventing "Jan" would contradict the year_only_dates advice beside it.
    expect(formatEndpoint(2020, null)).toBe('2020')
  })

  it('renders a null year as Present', () => {
    expect(formatEndpoint(null, null)).toBe('Present')
  })

  it('ignores an out-of-range month rather than indexing off the end', () => {
    expect(formatEndpoint(2020, 13)).toBe('2020')
    expect(formatEndpoint(2020, 0)).toBe('2020')
  })
})

describe('formatRange', () => {
  it('renders a closed range', () => {
    expect(
      formatRange({
        start_year: 2017,
        start_month: 3,
        end_year: 2019,
        end_month: 6,
        is_current: false,
        text: '',
      })
    ).toBe('Mar 2017 – Jun 2019')
  })

  it('renders a current range', () => {
    expect(
      formatRange({
        start_year: 2020,
        start_month: 1,
        end_year: null,
        end_month: null,
        is_current: true,
        text: '',
      })
    ).toBe('Jan 2020 – Present')
  })
})

describe('formatDuration', () => {
  it('uses months under a year', () => {
    expect(formatDuration(9)).toBe('9 months')
    expect(formatDuration(1)).toBe('1 month')
  })

  it('uses whole years when they divide', () => {
    expect(formatDuration(24)).toBe('2 years')
    expect(formatDuration(12)).toBe('1 year')
  })

  it('combines years and months', () => {
    expect(formatDuration(51)).toBe('4 years 3 months')
    expect(formatDuration(13)).toBe('1 year 1 month')
  })

  it('does not render a negative or zero duration as nonsense', () => {
    expect(formatDuration(0)).toBe('0 months')
    expect(formatDuration(-4)).toBe('0 months')
  })
})
