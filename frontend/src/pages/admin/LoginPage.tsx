import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy } from 'lucide-react'

const bgGradient = { background: 'linear-gradient(135deg, hsl(243 75% 59%) 0%, hsl(271 81% 56%) 100%)' }

export default function LoginPage() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('123456')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login, isLoggedIn } = useAuth()
  const navigate = useNavigate()

  if (isLoggedIn) {
    navigate('/admin', { replace: true })
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await login(username, password)
      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-primary/10" />
        <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-purple-500/10" />
      </div>

      <Card className="w-[400px] border-0 shadow-xl relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center shadow-lg" style={bgGradient}>
              <Trophy className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold">欢迎回来</CardTitle>
          <CardDescription>登录管理员账号</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">用户名</Label>
              <Input id="username" value={username} onChange={e => { setUsername(e.target.value); setError('') }} placeholder="请输入用户名" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">密码</Label>
              <Input id="password" type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="请输入密码" className="h-10" />
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 p-2.5 rounded-lg">{error}</p>}
            <Button type="submit" className="w-full h-10" style={bgGradient} disabled={submitting}>
              {submitting ? '登录中...' : '登录'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">演示账号: admin / 任意密码</p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
