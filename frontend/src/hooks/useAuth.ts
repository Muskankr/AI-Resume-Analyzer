import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

import { api, BACKEND_URL, onSessionExpired } from '../api/client'
import {
  clearSession,
  loadSession,
  saveSession,
  subscribeToSession,
  type StoredSession,
} from '../api/session'

const BACKEND = BACKEND_URL

export type AuthUser = StoredSession

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(loadSession)
  const [sessionExpired, setSessionExpired] = useState(false)

  // The axios interceptor writes refreshed tokens straight to storage, and
  // clears the session when a refresh fails. Mirror both back into React state
  // so the navbar cannot keep showing a signed-in user whose session is gone —
  // which is exactly what used to happen after five minutes.
  useEffect(() => {
    const unsubscribeSession = subscribeToSession(setUser)
    const unsubscribeExpiry = onSessionExpired(() => {
      setUser(null)
      setSessionExpired(true)
    })
    return () => {
      unsubscribeSession()
      unsubscribeExpiry()
    }
  }, [])

  const persist = (u: AuthUser | null, remember: boolean = true) => {
    setSessionExpired(false)
    saveSession(u, remember)
    setUser(u)
  }

  const signup = useCallback(async (username: string, password: string, captchaToken?: string) => {
    await axios.post(`${BACKEND}/api/auth/signup/`, {
      username,
      password,
      captcha_token: captchaToken,
    })
    const res = await axios.post(`${BACKEND}/api/auth/login/`, {
      username,
      password,
      captcha_token: captchaToken,
    })
    persist(
      {
        username,
        token: res.data.access,
        // Was discarded. Without it a session cannot outlive its access token.
        refresh: res.data.refresh,
        avatarUrl: res.data.avatar_url,
        themePreference: res.data.theme_preference,
      },
      true
    )
  }, [])

  const login = useCallback(
    async (
      username: string,
      password: string,
      rememberMe: boolean = true,
      captchaToken?: string
    ) => {
      const res = await axios.post(`${BACKEND}/api/auth/login/`, {
        username,
        password,
        captcha_token: captchaToken,
      })
      persist(
        {
          username,
          token: res.data.access,
          refresh: res.data.refresh,
          avatarUrl: res.data.avatar_url,
          themePreference: res.data.theme_preference,
        },
        rememberMe
      )
    },
    []
  )

  const loginWithOAuth = useCallback(
    async (
      provider: 'google' | 'github',
      payload?: {
        token?: string
        credential?: string
        access_token?: string
        code?: string
        email?: string
        name?: string
        avatar_url?: string
      }
    ) => {
      const res = await axios.post(`${BACKEND}/api/auth/oauth/`, {
        provider,
        token: payload?.token || payload?.credential || 'mock_token',
        ...payload,
      })
      persist(
        {
          username: res.data.username,
          token: res.data.access,
          refresh: res.data.refresh,
          avatarUrl: res.data.avatar_url,
          themePreference: res.data.theme_preference,
        },
        true
      )
      return res.data
    },
    []
  )

  const logout = useCallback(() => {
    setSessionExpired(false)
    clearSession()
    setUser(null)
  }, [])

  const dismissSessionExpired = useCallback(() => setSessionExpired(false), [])

  const updateProfileSession = useCallback(
    (newUsername: string) => {
      if (user) {
        const isLocalStorage = localStorage.getItem('auth_user') !== null
        persist({ ...user, username: newUsername }, isLocalStorage)
      }
    },
    [user]
  )

  const updateUserAvatar = useCallback(
    (avatarUrl: string | null) => {
      if (user) {
        const isLocalStorage = localStorage.getItem('auth_user') !== null
        persist({ ...user, avatarUrl: avatarUrl || undefined }, isLocalStorage)
      }
    },
    [user]
  )

  const exportUserData = useCallback(async () => {
    if (!user?.token) {
      throw new Error('You must be logged in to export your data.')
    }

    // Through `api`, so an expired access token is refreshed and the download
    // retried rather than failing outright.
    const response = await api.get('/api/account/export/', {
      responseType: 'blob',
    })

    const url = window.URL.createObjectURL(response.data)
    const link = document.createElement('a')

    link.href = url
    link.download = 'ai-resume-analyzer-data.json'
    document.body.appendChild(link)
    link.click()
    link.remove()

    window.URL.revokeObjectURL(url)
  }, [user])

  return {
    user,
    sessionExpired,
    dismissSessionExpired,
    signup,
    login,
    loginWithOAuth,
    logout,
    updateProfileSession,
    updateUserAvatar,
    exportUserData,
  }
}
