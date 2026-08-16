import { describe, it, expect, vi } from 'vitest'

import {
  AnalysisAbortedError,
  AnalysisFailedError,
  AnalysisTimeoutError,
  abortableSleep,
  pollAnalysisTask,
  type PollDeps,
  type TaskStatusResponse,
} from './pollAnalysisTask'

/**
 * The loop this replaces was `while (true)` with no deadline and no way to
 * cancel it, so a task that never got picked up meant a spinner that never
 * stopped and one request per second forever.
 */

/**
 * Deps driven by a scripted list of responses, with a clock that advances by
 * whatever the code asks to sleep. No fake timers needed, and no real waiting.
 */
function makeDeps(responses: Array<TaskStatusResponse | Error>) {
  let clock = 0
  const queue = [...responses]
  const sleeps: number[] = []

  const deps: PollDeps = {
    fetchStatus: vi.fn(async () => {
      const next = queue.shift()
      if (next === undefined) {
        // Nothing scripted left: behave like a task stuck in the queue, which
        // is the case that used to loop forever.
        return { state: 'PENDING' }
      }
      if (next instanceof Error) throw next
      return next
    }),
    sleep: vi.fn(async (ms: number) => {
      sleeps.push(ms)
      clock += ms
    }),
    now: () => clock,
  }

  return {
    deps,
    sleeps,
    callCount: () => (deps.fetchStatus as ReturnType<typeof vi.fn>).mock.calls.length,
  }
}

describe('pollAnalysisTask', () => {
  it('returns the result as soon as the task succeeds', async () => {
    const { deps, callCount } = makeDeps([{ state: 'SUCCESS', result: { score: 91 } }])

    const result = await pollAnalysisTask('task-1', deps)

    expect(result).toEqual({ score: 91 })
    expect(callCount()).toBe(1)
  })

  it('keeps polling while the task is pending', async () => {
    const { deps, callCount } = makeDeps([
      { state: 'PENDING' },
      { state: 'STARTED' },
      { state: 'SUCCESS', result: { score: 70 } },
    ])

    expect(await pollAnalysisTask('task-1', deps)).toEqual({ score: 70 })
    expect(callCount()).toBe(3)
  })

  it('throws with the backend message when the task fails', async () => {
    const { deps } = makeDeps([{ state: 'FAILURE', error: 'Could not read the PDF' }])

    await expect(pollAnalysisTask('task-1', deps)).rejects.toThrow(AnalysisFailedError)
  })

  it('falls back to a generic message when the failure has no detail', async () => {
    const { deps } = makeDeps([{ state: 'FAILURE' }])

    await expect(pollAnalysisTask('task-1', deps)).rejects.toThrow('Analysis failed')
  })

  it('surfaces the backend failure detail', async () => {
    const { deps } = makeDeps([{ state: 'FAILURE', error: 'Could not read the PDF' }])

    await expect(pollAnalysisTask('task-1', deps)).rejects.toThrow('Could not read the PDF')
  })

  it('gives up at the deadline instead of polling forever', async () => {
    // Nothing scripted, so every poll answers PENDING -- exactly the "no
    // worker running" case that used to spin indefinitely.
    const { deps } = makeDeps([])

    await expect(pollAnalysisTask('task-1', deps, { timeoutMs: 10_000 })).rejects.toThrow(
      AnalysisTimeoutError
    )
  })

  it('says something useful when it times out', async () => {
    const { deps } = makeDeps([])

    await expect(pollAnalysisTask('task-1', deps, { timeoutMs: 5_000 })).rejects.toThrow(
      /taking longer than expected/i
    )
  })

  it('makes a bounded number of requests before giving up', async () => {
    const { deps, callCount } = makeDeps([])

    await expect(
      pollAnalysisTask('task-1', deps, {
        timeoutMs: 10_000,
        initialIntervalMs: 1000,
        maxIntervalMs: 1000,
        backoffFactor: 1,
      })
    ).rejects.toThrow(AnalysisTimeoutError)

    // ~one per second across a 10s budget, not unbounded.
    expect(callCount()).toBeLessThanOrEqual(12)
  })

  it('accepts a task that succeeds right on the deadline', async () => {
    // The timeout is checked after the response is handled, so a SUCCESS that
    // arrives at the boundary is not thrown away.
    const { deps } = makeDeps([{ state: 'PENDING' }, { state: 'SUCCESS', result: 'ok' }])

    expect(
      await pollAnalysisTask('task-1', deps, { timeoutMs: 1000, initialIntervalMs: 1000 })
    ).toBe('ok')
  })

  it('backs off instead of polling at a flat one second', async () => {
    const { deps, sleeps } = makeDeps([
      { state: 'PENDING' },
      { state: 'PENDING' },
      { state: 'PENDING' },
      { state: 'SUCCESS', result: 'ok' },
    ])

    await pollAnalysisTask('task-1', deps, {
      initialIntervalMs: 1000,
      backoffFactor: 2,
      maxIntervalMs: 10_000,
    })

    expect(sleeps).toEqual([1000, 2000, 4000])
  })

  it('does not back off past the ceiling', async () => {
    const { deps, sleeps } = makeDeps([
      { state: 'PENDING' },
      { state: 'PENDING' },
      { state: 'PENDING' },
      { state: 'SUCCESS', result: 'ok' },
    ])

    await pollAnalysisTask('task-1', deps, {
      initialIntervalMs: 1000,
      backoffFactor: 10,
      maxIntervalMs: 3000,
    })

    expect(sleeps).toEqual([1000, 3000, 3000])
  })

  it('survives a transient network error mid-poll', async () => {
    // A dropped request is not a failed analysis. The old loop let it escape
    // and surfaced "Analysis failed" for a task that was running fine.
    const { deps } = makeDeps([
      { state: 'PENDING' },
      new Error('Network Error'),
      { state: 'SUCCESS', result: { score: 55 } },
    ])

    expect(await pollAnalysisTask('task-1', deps)).toEqual({ score: 55 })
  })

  it('gives up after too many consecutive errors', async () => {
    const { deps } = makeDeps([
      new Error('Network Error'),
      new Error('Network Error'),
      new Error('Network Error'),
    ])

    await expect(pollAnalysisTask('task-1', deps, { maxConsecutiveErrors: 3 })).rejects.toThrow(
      'Network Error'
    )
  })

  it('resets the error count after a good response', async () => {
    const { deps } = makeDeps([
      new Error('blip'),
      { state: 'PENDING' },
      new Error('blip'),
      { state: 'SUCCESS', result: 'ok' },
    ])

    expect(await pollAnalysisTask('task-1', deps, { maxConsecutiveErrors: 2 })).toBe('ok')
  })

  describe('cancellation', () => {
    it('stops immediately when the signal is already aborted', async () => {
      const { deps, callCount } = makeDeps([{ state: 'SUCCESS', result: 'ok' }])
      const controller = new AbortController()
      controller.abort()

      await expect(pollAnalysisTask('task-1', deps, { signal: controller.signal })).rejects.toThrow(
        AnalysisAbortedError
      )

      expect(callCount()).toBe(0)
    })

    it('stops polling once aborted mid-run', async () => {
      const controller = new AbortController()
      let clock = 0
      let calls = 0

      const deps: PollDeps = {
        fetchStatus: async () => {
          calls += 1
          if (calls === 2) controller.abort()
          return { state: 'PENDING' }
        },
        sleep: async (ms) => {
          if (controller.signal.aborted) throw new AnalysisAbortedError()
          clock += ms
        },
        now: () => clock,
      }

      await expect(pollAnalysisTask('task-1', deps, { signal: controller.signal })).rejects.toThrow(
        AnalysisAbortedError
      )

      // Stopped at the abort rather than running to the deadline.
      expect(calls).toBe(2)
    })

    it('reports an abort as an abort, not as a network failure', async () => {
      const controller = new AbortController()
      controller.abort()

      const deps: PollDeps = {
        fetchStatus: async () => {
          throw new Error('canceled')
        },
        sleep: async () => {},
        now: () => 0,
      }

      await expect(pollAnalysisTask('task-1', deps, { signal: controller.signal })).rejects.toThrow(
        AnalysisAbortedError
      )
    })
  })
})

describe('abortableSleep', () => {
  it('resolves after the delay', async () => {
    const started = Date.now()
    await abortableSleep(20)
    expect(Date.now() - started).toBeGreaterThanOrEqual(15)
  })

  it('rejects immediately if the signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(abortableSleep(10_000, controller.signal)).rejects.toThrow(AnalysisAbortedError)
  })

  it('rejects as soon as the signal fires, without waiting out the timer', async () => {
    const controller = new AbortController()
    const started = Date.now()
    const pending = abortableSleep(10_000, controller.signal)

    controller.abort()

    await expect(pending).rejects.toThrow(AnalysisAbortedError)
    expect(Date.now() - started).toBeLessThan(1000)
  })
})
