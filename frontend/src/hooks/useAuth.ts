import { useState, useCallback } from 'react'
import type { User } from '@/mock/types'
import { users } from '@/mock/data'

const AUTH_KEY = 'contest_hub_auth'

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = sessionStorage.getItem(AUTH_KEY)
      return stored ? (JSON.parse(stored) as User) : null
    } catch {
      return null
    }
  })

  function login(username: string, password: string): { ok: boolean; error?: string } {
    const found = users.find(u => u.username === username)
    if (!found) return { ok: false, error: '用户名不存在' }
    if (found.status === 'disabled') return { ok: false, error: '账号已被禁用' }
    if (!password) return { ok: false, error: '请输入密码' }
    setUser(found)
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(found))
    return { ok: true }
  }

  const logout = useCallback(() => {
    setUser(null)
    sessionStorage.removeItem(AUTH_KEY)
  }, [])

  return { user, login, logout, isLoggedIn: !!user }
}
