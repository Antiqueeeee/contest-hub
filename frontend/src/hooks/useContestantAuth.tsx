import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { api, BASE_URL } from '@/api/client'

interface Contestant { id: number; name: string; email: string; id_number: string; organization: string | null }

const TOKEN_KEY = 'contest_hub_contestant_token'
const USER_KEY = 'contest_hub_contestant_user'

function setCToken(token: string) { sessionStorage.setItem(TOKEN_KEY, token) }
function clearCToken() { sessionStorage.removeItem(TOKEN_KEY) }
function getCToken() { return sessionStorage.getItem(TOKEN_KEY) }

async function caRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getCToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export function contestantApi() {
  return {
    get: <T,>(path: string): Promise<T> => caRequest<T>(path),
    post: <T,>(path: string, body?: unknown): Promise<T> => caRequest<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
    put: <T,>(path: string, body?: unknown): Promise<T> => caRequest<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  }
}

interface AuthCtx {
  user: Contestant | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string, idNumber: string, organization: string) => Promise<void>
  logout: () => void
  updateProfile: (name: string, email: string, organization: string) => Promise<void>
  isLoggedIn: boolean
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

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ access_token: string; user: Contestant }>('/auth/contestant/login', { email, password })
    setCToken(res.access_token)
    setUser(res.user)
    sessionStorage.setItem(USER_KEY, JSON.stringify(res.user))
  }, [])

  const register = useCallback(async (email: string, password: string, name: string, idNumber: string, organization: string) => {
    const res = await api.post<{ access_token: string; user: Contestant }>('/auth/contestant/register', { email, password, name, id_number: idNumber, organization: organization || null })
    setCToken(res.access_token)
    setUser(res.user)
    sessionStorage.setItem(USER_KEY, JSON.stringify(res.user))
  }, [])

  const logout = useCallback(() => {
    clearCToken()
    setUser(null)
    sessionStorage.removeItem(USER_KEY)
  }, [])

  const updateProfile = useCallback(async (name: string, email: string, organization: string) => {
    const ca = contestantApi()
    const res = await ca.put<Contestant>('/contestant/profile', { name, email, organization })
    setUser(res)
    sessionStorage.setItem(USER_KEY, JSON.stringify(res))
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile, isLoggedIn: !!user }}>
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
