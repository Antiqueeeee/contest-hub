import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api } from '@/api/client'

interface Contestant { id: number; name: string; phone: string }

const TOKEN_KEY = 'contest_hub_contestant_token'
const USER_KEY = 'contest_hub_contestant_user'

function setCToken(token: string) { sessionStorage.setItem(TOKEN_KEY, token) }
function clearCToken() { sessionStorage.removeItem(TOKEN_KEY) }
function getCToken() { return sessionStorage.getItem(TOKEN_KEY) }

export function contestantApi() {
  const token = getCToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const BASE = 'http://localhost:8000/api'
  return {
    get: <T,>(path: string): Promise<T> => fetch(`${BASE}${path}`, { headers }).then(r => r.ok ? r.json() : Promise.reject(r)),
    post: <T,>(path: string, body?: unknown): Promise<T> => fetch(`${BASE}${path}`, { method: 'POST', headers, body: body ? JSON.stringify(body) : undefined }).then(r => r.ok ? r.json() : Promise.reject(r)),
    put: <T,>(path: string, body?: unknown): Promise<T> => fetch(`${BASE}${path}`, { method: 'PUT', headers, body: body ? JSON.stringify(body) : undefined }).then(r => r.ok ? r.json() : Promise.reject(r)),
  }
}

interface AuthCtx {
  user: Contestant | null
  login: (phone: string, password: string) => Promise<void>
  register: (phone: string, password: string, name: string) => Promise<void>
  logout: () => void
  updateProfile: (name: string, phone: string) => Promise<void>
  isLoggedIn: boolean
  loading: boolean
}

const AuthContext = createContext<AuthCtx | null>(null)

function loadUser(): Contestant | null {
  try {
    const stored = sessionStorage.getItem(USER_KEY)
    return stored ? JSON.parse(stored) : null
  } catch { return null }
}

export function ContestantAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Contestant | null>(loadUser)
  const [loading, setLoading] = useState(false)

  const login = useCallback(async (phone: string, password: string) => {
    const res = await api.post<{ access_token: string; user: Contestant }>('/auth/contestant/login', { phone, password })
    setCToken(res.access_token)
    setUser(res.user)
    sessionStorage.setItem(USER_KEY, JSON.stringify(res.user))
  }, [])

  const register = useCallback(async (phone: string, password: string, name: string) => {
    const res = await api.post<{ access_token: string; user: Contestant }>('/auth/contestant/register', { phone, password, name })
    setCToken(res.access_token)
    setUser(res.user)
    sessionStorage.setItem(USER_KEY, JSON.stringify(res.user))
  }, [])

  const logout = useCallback(() => {
    clearCToken()
    setUser(null)
    sessionStorage.removeItem(USER_KEY)
  }, [])

  const updateProfile = useCallback(async (name: string, phone: string) => {
    const ca = contestantApi()
    const res = await ca.put<Contestant>('/contestant/profile', { name, phone })
    setUser(res)
    sessionStorage.setItem(USER_KEY, JSON.stringify(res))
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile, isLoggedIn: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useContestantAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useContestantAuth must be used within ContestantAuthProvider')
  return ctx
}

export { getCToken }
