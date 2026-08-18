/**
 * Shared axios instance that keeps a signed-in session alive.
 *
 * Every authenticated call should go through `api` rather than bare `axios`.
 * It attaches the current access token, and on a 401 it refreshes once and
 * retries the original request. Previously nothing refreshed anything, so a
 * session stopped working five minutes after login.
 */

import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'

import { createRefresher } from './tokenRefresh'
import { clearSession, getAccessToken, getRefreshToken, updateTokens } from './session'

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

/** Refreshing must not go through `api`, or a failed refresh would recurse. */
const bareClient = axios.create({ baseURL: BACKEND_URL })

export const api: AxiosInstance = axios.create({ baseURL: BACKEND_URL })

/** Notified when the session cannot be renewed, so the UI can say so. */
type ExpiryListener = () => void
const expiryListeners = new Set<ExpiryListener>()

export function onSessionExpired(listener: ExpiryListener): () => void {
  expiryListeners.add(listener)
  return () => {
    expiryListeners.delete(listener)
  }
}

const refresher = createRefresher({
  requestRefresh: async (refreshToken: string) => {
    const res = await bareClient.post('/api/auth/refresh/', { refresh: refreshToken })
    return { access: res.data?.access, refresh: res.data?.refresh }
  },
  getRefreshToken,
  onRefreshed: ({ access, refresh }) => updateTokens(access, refresh),
  onSessionExpired: () => {
    clearSession()
    expiryListeners.forEach((listener) => listener())
  },
})

/** Marks a request that has already been retried, so it is retried only once. */
interface RetriableConfig extends InternalAxiosRequestConfig {
  _retriedAfterRefresh?: boolean
  /** Set on calls that should never trigger a refresh (login, signup). */
  skipAuthRefresh?: boolean
}

api.interceptors.request.use((config: RetriableConfig) => {
  const token = getAccessToken()
  if (token) {
    // AxiosHeaders rather than a plain object: axios v1 normalises headers and
    // a bare spread loses the methods it expects to find.
    const headers = AxiosHeaders.from(config.headers)
    headers.set('Authorization', `Bearer ${token}`)
    config.headers = headers
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined

    const shouldTryRefresh =
      error.response?.status === 401 &&
      config &&
      !config._retriedAfterRefresh &&
      !config.skipAuthRefresh &&
      // An anonymous 401 has nothing to renew. Without this, every logged-out
      // 401 would pointlessly hit the refresh endpoint.
      getRefreshToken() !== null

    if (!shouldTryRefresh) {
      return Promise.reject(error)
    }

    // Concurrent 401s all await the same refresh; see tokenRefresh.ts.
    const accessToken = await refresher.refresh()

    if (!accessToken) {
      return Promise.reject(error)
    }

    config._retriedAfterRefresh = true
    const headers = AxiosHeaders.from(config.headers)
    headers.set('Authorization', `Bearer ${accessToken}`)
    config.headers = headers

    return api.request(config)
  }
)
