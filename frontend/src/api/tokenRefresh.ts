/**
 * Single-flight access-token refresh.
 *
 * Access tokens last five minutes (SimpleJWT's default, which this project
 * inherits). The frontend used to keep only the `access` token and throw the
 * `refresh` one away, and nothing ever called `/api/auth/refresh/` — so five
 * minutes after logging in every authenticated request started failing while
 * the navbar still showed the user as signed in.
 *
 * The logic lives here rather than inline in an axios interceptor so it can be
 * tested directly: everything it touches is passed in.
 *
 * "Single-flight" is the part worth being careful about. When a token expires,
 * whatever the page is doing tends to 401 several requests at once. Without
 * coordination each one fires its own refresh, and with `ROTATE_REFRESH_TOKENS`
 * on that would mean all but one refreshing against a token that has already
 * been replaced. One in-flight refresh is shared by every caller waiting on it.
 */

export interface RefreshedTokens {
  access: string
  /** Only present when ROTATE_REFRESH_TOKENS is on server-side. */
  refresh?: string
}

export interface RefresherDeps {
  /** Posts to the refresh endpoint. */
  requestRefresh: (refreshToken: string) => Promise<RefreshedTokens>
  /** Current refresh token, or null when there is no session. */
  getRefreshToken: () => string | null
  /** Store newly issued tokens. */
  onRefreshed: (tokens: RefreshedTokens) => void
  /** Called when the refresh token itself is no longer good. */
  onSessionExpired: () => void
}

export interface Refresher {
  /**
   * Returns a fresh access token, or null when the session cannot be renewed.
   * Concurrent calls share one request.
   */
  refresh: () => Promise<string | null>
  /** True while a refresh is in flight. Exposed for tests. */
  isRefreshing: () => boolean
}

export function createRefresher(deps: RefresherDeps): Refresher {
  let inFlight: Promise<string | null> | null = null

  const run = async (): Promise<string | null> => {
    const refreshToken = deps.getRefreshToken()

    // No refresh token at all — an anonymous 401, or a session stored before
    // the app started keeping refresh tokens. Nothing to renew.
    if (!refreshToken) {
      return null
    }

    try {
      const tokens = await deps.requestRefresh(refreshToken)
      if (!tokens || !tokens.access) {
        deps.onSessionExpired()
        return null
      }
      deps.onRefreshed(tokens)
      return tokens.access
    } catch {
      // The refresh token is expired, rotated away, or blacklisted. This is the
      // one case where the user genuinely has to sign in again, so say so
      // rather than failing silently the way the old code did.
      deps.onSessionExpired()
      return null
    }
  }

  return {
    refresh() {
      if (!inFlight) {
        inFlight = run().finally(() => {
          inFlight = null
        })
      }
      return inFlight
    },
    isRefreshing() {
      return inFlight !== null
    },
  }
}
