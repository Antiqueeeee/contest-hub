import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '@/api/client'
import { useContestantAuth, getCToken } from '@/hooks/useContestantAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Clock } from 'lucide-react'

interface Contest { id: number; title: string; status: string; registration_end: string; groups: { id: number; name: string; max_participants: number }[]; fields: { id: number; field_name: string; field_type: string; is_required: boolean; options: string[] | null }[] }

export default function ContestRegisterPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isLoggedIn } = useContestantAuth()
  const [contest, setContest] = useState<Contest | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [groupId, setGroupId] = useState('')
  const [customValues, setCustomValues] = useState<Record<number, string>>({})
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && !isLoggedIn) { navigate(`/login?redirect=/contests/${id}/register`); return }
    api.get<Contest>(`/public/contests/${id}`).then(c => { setContest(c); setLoading(false) }).catch(() => setLoading(false))
    if (isLoggedIn && user) { setName(user.name); setPhone(user.phone) }
  }, [id, isLoggedIn, user, loading, navigate])

  if (loading) return <div className="text-center py-12 text-muted-foreground">加载中...</div>
  if (!contest || contest.status !== 'open') return <div className="text-center py-12"><p className="text-muted-foreground">{contest ? '该赛事当前不可报名' : '赛事不存在'}</p><Link to="/"><Button variant="link" className="mt-2">返回首页</Button></Link></div>

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name || name.length < 2 || name.length > 20) e.name = '请输入 2-20 位的真实姓名'
    if (!phone || !/^1\d{10}$/.test(phone)) e.phone = '请输入正确的 11 位手机号'
    if (!privacyAgreed) e.privacy = '请阅读并同意隐私政策'
    contest.fields?.filter(f => f.is_required).forEach(f => { if (!customValues[f.id]?.trim()) e[`f${f.id}`] = `请填写${f.field_name}` })
    setErrors(e); return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return; setSubmitting(true)
    try {
      const cf: Record<string, string> = {}
      contest.fields?.forEach(f => { if (customValues[f.id]) cf[f.field_name] = customValues[f.id] })
      const token = getCToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`http://localhost:8000/api/public/contests/${contest.id}/register`, {
        method: 'POST', headers,
        body: JSON.stringify({ contest_id: contest.id, group_id: groupId ? Number(groupId) : null, name, phone, custom_fields: cf, privacy_agreed: privacyAgreed }),
      }).then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail || '报名失败') }))
      navigate(`/contests/${contest.id}/register/success`, { state: { registrationNumber: res.registration_number, contestTitle: contest.title, name } })
    } catch (e) { alert(e instanceof Error ? e.message : '报名失败') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link to={`/contests/${contest.id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-4 w-4 mr-1" />返回赛事详情</Link>
      <Card><CardHeader><CardTitle className="text-lg">{contest.title}</CardTitle><div className="flex items-center gap-1 text-sm text-muted-foreground"><Clock className="h-3 w-3" />报名截止：{contest.registration_end?.split('T')[0]}</div></CardHeader>
        <CardContent className="space-y-4">
          {isLoggedIn ? (
            <div className="p-3 bg-accent rounded-lg text-sm text-accent-foreground">已使用账号「{user?.name}」的信息自动填写</div>
          ) : (
            <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
              已有账号？<Link to="/login" className="text-primary hover:underline ml-1">登录</Link>后可自动填写信息并保存参赛记录
            </div>
          )}
          <div className="space-y-1"><Label>姓名 <span className="text-destructive">*</span></Label><Input value={name} onChange={e => { setName(e.target.value); setErrors({}) }} placeholder="请输入真实姓名" disabled={isLoggedIn} />{errors.name && <p className="text-sm text-destructive">{errors.name}</p>}</div>
          <div className="space-y-1"><Label>手机号 <span className="text-destructive">*</span></Label><Input value={phone} onChange={e => { setPhone(e.target.value); setErrors({}) }} placeholder="请输入 11 位手机号" maxLength={11} disabled={isLoggedIn} />{errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}</div>
          {contest.groups?.length > 0 && (
            <div className="space-y-1"><Label>参赛组别</Label>
              <Select value={groupId} onValueChange={(v) => { setGroupId(v ?? ''); setErrors({}) }}>
                <SelectTrigger><SelectValue placeholder="请选择组别" /></SelectTrigger>
                <SelectContent>{contest.groups.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.name}{g.max_participants > 0 ? ` (限${g.max_participants}人)` : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {contest.fields?.map(f => (
            <div key={f.id} className="space-y-1"><Label>{f.field_name} {f.is_required && <span className="text-destructive">*</span>}</Label>
              <Input value={customValues[f.id] ?? ''} onChange={e => setCustomValues(prev => ({ ...prev, [f.id]: e.target.value }))} />
              {errors[`f${f.id}`] && <p className="text-sm text-destructive">{errors[`f${f.id}`]}</p>}
            </div>
          ))}
          <div className="flex items-start gap-2 pt-2"><Checkbox id="privacy" checked={privacyAgreed} onCheckedChange={v => { setPrivacyAgreed(!!v); setErrors({}) }} /><Label htmlFor="privacy" className="text-sm text-muted-foreground cursor-pointer">我已阅读并同意《隐私政策》</Label></div>
          {errors.privacy && <p className="text-sm text-destructive">{errors.privacy}</p>}
          <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting}>{submitting ? '提交中...' : '提交报名'}</Button>
        </CardContent></Card>
    </div>
  )
}
