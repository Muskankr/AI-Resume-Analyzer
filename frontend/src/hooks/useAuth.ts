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

  const signup = useCallback(async (username: string, email: string, password: string, captchaToken?: string) => {
    await axios.post(`${BACKEND}/api/auth/signup/`, {
      username,
      email,
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
        refresh: res.data.refresh,
        is_verified: res.data.is_verified || false,
        avatarUrl: res.data.avatar_url,
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
          is_verified: res.data.is_verified || false,
          avatarUrl: res.data.avatar_url,
        },
        rememberMe
      )
    },
    []
  )

  const logout = useCallback(() => {
    setSessionExpired(false)
    clearSession()
    setUser(null)
  }, [])

  const refreshUserStatus = useCallback(async () => {
    if (!user) return
    try {
      const res = await axios.get(`${BACKEND}/api/auth/status/`, {
        headers: { Authorization: `Bearer ${user.token}` }
      })
      if (res.data.is_verified !== user.is_verified) {
        const updated = { ...user, is_verified: res.data.is_verified }
        const remember = localStorage.getItem('auth_user') !== null
        persist(updated, remember)
      }
    } catch (err) {
      console.error("Failed to refresh user status", err)
    }
  }, [user])

  const verifyEmail = useCallback(async (token: string) => {
    const res = await axios.post(`${BACKEND}/api/auth/verify-email/`, { token })
    if (user) {
      await refreshUserStatus()
    }
    return res.data
  }, [user, refreshUserStatus])

  const resendVerification = useCallback(async () => {
    if (!user) throw new Error("User is not authenticated")
    const res = await axios.post(`${BACKEND}/api/auth/resend-verification/`, {}, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
    return res.data
  }, [user])

  useEffect(() => {
    if (user && !user.is_verified) {
      const onFocus = () => {
        refreshUserStatus()
      }
      window.addEventListener('focus', onFocus)
      const interval = setInterval(refreshUserStatus, 10000)

      return () => {
        window.removeEventListener('focus', onFocus)
        clearInterval(interval)
      }
    }
  }, [user, refreshUserStatus])

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
    logout,
    verifyEmail,
    resendVerification,
    refreshUserStatus,
    updateProfileSession,
    updateUserAvatar,
    exportUserData,
  }
}
