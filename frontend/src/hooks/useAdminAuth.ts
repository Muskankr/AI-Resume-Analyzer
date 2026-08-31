import { useState, useEffect } from 'react'

export interface UserRoleInfo {
  username: string
  role: 'admin' | 'maintainer' | 'user'
  isAuthenticated: boolean
}

/**
 * Hook to manage and verify admin / maintainer authorization state
 */
export function useAdminAuth() {
  const [user, setUser] = useState<UserRoleInfo>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ai_resume_analyzer_admin_role')
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          // ignore
        }
      }
    }
    return {
      username: 'admin@system.local',
      role: 'admin',
      isAuthenticated: true,
    }
  })

  const setRole = (role: 'admin' | 'maintainer' | 'user', username = 'admin@system.local') => {
    const updated: UserRoleInfo = {
      username,
      role,
      isAuthenticated: role !== 'user',
    }
    setUser(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai_resume_analyzer_admin_role', JSON.stringify(updated))
    }
  }

  const isAdminOrMaintainer = user.role === 'admin' || user.role === 'maintainer'

  return {
    user,
    setRole,
    isAdminOrMaintainer,
  }
}
