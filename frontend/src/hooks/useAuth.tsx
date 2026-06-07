import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { api, setToken, clearToken } from '@/api/client'

interface User {
  id: number
  username: string
  name: string
  phone: string
  status: string
}

const USER_KEY = 'contest_hub_admin_user'

function loadUser(): User | null {
  try {
    const stored = sessionStorage.getItem(USER_KEY)
    return stored ? JSON.parse(stored) : null
  } catch { return null }
}

interface AuthCtx {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isLoggedIn: boolean
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser)

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post<{ access_token: string; user: User }>('/auth/login', { username, password })
    setToken(res.access_token)
    setUser(res.user)
    sessionStorage.setItem(USER_KEY, JSON.stringify(res.user))
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    sessionStorage.removeItem(USER_KEY)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AdminAuthProvider')
  return ctx
}
