import { useState, useCallback, useEffect } from 'react'
import axios from 'axios'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

export interface AuthUser {
  username: string
  token: string
  is_verified: boolean
}

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(loadUser)

  const persist = (u: AuthUser | null, remember: boolean = true) => {
    setUser(u)
    try {
      if (u) {
        if (remember) {
          localStorage.setItem('auth_user', JSON.stringify(u))
          sessionStorage.removeItem('auth_user')
        } else {
          sessionStorage.setItem('auth_user', JSON.stringify(u))
          localStorage.removeItem('auth_user')
        }
      } else {
        localStorage.removeItem('auth_user')
        sessionStorage.removeItem('auth_user')
      }
    } catch {
      /* ignore */
    }
  }

  const signup = useCallback(async (username: string, email: string, password: string) => {
    await axios.post(`${BACKEND}/api/auth/signup/`, { username, email, password })
    const res = await axios.post(`${BACKEND}/api/auth/login/`, { username, password })
    persist({ username, token: res.data.access, is_verified: res.data.is_verified || false }, true)
  }, [])

  const login = useCallback(async (username: string, password: string, rememberMe: boolean = true) => {
    const res = await axios.post(`${BACKEND}/api/auth/login/`, { username, password })
    persist({ username, token: res.data.access, is_verified: res.data.is_verified || false }, rememberMe)
  }, [])

  const logout = useCallback(() => persist(null), [])

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

  return { user, signup, login, logout, verifyEmail, resendVerification, refreshUserStatus }
}
