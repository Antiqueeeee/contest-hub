import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '@/api/client'
import { useContestantAuth, contestantApi } from '@/hooks/useContestantAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Clock } from 'lucide-react'

interface Contest { id: number; title: string; status: string; registration_start: string; registration_end: string; minor_policy: string; start_date: string; groups: { id: number; name: string; max_participants: number }[]; fields: { id: number; field_name: string; field_type: string; is_required: boolean; options: string[] | null }[] }

// 与后端 app/utils/minor.py 一致：<14 需监护人同意，<18 需本人声明
const GUARDIAN_LIMIT = 14
const ADULT_LIMIT = 18

// 纯字符串解析比较，避免 new Date() 的 UTC/本地时区差一天问题
function parseYmd(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (!m) return null
  return { y: +m[1], m: +m[2], d: +m[3] }
}

function ageAt(birth: string, at?: string): number | null {
  const b = parseYmd(birth)
  if (!b) return null
  const now = new Date()
  const a = at ? parseYmd(at) : { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() }
  if (!a) return null
  let age = a.y - b.y
  if (a.m < b.m || (a.m === b.m && a.d < b.d)) age--
  return age
}

export default function ContestRegisterPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isLoggedIn } = useContestantAuth()
  const [contest, setContest] = useState<Contest | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [idNumber, setIdNumber] = useState(''); const [organization, setOrganization] = useState(''); const [groupId, setGroupId] = useState('')
  const [profileIdNumber, setProfileIdNumber] = useState<string | null>(user?.id_number || null)
  const [customValues, setCustomValues] = useState<Record<number, string>>({})
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [idNumberAgreed, setIdNumberAgreed] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // ── 未成年人保护模块（可选启用）─────────────────────────────
  const [minorEnabled, setMinorEnabled] = useState(false)            // 系统级开关
  const [minorRequirement, setMinorRequirement] = useState('unknown') // none|unknown|guardian|statement|adult（服务端判定）
  const [profileBirthDate, setProfileBirthDate] = useState<string | null>(null) // 账号已绑定（脱敏）
  const [guardianBound, setGuardianBound] = useState(false)           // 账号已登记监护人信息
  const [birthDate, setBirthDate] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [guardianContact, setGuardianContact] = useState('')
  const [guardianAgreed, setGuardianAgreed] = useState(false)
  const [minorStatementAgreed, setMinorStatementAgreed] = useState(false)

  useEffect(() => {
    api.get<Contest>(`/public/contests/${id}`).then(c => { setContest(c); setLoading(false) }).catch(() => setLoading(false))
    api.get<{ enabled: boolean }>('/public/settings/minor-protection').then(r => setMinorEnabled(r.enabled)).catch(() => {})
    if (isLoggedIn && user) {
      setName(user.name); setEmail(user.email)
      // Fetch latest profile to ensure id_number is available (handles stale sessionStorage)
      const ca = contestantApi()
      ca.get<any>('/contestant/profile').then(p => {
        setProfileIdNumber(p.id_number || null); setOrganization(p.organization || '')
        setProfileBirthDate(p.birth_date || null)
        setGuardianBound(!!p.guardian_name)
      }).catch(() => {
        // Fallback to sessionStorage data
        setProfileIdNumber(user.id_number || null); setOrganization(user.organization || '')
      })
      // 已绑定出生日期的用户：由服务端按赛事开始日判定分支
      ca.get<any>(`/public/contests/${id}/minor-requirement`).then(r => {
        setMinorRequirement(r.requirement || 'unknown')
      }).catch(() => {})
    }
  }, [id, isLoggedIn, user, loading, navigate])

  if (loading) return <div className="text-center py-12 text-muted-foreground">加载中...</div>
  if (!contest || contest.status !== 'open') return <div className="text-center py-12"><p className="text-muted-foreground">{contest ? '该赛事当前不可报名' : '赛事不存在'}</p><Link to="/"><Button variant="link" className="mt-2">返回首页</Button></Link></div>

  const now = new Date()
  if (contest.registration_start && now < new Date(contest.registration_start)) return <div className="text-center py-12"><p className="text-muted-foreground">报名尚未开始</p><Link to={`/contests/${contest.id}`}><Button variant="link" className="mt-2">返回赛事详情</Button></Link></div>
  if (contest.registration_end && now > new Date(contest.registration_end)) return <div className="text-center py-12"><p className="text-muted-foreground">报名已截止</p><Link to={`/contests/${contest.id}`}><Button variant="link" className="mt-2">返回赛事详情</Button></Link></div>

  const needIdNumber = !isLoggedIn || !profileIdNumber

  // 未成年人保护生效 = 系统开关开启 && 赛事声明面向未成年人
  const minorActive = contest.minor_policy === 'minors_welcome' && minorEnabled

  // 有效分支：已绑定生日走服务端判定；否则按填写的出生日期本地计算（仅 UX，后端强制校验）
  const enteredAge = birthDate ? ageAt(birthDate, contest.start_date) : null
  const requirement = minorActive
    ? (profileBirthDate ? minorRequirement : (enteredAge != null ? (enteredAge < GUARDIAN_LIMIT ? 'guardian' : enteredAge < ADULT_LIMIT ? 'statement' : 'adult') : 'unknown'))
    : 'none'

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name || name.length < 2 || name.length > 20) e.name = '请输入 2-20 位的真实姓名'
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = '请输入正确的邮箱地址'
    if (needIdNumber) {
      if (!idNumber || !/^\d{17}[\dXx]$/.test(idNumber)) e.idNumber = '请输入正确的18位身份证号'
      else if (!idNumberAgreed) e.idNumber = '身份证号属于敏感个人信息，请勾选单独同意后再提交'
    }
    if (!privacyAgreed) e.privacy = '请阅读并同意隐私政策'
    if (minorActive && !profileBirthDate) {
      if (!birthDate) e.birthDate = '本赛事面向未成年人，请填写出生日期'
      else if (enteredAge == null) e.birthDate = '出生日期格式不正确'
      else if (birthDate > new Date().toISOString().split('T')[0]) e.birthDate = '出生日期不能晚于今天'
      // 负年龄（出生晚于赛事开始日）与后端一致走 <14 监护人分支，不做格式误报
    }
    if (requirement === 'guardian') {
      if (!guardianBound && (!guardianName || guardianName.length < 2)) e.guardianName = '请填写监护人姓名'
      if (!guardianBound && (!guardianContact || guardianContact.length < 5)) e.guardianContact = '请填写监护人的联系电话或邮箱'
      if (!guardianAgreed) e.guardian = '14周岁以下选手报名须征得监护人同意，请勾选监护人同意'
    }
    if (requirement === 'statement' && !minorStatementAgreed) e.minorStatement = '请勾选确认本人已满 14 周岁'
    contest.fields?.filter(f => f.is_required).forEach(f => { if (!customValues[f.id]?.trim()) e[`f${f.id}`] = `请填写${f.field_name}` })
    setErrors(e); return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return; setSubmitting(true)
    try {
      const cf: Record<string, string> = {}
      contest.fields?.forEach(f => { if (customValues[f.id]) cf[f.field_name] = customValues[f.id] })
      const payload: Record<string, any> = {
        contest_id: contest.id, group_id: groupId ? Number(groupId) : null, name, email, organization: organization || null, custom_fields: cf, privacy_agreed: privacyAgreed,
        ...(needIdNumber ? { id_number: idNumber, id_number_agreed: idNumberAgreed } : {}),
      }
      // 未成年人保护：仅在生效时提交相关字段（账号已绑定的值后端自动复用）
      if (minorActive) {
        if (!profileBirthDate) payload.birth_date = birthDate
        if (requirement === 'guardian') {
          if (!guardianBound) { payload.guardian_name = guardianName; payload.guardian_contact = guardianContact }
          payload.guardian_agreed = guardianAgreed
        }
        if (requirement === 'statement') payload.minor_statement_agreed = minorStatementAgreed
      }
      const res = await contestantApi().post<{ registration_number: string }>(`/public/contests/${contest.id}/register`, payload)
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
          <div className="space-y-1"><Label>身份证号 <span className="text-destructive">*</span></Label>
            {isLoggedIn && profileIdNumber ? (
              <p className="h-10 flex items-center text-sm text-muted-foreground">身份证号：{profileIdNumber}（使用账号绑定的身份证信息参赛）</p>
            ) : (
              <>
                <Input value={idNumber} onChange={e => { setIdNumber(e.target.value); setErrors({}) }} placeholder="18位身份证号码" maxLength={18} />
                <p className="text-xs text-muted-foreground">您的身份证号属于敏感个人信息，仅用于赛事报名核验，不会公开</p>
                <div className="flex items-start gap-2 pt-1">
                  <Checkbox id="idNumberAgreed" checked={idNumberAgreed} onCheckedChange={v => { setIdNumberAgreed(!!v); setErrors({}) }} />
                  <Label htmlFor="idNumberAgreed" className="text-sm text-muted-foreground cursor-pointer">我同意平台收集我的身份证号用于赛事报名核验</Label>
                </div>
                {isLoggedIn && <p className="text-xs text-muted-foreground">提交后该身份证号将绑定到您的账号</p>}
              </>
            )}
            {errors.idNumber && <p className="text-sm text-destructive">{errors.idNumber}</p>}
          </div>

          {minorActive && (
            <>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">本赛事面向未成年人，报名需确认年龄：14 周岁以下须取得监护人同意，14-18 周岁须本人确认。</div>
              <div className="space-y-1"><Label>出生日期 {!profileBirthDate && <span className="text-destructive">*</span>}</Label>
                {profileBirthDate ? (
                  <p className="h-10 flex items-center text-sm text-muted-foreground">出生日期：{profileBirthDate}（使用账号已绑定的出生日期）</p>
                ) : (
                  <>
                    <Input type="date" value={birthDate} onChange={e => { setBirthDate(e.target.value); setErrors({}) }} />
                    <p className="text-xs text-muted-foreground">仅用于年龄判定，将以加密形式保存</p>
                  </>
                )}
                {errors.birthDate && <p className="text-sm text-destructive">{errors.birthDate}</p>}
              </div>
              {requirement === 'guardian' && (
                <div className="space-y-3 p-3 border border-border rounded-lg">
                  <p className="text-sm font-medium">监护人信息（14 周岁以下选手需监护人同意）</p>
                  {!guardianBound ? (
                    <>
                      <div className="space-y-1"><Label>监护人姓名</Label><Input value={guardianName} onChange={e => { setGuardianName(e.target.value); setErrors({}) }} placeholder="监护人真实姓名" maxLength={100} />{errors.guardianName && <p className="text-sm text-destructive">{errors.guardianName}</p>}</div>
                      <div className="space-y-1"><Label>监护人联系方式</Label><Input value={guardianContact} onChange={e => { setGuardianContact(e.target.value); setErrors({}) }} placeholder="联系电话或邮箱" maxLength={200} />{errors.guardianContact && <p className="text-sm text-destructive">{errors.guardianContact}</p>}</div>
                      <p className="text-xs text-muted-foreground">提交后监护人信息将绑定到您的账号</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">监护人信息已登记（{user?.guardian_name || '已登记'}），无需重复填写</p>
                  )}
                  <div className="flex items-start gap-2">
                    <Checkbox id="guardianAgreed" checked={guardianAgreed} onCheckedChange={v => { setGuardianAgreed(!!v); setErrors({}) }} />
                    <Label htmlFor="guardianAgreed" className="text-sm text-muted-foreground cursor-pointer">我确认本人为参赛者的监护人，同意其报名本赛事，并同意平台收集参赛者与本人的必要信息</Label>
                  </div>
                  {errors.guardian && <p className="text-sm text-destructive">{errors.guardian}</p>}
                </div>
              )}
              {requirement === 'statement' && (
                <div className="flex items-start gap-2 p-3 border border-border rounded-lg">
                  <Checkbox id="minorStatement" checked={minorStatementAgreed} onCheckedChange={v => { setMinorStatementAgreed(!!v); setErrors({}) }} />
                  <Label htmlFor="minorStatement" className="text-sm text-muted-foreground cursor-pointer">我确认本人已满 14 周岁，并已告知家长本次参赛事项</Label>
                </div>
              )}
              {errors.minorStatement && <p className="text-sm text-destructive">{errors.minorStatement}</p>}
            </>
          )}

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
          <div className="flex items-start gap-2 pt-2"><Checkbox id="privacy" checked={privacyAgreed} onCheckedChange={v => { setPrivacyAgreed(!!v); setErrors({}) }} /><Label htmlFor="privacy" className="text-sm text-muted-foreground cursor-pointer">我已阅读并同意<Link to="/privacy" target="_blank" className="text-primary hover:underline">《隐私政策》</Link></Label></div>
          {errors.privacy && <p className="text-sm text-destructive">{errors.privacy}</p>}
          <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting}>{submitting ? '提交中...' : '提交报名'}</Button>
        </CardContent></Card>
    </div>
  )
}
