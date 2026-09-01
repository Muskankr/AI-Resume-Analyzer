/**
 * The refresh machinery from #586 only helps the calls that actually use it.
 *
 * It was built — `api/client.ts` attaches the current token and retries once
 * after refreshing on a 401 — and then wired into exactly two calls. Everything
 * else kept building `Authorization: Bearer ${user.token}` by hand from a value
 * captured when the component rendered, so upload, voting, profile, avatar,
 * admin stats and compare all started failing fifteen minutes after login while
 * the navbar still showed the user as signed in.
 *
 * These tests are about that gap. The first group is a source-level assertion
 * that no authenticated call has drifted back to bare axios, because that is
 * the failure mode: not a broken function, a function that quietly stopped
 * being routed through the thing that renews the session. The rest exercise the
 * interceptor end to end against a mock adapter, so the "401 then refresh then
 * retry" path is checked rather than assumed.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosRequestConfig } from 'axios'

/**
 * One observed request. The Authorization value is copied out at the moment the
 * request is made rather than kept as a reference to the config: the retry
 * reuses the same config object and mutates its headers in place, so holding
 * the object would make the first attempt appear to have carried the refreshed
 * token all along.
 */
interface SeenRequest {
  url?: string
  authorization?: string
}

const STORAGE_KEY = 'auth_user'

function signIn(token = 'access-1', refresh = 'refresh-1') {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ username: 'someone', token, refresh }))
}

describe('authenticated calls go through the refreshing client', () => {
  /**
   * Files that make at least one call requiring a session, and the endpoints
   * they own. Kept explicit so adding an authenticated call to a new file is a
   * deliberate act that includes adding it here.
   */
  const AUTHENTICATED_SOURCES = [
    'App.tsx',
    'components/ProfilePage.tsx',
    'components/ProfileModal.tsx',
    'components/AdminDashboard.tsx',
    'hooks/useCompareVersions.ts',
  ]

  /**
   * Loaded eagerly: vitest's glob import is resolved at build time, so the
   * pattern cannot be built from the array above.
   */
  const sources = import.meta.glob('../**/*.{ts,tsx}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>

  function sourceFor(relativePath: string): string {
    const key = Object.keys(sources).find((k) => k.endsWith(`/${relativePath}`))
    if (!key) throw new Error(`Could not load source for ${relativePath}`)
    return sources[key]
  }

  it.each(AUTHENTICATED_SOURCES)('%s does not hand-build an Authorization header', (file) => {
    // A hand-built header carries whatever token the component captured on
    // render. Even when the interceptor refreshes and writes a new token to
    // storage, a closure like this keeps sending the stale one.
    expect(sourceFor(file)).not.toMatch(/Authorization:\s*`Bearer/)
  })

  it.each(AUTHENTICATED_SOURCES)('%s does not call bare axios verbs', (file) => {
    // `axios.isAxiosError` is fine — it inspects an error, it does not make a
    // request. `axios.get` / `.post` / `.put` / `.delete` bypass the
    // interceptor entirely.
    expect(sourceFor(file)).not.toMatch(/\baxios\.(get|post|put|delete|patch)\s*\(/)
  })

  it('the calls that must stay on bare axios still do', () => {
    // Login and signup have no session to renew, and a 401 from them means bad
    // credentials. Routing them through `api` would fire a pointless refresh on
    // every wrong password.
    const useAuth = sourceFor('hooks/useAuth.ts')
    expect(useAuth).toMatch(/axios\.post\(`\$\{BACKEND\}\/api\/auth\/login\//)
    expect(useAuth).toMatch(/axios\.post\(`\$\{BACKEND\}\/api\/auth\/signup\//)
  })
})

describe('api client refresh behaviour', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.resetModules()
  })

  /**
   * Drives the real interceptors with a stubbed adapter, so what is exercised
   * is the client's own request/response chain.
   *
   * The adapter is installed on the axios default *before* `./client` is
   * imported, deliberately. `client.ts` builds two instances at module load —
   * `api` and the bare one the refresh call uses, which has to be separate or a
   * failing refresh would recurse through the same interceptor. `axios.create()`
   * snapshots the defaults at that moment, so an adapter assigned afterwards
   * reaches `api` but never the refresh client, and the refresh would go to the
   * real network.
   */
  async function withMockedTransport(
    handler: (config: AxiosRequestConfig) => Promise<{ status: number; data: unknown }>
  ) {
    const seen: SeenRequest[] = []
    const axios = (await import('axios')).default

    axios.defaults.adapter = async (config) => {
      seen.push({
        url: config.url,
        authorization: config.headers?.Authorization as string | undefined,
      })
      const { status, data } = await handler(config)
      if (status >= 400) {
        throw Object.assign(new Error(`Request failed with status ${status}`), {
          isAxiosError: true,
          config,
          response: { status, data, config, headers: {}, statusText: '' },
        })
      }
      return { status, data, statusText: 'OK', headers: {}, config }
    }

    const { api } = await import('./client')

    return { api, seen }
  }

  it('attaches the token currently in storage, not one captured earlier', async () => {
    signIn('access-1')
    const { api, seen } = await withMockedTransport(async () => ({ status: 200, data: {} }))

    await api.get('/api/profile/')

    // Something else refreshes the session — another tab, or a concurrent call.
    signIn('access-2')
    await api.get('/api/profile/')

    expect(seen[0].authorization).toBe('Bearer access-1')
    expect(seen[1].authorization).toBe('Bearer access-2')
  })

  it('refreshes and retries once when an authenticated call 401s', async () => {
    signIn('expired-token')

    let refreshed = false
    const { api, seen } = await withMockedTransport(async (config) => {
      if (config.url?.includes('/api/auth/refresh/')) {
        refreshed = true
        return { status: 200, data: { access: 'fresh-token', refresh: 'refresh-2' } }
      }
      if (config.headers?.Authorization === 'Bearer expired-token') {
        return { status: 401, data: { detail: 'Token is invalid or expired' } }
      }
      return { status: 200, data: { ok: true } }
    })

    const response = await api.post('/api/upload/', new FormData())

    expect(response.data).toEqual({ ok: true })
    expect(refreshed).toBe(true)

    const uploads = seen.filter((c) => c.url?.includes('/api/upload/'))
    expect(uploads).toHaveLength(2)
    expect(uploads[0].authorization).toBe('Bearer expired-token')
    expect(uploads[1].authorization).toBe('Bearer fresh-token')
  })

  it('does not retry an anonymous 401 — there is nothing to renew', async () => {
    // No session in storage at all.
    const { api, seen } = await withMockedTransport(async () => ({
      status: 401,
      data: { detail: 'Authentication credentials were not provided.' },
    }))

    await expect(api.get('/api/history/')).rejects.toMatchObject({
      response: { status: 401 },
    })

    expect(seen.filter((c) => c.url?.includes('/api/auth/refresh/'))).toHaveLength(0)
    expect(seen).toHaveLength(1)
  })

  it('gives up rather than looping when the retry also 401s', async () => {
    signIn('expired-token')

    const { api, seen } = await withMockedTransport(async (config) => {
      if (config.url?.includes('/api/auth/refresh/')) {
        return { status: 200, data: { access: 'also-bad' } }
      }
      return { status: 401, data: { detail: 'nope' } }
    })

    await expect(api.get('/api/compare/')).rejects.toMatchObject({
      response: { status: 401 },
    })

    // Exactly two attempts at the original call: the first, and one retry.
    expect(seen.filter((c) => c.url?.includes('/api/compare/'))).toHaveLength(2)
  })
})
