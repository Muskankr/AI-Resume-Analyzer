import { useState, useCallback } from 'react'
import axios from 'axios'

import { BACKEND_URL } from '../config'

export interface AuthUser {
  username: string
  token: string
}

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('auth_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(loadUser)

  const persist = (u: AuthUser | null) => {
    setUser(u)
    try {
      if (u) localStorage.setItem('auth_user', JSON.stringify(u))
      else localStorage.removeItem('auth_user')
    } catch {
      /* ignore */
    }
  }

  const signup = useCallback(async (username: string, password: string) => {
    await axios.post(`${BACKEND_URL}/api/auth/signup/`, { username, password })
    const res = await axios.post(`${BACKEND_URL}/api/auth/login/`, { username, password })
    persist({ username, token: res.data.access })
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const res = await axios.post(`${BACKEND_URL}/api/auth/login/`, { username, password })
    persist({ username, token: res.data.access })
  }, [])

  const logout = useCallback(() => persist(null), [])
  return { user, signup, login, logout }
}
