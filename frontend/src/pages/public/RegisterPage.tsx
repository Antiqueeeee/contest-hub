import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { contests, getContestGroups, getContestFields } from '@/mock/data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Clock } from 'lucide-react'

export default function RegisterPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const contest = contests.find(c => c.id === Number(id))
  const groups = contest ? getContestGroups(contest.id) : []
  const fields = contest ? getContestFields(contest.id) : []

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [groupId, setGroupId] = useState('')
  const [customValues, setCustomValues] = useState<Record<number, string>>({})
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  if (!contest || contest.status !== 'open') {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{contest ? '该赛事当前不可报名' : '赛事不存在'}</p>
        <Link to="/"><Button variant="link" className="mt-2">返回首页</Button></Link>
      </div>
    )
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name || name.length < 2 || name.length > 20) e.name = '请输入 2-20 位的真实姓名'
    if (!phone || !/^1\d{10}$/.test(phone)) e.phone = '请输入正确的 11 位手机号'
    if (!groupId) e.groupId = '请选择参赛组别'
    fields.filter(f => f.isRequired).forEach(f => {
      if (!customValues[f.id]?.trim()) e[`custom_${f.id}`] = `请填写${f.fieldName}`
    })
    if (!privacyAgreed) e.privacy = '请阅读并同意隐私政策'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      navigate(`/contests/${contest.id}/register/success`, {
        state: {
          registrationNumber: `C${String(contest.id).padStart(3, '0')}-20260607-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
          contestTitle: contest.title,
          name,
          group: groups.find(g => String(g.id) === groupId)?.name ?? groupId,
        }
      })
    }, 800)
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link to={`/contests/${contest.id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />返回赛事详情
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{contest.title}</CardTitle>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            报名截止：{contest.registrationEnd.split('T')[0]}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>姓名 <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={e => { setName(e.target.value); setErrors({}) }} placeholder="请输入真实姓名" />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1">
            <Label>手机号 <span className="text-destructive">*</span></Label>
            <Input value={phone} onChange={e => { setPhone(e.target.value); setErrors({}) }} placeholder="请输入 11 位手机号" maxLength={11} />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
          </div>
          <div className="space-y-1">
            <Label>参赛组别 <span className="text-destructive">*</span></Label>
            <Select value={groupId} onValueChange={v => { setGroupId(v ?? ''); setErrors({}) }}>
              <SelectTrigger><SelectValue placeholder="请选择组别" /></SelectTrigger>
              <SelectContent>
                {groups.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.name}{g.maxParticipants > 0 ? ` (限${g.maxParticipants}人)` : ''}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.groupId && <p className="text-sm text-destructive">{errors.groupId}</p>}
          </div>

          {fields.map(f => (
            <div key={f.id} className="space-y-1">
              <Label>{f.fieldName} {f.isRequired && <span className="text-destructive">*</span>}</Label>
              {f.fieldType === 'textarea' ? (
                <Textarea value={customValues[f.id] ?? ''} onChange={e => setCustomValues(prev => ({ ...prev, [f.id]: e.target.value }))} />
              ) : f.fieldType === 'select' && f.options ? (
                <Select value={customValues[f.id] ?? ''} onValueChange={v => setCustomValues(prev => ({ ...prev, [f.id]: v ?? '' }))}>
                  <SelectTrigger><SelectValue placeholder="请选择" /></SelectTrigger>
                  <SelectContent>{f.options.map((o, i) => <SelectItem key={i} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input type={f.fieldType === 'number' ? 'number' : 'text'} value={customValues[f.id] ?? ''} onChange={e => setCustomValues(prev => ({ ...prev, [f.id]: e.target.value }))} />
              )}
              {errors[`custom_${f.id}`] && <p className="text-sm text-destructive">{errors[`custom_${f.id}`]}</p>}
            </div>
          ))}

          <div className="flex items-start gap-2 pt-2">
            <Checkbox id="privacy" checked={privacyAgreed} onCheckedChange={v => { setPrivacyAgreed(!!v); setErrors({}) }} />
            <Label htmlFor="privacy" className="text-sm text-muted-foreground cursor-pointer">
              我已阅读并同意《隐私政策》，同意平台收集和使用我的个人信息用于本次赛事报名。
            </Label>
          </div>
          {errors.privacy && <p className="text-sm text-destructive">{errors.privacy}</p>}

          <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '提交中...' : '提交报名'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
