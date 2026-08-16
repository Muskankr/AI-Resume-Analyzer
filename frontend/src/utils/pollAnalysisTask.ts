/**
 * Polls `/api/status/<task_id>/` until the analysis finishes.
 *
 * This replaces a `while (true)` loop inlined in `App.tsx` that had no exit
 * other than SUCCESS or FAILURE. `task_status` reports `PENDING` for anything
 * unfinished, and Celery's default result backend cannot tell "queued" from
 * "never existed" — so with no worker running, a task stayed `PENDING` forever
 * and the UI polled once a second, indefinitely, spinner still turning.
 *
 * The loop also outlived the component. It was a plain async function, not an
 * effect, so nothing cancelled it: navigating away left it running, and
 * starting a second analysis left two loops racing to write `setScore` and
 * friends — results could land for the wrong file.
 *
 * Four changes, all of which the caller can tune:
 *
 * 1. An overall deadline, so it gives up and says something useful.
 * 2. An `AbortSignal`, so the caller can stop a run it no longer wants.
 * 3. Backoff, so a slow analysis is not hammered once a second throughout.
 * 4. Tolerance for transient network errors — a dropped request is not a
 *    failed analysis, and the old code turned any blip into "Analysis failed".
 */

/** Thrown when the analysis does not finish inside the deadline. */
export class AnalysisTimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AnalysisTimeoutError'
  }
}

/** Thrown when the backend reports the task itself failed. */
export class AnalysisFailedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AnalysisFailedError'
  }
}

/** Thrown when the caller aborts. Callers should treat this as "never mind". */
export class AnalysisAbortedError extends Error {
  constructor(message = 'Analysis polling was cancelled.') {
    super(message)
    this.name = 'AnalysisAbortedError'
  }
}

export interface TaskStatusResponse {
  state: string
  result?: unknown
  error?: string
}

export interface PollDeps {
  /** Fetches the current task state. */
  fetchStatus: (taskId: string, signal?: AbortSignal) => Promise<TaskStatusResponse>
  /** Waits, resolving early is fine; must reject if aborted. */
  sleep: (ms: number, signal?: AbortSignal) => Promise<void>
  /** Milliseconds since epoch. Injected so tests need no fake timers. */
  now: () => number
}

export interface PollOptions {
  /** Give up after this long. Default 3 minutes. */
  timeoutMs?: number
  /** Wait before the second poll. Default 1s, matching the old behaviour. */
  initialIntervalMs?: number
  /** Ceiling for the backed-off interval. Default 5s. */
  maxIntervalMs?: number
  /** Interval multiplier per poll. Default 1.5. */
  backoffFactor?: number
  /**
   * Consecutive failed status requests tolerated before giving up. A blip is
   * not a failed analysis. Default 4.
   */
  maxConsecutiveErrors?: number
  signal?: AbortSignal
}

export const DEFAULT_POLL_OPTIONS: Required<Omit<PollOptions, 'signal'>> = {
  timeoutMs: 3 * 60 * 1000,
  initialIntervalMs: 1000,
  maxIntervalMs: 5000,
  backoffFactor: 1.5,
  maxConsecutiveErrors: 4,
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new AnalysisAbortedError()
  }
}

/**
 * Polls until the task succeeds, and returns its result.
 *
 * Throws `AnalysisFailedError` if the backend reports FAILURE,
 * `AnalysisTimeoutError` at the deadline, and `AnalysisAbortedError` if the
 * signal fires.
 */
export async function pollAnalysisTask(
  taskId: string,
  deps: PollDeps,
  options: PollOptions = {}
): Promise<unknown> {
  const config = { ...DEFAULT_POLL_OPTIONS, ...options }
  const { signal } = options

  const startedAt = deps.now()
  let interval = config.initialIntervalMs
  let consecutiveErrors = 0

  while (true) {
    throwIfAborted(signal)

    let status: TaskStatusResponse
    try {
      status = await deps.fetchStatus(taskId, signal)
      consecutiveErrors = 0
    } catch (error) {
      if (error instanceof AnalysisAbortedError || signal?.aborted) {
        throw new AnalysisAbortedError()
      }

      consecutiveErrors += 1
      if (consecutiveErrors >= config.maxConsecutiveErrors) {
        throw error
      }

      // Fall through to the wait below and try again. A single dropped
      // request used to surface as "Analysis failed" even though the task
      // was still running perfectly well.
      status = { state: 'PENDING' }
    }

    if (status.state === 'SUCCESS') {
      return status.result
    }

    if (status.state === 'FAILURE') {
      throw new AnalysisFailedError(status.error || 'Analysis failed')
    }

    // Checked after handling the response, so a task that finished right on
    // the deadline still counts as a success rather than a timeout.
    if (deps.now() - startedAt >= config.timeoutMs) {
      throw new AnalysisTimeoutError(
        'This analysis is taking longer than expected. It may still be ' +
          'processing — please try again in a moment.'
      )
    }

    await deps.sleep(interval, signal)
    interval = Math.min(interval * config.backoffFactor, config.maxIntervalMs)
  }
}

/**
 * `sleep` that rejects as soon as the signal fires, instead of running the
 * timer down first. Without this, aborting would still wait out the interval.
 */
export function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AnalysisAbortedError())
      return
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    function onAbort() {
      clearTimeout(timer)
      reject(new AnalysisAbortedError())
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
