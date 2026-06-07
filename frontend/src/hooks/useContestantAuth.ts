import { useState, useEffect, useCallback } from 'react'
import { api } from '@/api/client'

interface Contestant {
  id: number
  name: string
  phone: string
}

const TOKEN_KEY = 'contest_hub_contestant_token'
const USER_KEY = 'contest_hub_contestant_user'

// Separate token management for contestant (doesn't conflict with admin JWT)
function setCToken(token: string) { sessionStorage.setItem(TOKEN_KEY, token) }
function clearCToken() { sessionStorage.removeItem(TOKEN_KEY) }
function getCToken() { return sessionStorage.getItem(TOKEN_KEY) }

// Override api client's Authorization header for contestant requests
function contestantApi() {
  const token = getCToken()
  return {
    get: <T>(path: string) => fetch(`${'http://localhost:8000/api'}${path}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    }).then(r => r.ok ? r.json() : Promise.reject(r)),
    post: <T>(path: string, body?: unknown) => fetch(`${'http://localhost:8000/api'}${path}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).then(r => r.ok ? r.json() : Promise.reject(r)),
    put: <T>(path: string, body?: unknown) => fetch(`${'http://localhost:8000/api'}${path}`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).then(r => r.ok ? r.json() : Promise.reject(r)),
  }
}

export function useContestantAuth() {
  const [user, setUser] = useState<Contestant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = sessionStorage.getItem(USER_KEY)
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch { /* */ }
    }
    setLoading(false)
  }, [])

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

  return { user, login, register, logout, updateProfile, isLoggedIn: !!user, loading }
}

export { contestantApi, getCToken }
