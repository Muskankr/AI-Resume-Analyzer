import { describe, it, expect, vi } from 'vitest'

import { createRefresher, type RefresherDeps } from './tokenRefresh'

/**
 * The frontend used to keep only the 5-minute access token and never call
 * /api/auth/refresh/, so signed-in sessions broke after five minutes with no
 * visible cause. These cover the piece that renews them.
 */

function makeDeps(overrides: Partial<RefresherDeps> = {}) {
  const deps: RefresherDeps = {
    requestRefresh: vi.fn(async () => ({ access: 'new-access' })),
    getRefreshToken: vi.fn(() => 'stored-refresh' as string | null),
    onRefreshed: vi.fn(),
    onSessionExpired: vi.fn(),
    ...overrides,
  }
  return deps
}

/** A promise plus the handles to settle it later. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('createRefresher', () => {
  it('exchanges the refresh token for a new access token', async () => {
    const deps = makeDeps()
    const refresher = createRefresher(deps)

    const token = await refresher.refresh()

    expect(token).toBe('new-access')
    expect(deps.requestRefresh).toHaveBeenCalledWith('stored-refresh')
    expect(deps.onRefreshed).toHaveBeenCalledWith({ access: 'new-access' })
    expect(deps.onSessionExpired).not.toHaveBeenCalled()
  })

  it('stores a rotated refresh token when the server sends one', async () => {
    // ROTATE_REFRESH_TOKENS is on, so keeping only the access token would
    // leave us holding a refresh token that has already been replaced.
    const deps = makeDeps({
      requestRefresh: vi.fn(async () => ({ access: 'new-access', refresh: 'rotated' })),
    })
    const refresher = createRefresher(deps)

    await refresher.refresh()

    expect(deps.onRefreshed).toHaveBeenCalledWith({
      access: 'new-access',
      refresh: 'rotated',
    })
  })

  it('does nothing when there is no refresh token', async () => {
    // An anonymous 401, or a session stored by a build that discarded it.
    const deps = makeDeps({ getRefreshToken: vi.fn(() => null) })
    const refresher = createRefresher(deps)

    const token = await refresher.refresh()

    expect(token).toBeNull()
    expect(deps.requestRefresh).not.toHaveBeenCalled()
    // Not an expiry — there was never a session to expire.
    expect(deps.onSessionExpired).not.toHaveBeenCalled()
  })

  it('reports the session as expired when the refresh is rejected', async () => {
    const deps = makeDeps({
      requestRefresh: vi.fn(async () => {
        throw new Error('401 token_not_valid')
      }),
    })
    const refresher = createRefresher(deps)

    const token = await refresher.refresh()

    expect(token).toBeNull()
    expect(deps.onSessionExpired).toHaveBeenCalledTimes(1)
    expect(deps.onRefreshed).not.toHaveBeenCalled()
  })

  it('treats a response with no access token as an expiry', async () => {
    const deps = makeDeps({
      requestRefresh: vi.fn(async () => ({ access: '' })),
    })
    const refresher = createRefresher(deps)

    expect(await refresher.refresh()).toBeNull()
    expect(deps.onSessionExpired).toHaveBeenCalledTimes(1)
  })

  it('shares one request between concurrent callers', async () => {
    // When a token expires mid-page, several requests 401 at once. Each firing
    // its own refresh would race, and under token rotation all but one would
    // be refreshing against an already-replaced token.
    const pending = deferred<{ access: string }>()
    const deps = makeDeps({ requestRefresh: vi.fn(() => pending.promise) })
    const refresher = createRefresher(deps)

    const first = refresher.refresh()
    const second = refresher.refresh()
    const third = refresher.refresh()

    expect(deps.requestRefresh).toHaveBeenCalledTimes(1)

    pending.resolve({ access: 'shared-access' })

    expect(await first).toBe('shared-access')
    expect(await second).toBe('shared-access')
    expect(await third).toBe('shared-access')
    expect(deps.requestRefresh).toHaveBeenCalledTimes(1)
  })

  it('allows a new refresh once the previous one has settled', async () => {
    const deps = makeDeps()
    const refresher = createRefresher(deps)

    await refresher.refresh()
    await refresher.refresh()

    expect(deps.requestRefresh).toHaveBeenCalledTimes(2)
  })

  it('clears the in-flight request after a failure', async () => {
    // A failed refresh must not wedge the refresher permanently.
    const deps = makeDeps({
      requestRefresh: vi
        .fn()
        .mockRejectedValueOnce(new Error('network blip'))
        .mockResolvedValueOnce({ access: 'recovered' }),
    })
    const refresher = createRefresher(deps)

    expect(await refresher.refresh()).toBeNull()
    expect(refresher.isRefreshing()).toBe(false)
    expect(await refresher.refresh()).toBe('recovered')
  })

  it('reports whether a refresh is in flight', async () => {
    const pending = deferred<{ access: string }>()
    const deps = makeDeps({ requestRefresh: vi.fn(() => pending.promise) })
    const refresher = createRefresher(deps)

    expect(refresher.isRefreshing()).toBe(false)

    const inFlight = refresher.refresh()
    expect(refresher.isRefreshing()).toBe(true)

    pending.resolve({ access: 'done' })
    await inFlight

    expect(refresher.isRefreshing()).toBe(false)
  })
})
