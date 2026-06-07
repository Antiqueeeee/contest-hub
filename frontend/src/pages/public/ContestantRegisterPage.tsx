import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useContestantAuth } from '@/hooks/useContestantAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy } from 'lucide-react'

const bgGradient = { background: 'linear-gradient(135deg, hsl(243 75% 59%), hsl(271 81% 56%))' }

export default function RegisterPage() {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { register, isLoggedIn } = useContestantAuth()
  const navigate = useNavigate()

  if (isLoggedIn) { navigate('/', { replace: true }); return null }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('')
    if (!/^1\d{10}$/.test(phone)) { setError('请输入正确的11位手机号'); setSubmitting(false); return }
    if (!name || name.length < 2) { setError('请输入真实姓名'); setSubmitting(false); return }
    if (password.length < 6) { setError('密码至少6位'); setSubmitting(false); return }
    try { await register(phone, password, name); navigate('/') }
    catch (err: any) { setError(err instanceof Error ? err.message : '注册失败') }
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
          <CardTitle className="text-xl font-bold">选手注册</CardTitle>
          <CardDescription>注册后可查看参赛历史和成绩</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>手机号 <span className="text-destructive">*</span></Label><Input value={phone} onChange={e => { setPhone(e.target.value); setError('') }} placeholder="将作为登录账号" maxLength={11} className="h-10" /></div>
            <div className="space-y-1.5"><Label>姓名 <span className="text-destructive">*</span></Label><Input value={name} onChange={e => { setName(e.target.value); setError('') }} placeholder="请输入真实姓名" maxLength={20} className="h-10" /></div>
            <div className="space-y-1.5"><Label>密码 <span className="text-destructive">*</span></Label><Input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="6-20位密码" className="h-10" /></div>
            {error && <p className="text-sm text-destructive bg-destructive/10 p-2.5 rounded-lg">{error}</p>}
            <Button type="submit" className="w-full h-10 border-0" style={bgGradient} disabled={submitting}>{submitting ? '注册中...' : '注册'}</Button>
            <p className="text-xs text-muted-foreground text-center">已有账号？<Link to="/login" className="text-primary hover:underline">立即登录</Link></p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
