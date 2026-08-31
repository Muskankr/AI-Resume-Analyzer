import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'

type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()

  // Initialize theme from user preference, then localStorage, then default to system
  const [theme, setThemeState] = useState<Theme>(() => {
    // If the user object from login has a theme preference, use it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (user && (user as any).themePreference) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (user as any).themePreference as Theme
    }

    try {
      const saved = localStorage.getItem('theme')
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved
      }
    } catch {
      // ignore
    }
    return 'system'
  })

  // Calculate the actual applied theme based on preference and system state
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')

  const getSystemTheme = (): ResolvedTheme => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  }

  const updateResolvedTheme = useCallback(() => {
    if (theme === 'system') {
      setResolvedTheme(getSystemTheme())
    } else {
      setResolvedTheme(theme)
    }
  }, [theme])

  // Update resolved theme when the theme setting changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateResolvedTheme()
  }, [theme, updateResolvedTheme])

  // Listen for system theme changes if set to system
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => updateResolvedTheme()
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme, updateResolvedTheme])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme)
  }, [resolvedTheme])

  const setTheme = useCallback(
    async (newTheme: Theme) => {
      setThemeState(newTheme)
      try {
        localStorage.setItem('theme', newTheme)
      } catch {
        // ignore
      }

      if (user) {
        try {
          await api.patch('/api/profile/', { theme_preference: newTheme })
        } catch (error) {
          console.error('Failed to sync theme preference:', error)
        }
      }
    },
    [user]
  )

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
  }, [resolvedTheme, setTheme])

  // Sync with user object if it changes (e.g., just logged in)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (user && (user as any).themePreference && (user as any).themePreference !== theme) {
      // eslint-disable-next-line react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any
      setThemeState((user as any).themePreference as Theme)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        localStorage.setItem('theme', (user as any).themePreference)
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
