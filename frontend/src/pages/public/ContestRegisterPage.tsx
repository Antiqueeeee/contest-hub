import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '@/api/client'
import { useContestantAuth, getCToken, contestantApi } from '@/hooks/useContestantAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Clock } from 'lucide-react'

interface Contest { id: number; title: string; status: string; registration_start: string; registration_end: string; groups: { id: number; name: string; max_participants: number }[]; fields: { id: number; field_name: string; field_type: string; is_required: boolean; options: string[] | null }[] }

export default function ContestRegisterPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isLoggedIn } = useContestantAuth()
  const [contest, setContest] = useState<Contest | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [idNumber, setIdNumber] = useState(''); const [organization, setOrganization] = useState(''); const [groupId, setGroupId] = useState('')
  const [customValues, setCustomValues] = useState<Record<number, string>>({})
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && !isLoggedIn) { navigate(`/login?redirect=/contests/${id}/register`); return }
    api.get<Contest>(`/public/contests/${id}`).then(c => { setContest(c); setLoading(false) }).catch(() => setLoading(false))
    if (isLoggedIn && user) {
      setName(user.name); setEmail(user.email)
      // Fetch latest profile to ensure id_number is available (handles stale sessionStorage)
      const ca = contestantApi()
      ca.get<any>('/contestant/profile').then(p => {
        setIdNumber(p.id_number || ''); setOrganization(p.organization || '')
      }).catch(() => {
        // Fallback to sessionStorage data
        setIdNumber(user.id_number || ''); setOrganization(user.organization || '')
      })
    }
  }, [id, isLoggedIn, user, loading, navigate])

  if (loading) return <div className="text-center py-12 text-muted-foreground">加载中...</div>
  if (!contest || contest.status !== 'open') return <div className="text-center py-12"><p className="text-muted-foreground">{contest ? '该赛事当前不可报名' : '赛事不存在'}</p><Link to="/"><Button variant="link" className="mt-2">返回首页</Button></Link></div>

  const now = new Date()
  if (contest.registration_start && now < new Date(contest.registration_start)) return <div className="text-center py-12"><p className="text-muted-foreground">报名尚未开始</p><Link to={`/contests/${contest.id}`}><Button variant="link" className="mt-2">返回赛事详情</Button></Link></div>
  if (contest.registration_end && now > new Date(contest.registration_end)) return <div className="text-center py-12"><p className="text-muted-foreground">报名已截止</p><Link to={`/contests/${contest.id}`}><Button variant="link" className="mt-2">返回赛事详情</Button></Link></div>

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name || name.length < 2 || name.length > 20) e.name = '请输入 2-20 位的真实姓名'
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = '请输入正确的邮箱地址'
    if (!idNumber || !/^\d{17}[\dXx]$/.test(idNumber)) e.idNumber = '请输入正确的18位身份证号'
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
        body: JSON.stringify({ contest_id: contest.id, group_id: groupId ? Number(groupId) : null, name, email, id_number: idNumber, organization: organization || null, custom_fields: cf, privacy_agreed: privacyAgreed }),
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
          <div className="space-y-1"><Label>邮箱 <span className="text-destructive">*</span></Label><Input value={email} onChange={e => { setEmail(e.target.value); setErrors({}) }} placeholder="请输入邮箱地址" disabled={isLoggedIn} />{errors.email && <p className="text-sm text-destructive">{errors.email}</p>}</div>
          <div className="space-y-1"><Label>身份证号 <span className="text-destructive">*</span></Label><Input value={idNumber} onChange={e => { setIdNumber(e.target.value); setErrors({}) }} placeholder="18位身份证号码" maxLength={18} disabled={isLoggedIn} />{errors.idNumber && <p className="text-sm text-destructive">{errors.idNumber}</p>}</div>
          <div className="space-y-1"><Label>学校/单位</Label><Input value={organization} onChange={e => { setOrganization(e.target.value); setErrors({}) }} placeholder="选填" maxLength={200} /></div>
          {contest.groups?.length > 0 && (
            <div className="space-y-1"><Label>参赛组别</Label>
              <select value={groupId} onChange={e => { setGroupId(e.target.value); setErrors({}) }} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">请选择组别</option>
                {contest.groups.map(g => <option key={g.id} value={String(g.id)}>{g.name}{g.max_participants > 0 ? ` (限${g.max_participants}人)` : ''}</option>)}
              </select>
            </div>
          )}
          {contest.fields?.map(f => (
            <div key={f.id} className="space-y-1"><Label>{f.field_name} {f.is_required && <span className="text-destructive">*</span>}</Label>
              {f.field_type === 'select' && f.options?.length ? (
                <select value={customValues[f.id] ?? ''} onChange={e => setCustomValues(prev => ({ ...prev, [f.id]: e.target.value }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">请选择{f.field_name}</option>
                  {f.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : f.field_type === 'textarea' ? (
                <Textarea value={customValues[f.id] ?? ''} onChange={e => setCustomValues(prev => ({ ...prev, [f.id]: e.target.value }))} />
              ) : (
                <Input
                  type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'}
                  value={customValues[f.id] ?? ''}
                  onChange={e => setCustomValues(prev => ({ ...prev, [f.id]: e.target.value }))}
                />
              )}
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
