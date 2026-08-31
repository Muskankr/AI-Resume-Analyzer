/**
 * Where the signed-in session lives.
 *
 * Pulled out of `useAuth` so that non-React code — the axios interceptor in
 * `client.ts` — can read the current tokens and write a refreshed one without
 * importing a hook. `useAuth` subscribes to this and mirrors it into React
 * state.
 *
 * The stored shape gained a `refresh` field. Sessions saved by an older build
 * will not have one; those load fine and simply cannot be refreshed, so the
 * user is asked to sign in again once their access token runs out. That is the
 * behaviour they already had.
 */

export interface StoredSession {
  username: string
  /** Access token. Named `token` because that is what was persisted before. */
  token: string
  refresh?: string
  avatarUrl?: string
  themePreference?: string
}

const STORAGE_KEY = 'auth_user'

type Listener = (session: StoredSession | null) => void

const listeners = new Set<Listener>()

/** True when the session lives in localStorage rather than sessionStorage. */
function usingLocalStorage(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    return false
  }
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // A stored blob without a username or access token is not a usable
    // session; treat it as signed out rather than half-restoring it.
    if (!parsed || typeof parsed.username !== 'string' || typeof parsed.token !== 'string') {
      return null
    }
    return parsed as StoredSession
  } catch {
    // Storage can be unavailable in strict privacy modes, and the value can be
    // corrupt. Either way there is no session.
    return null
  }
}

export function saveSession(session: StoredSession | null, remember: boolean = true): void {
  try {
    if (session) {
      if (remember) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
        sessionStorage.removeItem(STORAGE_KEY)
      } else {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
        localStorage.removeItem(STORAGE_KEY)
      }
    } else {
      localStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    /* persistence is best-effort */
  }

  listeners.forEach((listener) => listener(session))
}

/**
 * Store tokens returned by a refresh, leaving the rest of the session alone.
 *
 * `refreshToken` is optional because the endpoint only returns one when
 * `ROTATE_REFRESH_TOKENS` is on. When it does, the new one must be kept —
 * storing only the access token would leave us holding a rotated-away refresh
 * token and quietly give up the benefit of rotating at all.
 *
 * Keeps whichever storage the session was already in, so refreshing does not
 * silently promote a "don't remember me" session into localStorage.
 */
export function updateTokens(accessToken: string, refreshToken?: string): void {
  const current = loadSession()
  if (!current) return
  saveSession(
    {
      ...current,
      token: accessToken,
      refresh: refreshToken || current.refresh,
    },
    usingLocalStorage()
  )
}

export function getAccessToken(): string | null {
  return loadSession()?.token ?? null
}

export function getRefreshToken(): string | null {
  return loadSession()?.refresh ?? null
}

export function clearSession(): void {
  saveSession(null)
}

/** Subscribe to session changes. Returns an unsubscribe function. */
export function subscribeToSession(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
