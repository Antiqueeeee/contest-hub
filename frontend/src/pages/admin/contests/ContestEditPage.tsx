import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

interface Group { name: string; description: string; max_participants: number; sort_order: number }
interface Award { name: string; description: string; sort_order: number }
interface Field { field_name: string; field_type: string; is_required: boolean; options: string[] | null; sort_order: number }

const STEPS = ['基本信息', '组别设置', '奖项设置', '报名表单']

export default function ContestEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [regStart, setRegStart] = useState('')
  const [regEnd, setRegEnd] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('0')
  const [groups, setGroups] = useState<Group[]>([])
  const [awardsList, setAwardsList] = useState<Award[]>([])
  const [fields, setFields] = useState<Field[]>([])

  useEffect(() => {
    if (!isNew) {
      api.get<{
        title: string; description: string; location: string; start_date: string; end_date: string
        registration_start: string; registration_end: string; max_participants: number
        groups: Group[]; awards: Award[]; fields: Field[]
      }>(`/admin/contests/${id}`).then(c => {
        setTitle(c.title); setDescription(c.description); setLocation(c.location)
        setStartDate(c.start_date?.split('T')[0] || ''); setEndDate(c.end_date?.split('T')[0] || '')
        setRegStart(c.registration_start?.replace('T', ' ').slice(0, 16) || '')
        setRegEnd(c.registration_end?.replace('T', ' ').slice(0, 16) || '')
        setMaxParticipants(String(c.max_participants || 0))
        setGroups(c.groups || []); setAwardsList(c.awards || []); setFields(c.fields || [])
      })
    }
  }, [id, isNew])

  const handleSave = async () => {
    if (!title.trim()) return alert('请输入赛事标题')
    setSaving(true)
    try {
      const data = {
        title, description, location,
        start_date: startDate, end_date: endDate,
        registration_start: regStart, registration_end: regEnd,
        max_participants: Number(maxParticipants),
        groups: groups.filter(g => g.name), awards: awardsList.filter(a => a.name), fields: fields.filter(f => f.field_name),
      }
      if (isNew) await api.post('/admin/contests', data)
      else await api.put(`/admin/contests/${id}`, data)
      navigate('/admin/contests')
    } catch (e) { alert(e instanceof Error ? e.message : '保存失败') }
    finally { setSaving(false) }
  }

  const addGroup = () => setGroups([...groups, { name: '', description: '', max_participants: 0, sort_order: groups.length + 1 }])
  const addAward = () => setAwardsList([...awardsList, { name: '', description: '', sort_order: awardsList.length + 1 }])
  const addField = () => setFields([...fields, { field_name: '', field_type: 'text', is_required: false, options: null, sort_order: fields.length + 1 }])

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isNew ? '创建赛事' : '编辑赛事'}</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => navigate('/admin/contests')}>返回</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button onClick={() => setStep(i)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${i === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
              {i + 1}. {s}
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <Card><CardHeader><CardTitle className="text-base">基本信息</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1"><Label>赛事标题 <span className="text-destructive">*</span></Label><Input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} /></div>
            <div className="space-y-1"><Label>赛事介绍</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} className="min-h-[100px]" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>比赛地点</Label><Input value={location} onChange={e => setLocation(e.target.value)} /></div>
              <div className="space-y-1"><Label>人数上限（0=不限）</Label><Input type="number" value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>比赛开始</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
              <div className="space-y-1"><Label>比赛结束</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>报名开始</Label><Input type="datetime-local" value={regStart} onChange={e => setRegStart(e.target.value)} /></div>
              <div className="space-y-1"><Label>报名截止</Label><Input type="datetime-local" value={regEnd} onChange={e => setRegEnd(e.target.value)} /></div>
            </div>
          </CardContent></Card>
      )}

      {step === 1 && (
        <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">组别设置</CardTitle><Button variant="outline" size="sm" onClick={addGroup}><Plus className="h-3 w-3 mr-1" />添加</Button></CardHeader>
          <CardContent className="space-y-3">
            {groups.map((g, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <div className="space-y-1"><Label>名称</Label><Input value={g.name} onChange={e => { const ng = [...groups]; ng[i] = { ...g, name: e.target.value }; setGroups(ng) }} /></div>
                  <div className="space-y-1"><Label>说明</Label><Input value={g.description} onChange={e => { const ng = [...groups]; ng[i] = { ...g, description: e.target.value }; setGroups(ng) }} /></div>
                  <div className="space-y-1"><Label>人数上限</Label><Input type="number" value={g.max_participants || ''} onChange={e => { const ng = [...groups]; ng[i] = { ...g, max_participants: Number(e.target.value) }; setGroups(ng) }} /></div>
                </div>
                <Button variant="ghost" size="sm" className="mt-6" onClick={() => setGroups(groups.filter((_, ii) => ii !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </CardContent></Card>
      )}

      {step === 2 && (
        <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">奖项设置</CardTitle><Button variant="outline" size="sm" onClick={addAward}><Plus className="h-3 w-3 mr-1" />添加</Button></CardHeader>
          <CardContent className="space-y-3">
            {awardsList.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>名称</Label><Input value={a.name} onChange={e => { const na = [...awardsList]; na[i] = { ...a, name: e.target.value }; setAwardsList(na) }} /></div>
                  <div className="space-y-1"><Label>说明</Label><Input value={a.description} onChange={e => { const na = [...awardsList]; na[i] = { ...a, description: e.target.value }; setAwardsList(na) }} /></div>
                </div>
                <Button variant="ghost" size="sm" className="mt-6" onClick={() => setAwardsList(awardsList.filter((_, ii) => ii !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </CardContent></Card>
      )}

      {step === 3 && (
        <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">报名表单配置</CardTitle><Button variant="outline" size="sm" onClick={addField}><Plus className="h-3 w-3 mr-1" />添加字段</Button></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">系统默认字段：姓名、手机号（不可删除）</p>
            {fields.map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="flex-1 grid grid-cols-4 gap-3">
                  <div className="space-y-1"><Label>字段名</Label><Input value={f.field_name} onChange={e => { const nf = [...fields]; nf[i] = { ...f, field_name: e.target.value }; setFields(nf) }} /></div>
                  <div className="space-y-1"><Label>类型</Label>
                    <Select value={f.field_type} onValueChange={v => { const nf = [...fields]; nf[i] = { ...f, field_type: v || 'text' }; setFields(nf) }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="text">文本</SelectItem><SelectItem value="number">数字</SelectItem><SelectItem value="select">单选</SelectItem><SelectItem value="date">日期</SelectItem><SelectItem value="textarea">文本域</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 pt-6">
                    <div className="flex items-center gap-2">
                      <Switch checked={f.is_required} onCheckedChange={v => { const nf = [...fields]; nf[i] = { ...f, is_required: !!v }; setFields(nf) }} /><Label>必填</Label>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="mt-6" onClick={() => setFields(fields.filter((_, ii) => ii !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </CardContent></Card>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}><ChevronLeft className="h-4 w-4 mr-1" />上一步</Button>
        {step < STEPS.length - 1 ? <Button onClick={() => setStep(step + 1)}>下一步<ChevronRight className="h-4 w-4 ml-1" /></Button> : <Button onClick={handleSave} disabled={saving}>完成</Button>}
      </div>
    </div>
  )
}
