import { useState, useCallback } from 'react'
import axios from 'axios'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

export interface AuthUser {
  username: string
  token: string
  avatarUrl?: string
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

  const signup = useCallback(
    async (username: string, password: string, captchaToken?: string, captchaAnswer?: string) => {
      // Signup now returns the token pair itself. It used to create the
      // account and then immediately call /auth/login/ with the same CAPTCHA
      // token -- which no longer works, because challenges are single-use, and
      // making someone solve two puzzles to create one account is not an
      // option. One round trip less, too.
      const res = await axios.post(`${BACKEND}/api/auth/signup/`, {
        username,
        password,
        captcha_token: captchaToken,
        captcha_answer: captchaAnswer,
      })
      persist({ username, token: res.data.access }, true)
    },
    []
  )

  const login = useCallback(
    async (
      username: string,
      password: string,
      rememberMe: boolean = true,
      captchaToken?: string,
      captchaAnswer?: string
    ) => {
      const res = await axios.post(`${BACKEND}/api/auth/login/`, {
        username,
        password,
        captcha_token: captchaToken,
        captcha_answer: captchaAnswer,
      })
      persist({ username, token: res.data.access, avatarUrl: res.data.avatar_url }, rememberMe)
    },
    []
  )

  const logout = useCallback(() => persist(null), [])

  const updateProfileSession = useCallback((newUsername: string) => {
    if (user) {
      const isLocalStorage = localStorage.getItem('auth_user') !== null
      const updatedUser = { ...user, username: newUsername }
      persist(updatedUser, isLocalStorage)
    }
  }, [user])

  const updateUserAvatar = useCallback((avatarUrl: string | null) => {
    if (user) {
      const isLocalStorage = localStorage.getItem('auth_user') !== null
      const updatedUser = { ...user, avatarUrl: avatarUrl || undefined }
      persist(updatedUser, isLocalStorage)
    }
  }, [user])

  const exportUserData = useCallback(async () => {
    if (!user?.token) {
      throw new Error('You must be logged in to export your data.')
    }

    const response = await axios.get(`${BACKEND}/api/account/export/`, {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
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

  return { user, signup, login, logout, updateProfileSession, updateUserAvatar, exportUserData }
}
