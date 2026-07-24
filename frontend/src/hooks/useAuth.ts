import { useState, useCallback } from 'react'
import axios from 'axios'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

export interface AuthUser {
  username: string
  token: string
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

  const signup = useCallback(async (username: string, password: string) => {
    await axios.post(`${BACKEND}/api/auth/signup/`, { username, password })
    const res = await axios.post(`${BACKEND}/api/auth/login/`, { username, password })
    persist({ username, token: res.data.access }, true)
  }, [])

  const login = useCallback(async (username: string, password: string, rememberMe: boolean = true) => {
    const res = await axios.post(`${BACKEND}/api/auth/login/`, { username, password })
    persist({ username, token: res.data.access }, rememberMe)
  }, [])

  const logout = useCallback(() => persist(null), [])
  return { user, signup, login, logout }
}
