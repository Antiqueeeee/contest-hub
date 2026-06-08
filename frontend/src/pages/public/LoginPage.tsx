import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useContestantAuth } from '@/hooks/useContestantAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy } from 'lucide-react'

const bgGradient = { background: 'linear-gradient(135deg, hsl(243 75% 59%), hsl(271 81% 56%))' }

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login, isLoggedIn } = useContestantAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoggedIn) navigate('/', { replace: true })
  }, [isLoggedIn, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('')
    try { await login(email, password); navigate('/') }
    catch (err: any) { setError(err instanceof Error ? err.message : (err.json ? (await err.json()).detail : '登录失败')) }
    finally { setSubmitting(false) }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-[400px] border-0 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center shadow-lg" style={bgGradient}>
              <Trophy className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold">选手登录</CardTitle>
          <CardDescription>登录后可查看参赛历史和成绩</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>邮箱</Label><Input value={email} onChange={e => { setEmail(e.target.value); setError('') }} placeholder="请输入注册邮箱" className="h-10" /></div>
            <div className="space-y-1.5"><Label>密码</Label><Input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="请输入密码" className="h-10" /></div>
            {error && <p className="text-sm text-destructive bg-destructive/10 p-2.5 rounded-lg">{error}</p>}
            <Button type="submit" className="w-full h-10 border-0" style={bgGradient} disabled={submitting}>{submitting ? '登录中...' : '登录'}</Button>
            <p className="text-xs text-muted-foreground text-center">还没有账号？<Link to="/register" className="text-primary hover:underline">立即注册</Link></p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
