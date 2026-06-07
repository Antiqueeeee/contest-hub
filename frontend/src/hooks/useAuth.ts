import { useState, useEffect, useCallback } from 'react'
import { api, setToken, clearToken } from '@/api/client'

interface User {
  id: number
  username: string
  name: string
  phone: string
  status: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Check stored session on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('contest_hub_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch { /**/ }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post<{ access_token: string; user: User }>('/auth/login', { username, password })
    setToken(res.access_token)
    setUser(res.user)
    sessionStorage.setItem('contest_hub_user', JSON.stringify(res.user))
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    sessionStorage.removeItem('contest_hub_user')
  }, [])

  return { user, login, logout, isLoggedIn: !!user, loading }
}
