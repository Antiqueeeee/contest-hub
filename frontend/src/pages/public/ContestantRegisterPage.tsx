import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useContestantAuth } from '@/hooks/useContestantAuth'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy } from 'lucide-react'

const bgGradient = { background: 'linear-gradient(135deg, hsl(243 75% 59%), hsl(271 81% 56%))' }

function passwordValid(pwd: string) {
  if (pwd.length < 8 || pwd.length > 64) return false
  const types = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(pwd)).length
  return types >= 2
}

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [organization, setOrganization] = useState('')
  const [password, setPassword] = useState('')
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // 注册开关：null=加载中（不渲染表单，避免关闭时闪现）；false=已关闭
  const [regEnabled, setRegEnabled] = useState<boolean | null>(null)
  const { register, isLoggedIn } = useContestantAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoggedIn) navigate('/', { replace: true })
  }, [isLoggedIn, navigate])

  useEffect(() => {
    api.get<{ enabled: boolean }>('/public/settings/registration')
      .then(r => setRegEnabled(r.enabled))
      .catch(() => setRegEnabled(true)) // 拉取失败按开放处理，后端 403 兜底
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('')
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('请输入正确的邮箱地址'); setSubmitting(false); return }
    if (!name || name.length < 2) { setError('请输入真实姓名'); setSubmitting(false); return }
    if (!passwordValid(password)) { setError('密码需8-64位，且包含大写字母/小写字母/数字/符号中至少两种'); setSubmitting(false); return }
    if (!privacyAgreed) { setError('请先阅读并同意《隐私政策》'); setSubmitting(false); return }
    try { await register(email, password, name, organization, privacyAgreed); navigate('/') }
    catch (err: any) { setError(err instanceof Error ? err.message : '注册失败') }
    finally { setSubmitting(false) }
  }

  if (regEnabled === null) return null

  if (!regEnabled) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Card className="w-[400px] border-0 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center shadow-lg" style={bgGradient}>
                <Trophy className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold">注册暂未开放</CardTitle>
            <CardDescription>平台当前未开放选手注册，如有疑问请通过「联系我们」页面联系管理员</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">已有账号？<Link to="/login" className="text-primary hover:underline">立即登录</Link></p>
          </CardContent>
        </Card>
      </div>
    )
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
            <div className="space-y-1.5"><Label>邮箱（登录账号）<span className="text-destructive">*</span></Label><Input value={email} onChange={e => { setEmail(e.target.value); setError('') }} placeholder="用于登录和接收通知" className="h-10" /></div>
            <div className="space-y-1.5"><Label>真实姓名<span className="text-destructive">*</span></Label><Input value={name} onChange={e => { setName(e.target.value); setError('') }} placeholder="报名和成绩单上显示的名称" maxLength={20} className="h-10" /></div>
            <div className="space-y-1.5"><Label>学校/单位</Label><Input value={organization} onChange={e => { setOrganization(e.target.value); setError('') }} placeholder="选填" maxLength={200} className="h-10" /></div>
            <div className="space-y-1.5"><Label>登录密码 <span className="text-destructive">*</span></Label><Input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="8-64位，含字母/数字/符号中至少两种" className="h-10" /></div>
            <div className="flex items-start gap-2">
              <Checkbox id="privacy" checked={privacyAgreed} onCheckedChange={v => { setPrivacyAgreed(!!v); setError('') }} />
              <Label htmlFor="privacy" className="text-sm text-muted-foreground cursor-pointer leading-5">
                我已阅读并同意<Link to="/privacy" target="_blank" className="text-primary hover:underline">《隐私政策》</Link>
              </Label>
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 p-2.5 rounded-lg">{error}</p>}
            <Button type="submit" className="w-full h-10 border-0" style={bgGradient} disabled={submitting}>{submitting ? '注册中...' : '注册'}</Button>
            <p className="text-xs text-muted-foreground text-center">已有账号？<Link to="/login" className="text-primary hover:underline">立即登录</Link></p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
