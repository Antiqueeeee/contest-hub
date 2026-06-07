import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2 } from 'lucide-react'

interface Field { field_name: string; field_type: string; is_required: boolean; options: string[] | null; sort_order: number }
interface Award { name: string; description: string; sort_order: number }
interface Template { id: number; name: string; items: { id: number; name: string; description: string; max_participants: number }[] }

const FIELD_TYPES = [
  { value: 'text', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'select', label: '单选' },
  { value: 'date', label: '日期' },
  { value: 'textarea', label: '文本域' },
]

export default function ContestEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'
  const [saving, setSaving] = useState(false)

  // Basic info
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [regStart, setRegStart] = useState('')
  const [regEnd, setRegEnd] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('0')

  // Groups - selected item IDs from templates
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([])

  // Awards
  const [awardsList, setAwardsList] = useState<Award[]>([])

  // Fields
  const [fields, setFields] = useState<Field[]>([])

  // Load existing contest
  useEffect(() => {
    // Load templates
    api.get<{ items: Template[] }>('/admin/groups/templates').then(r => setTemplates(r.items)).catch(() => {})

    if (!isNew) {
      api.get<{
        title: string; description: string; location: string; start_date: string; end_date: string
        registration_start: string; registration_end: string; max_participants: number
        groups: { id: number; name: string }[]; awards: Award[]; fields: Field[]
      }>(`/admin/contests/${id}`).then(c => {
        setTitle(c.title); setDescription(c.description); setLocation(c.location)
        setStartDate(c.start_date?.split('T')[0] || '')
        setEndDate(c.end_date?.split('T')[0] || '')
        const rs = c.registration_start || ''
        const re = c.registration_end || ''
        setRegStart(rs.includes('T') ? rs.replace('T', ' ').slice(0, 16) : rs.slice(0, 16))
        setRegEnd(re.includes('T') ? re.replace('T', ' ').slice(0, 16) : re.slice(0, 16))
        setMaxParticipants(String(c.max_participants || 0))
        setAwardsList(c.awards || [])
        setFields(c.fields || [])
        // Map contest groups to template item IDs for checkbox selection
        if (c.groups?.length > 0) {
          setSelectedGroupIds(c.groups.map(g => g.id))
        }
      }).catch(() => {})
    }
  }, [id, isNew])

  const toggleGroup = (itemId: number) => {
    setSelectedGroupIds(prev => prev.includes(itemId) ? prev.filter(x => x !== itemId) : [...prev, itemId])
  }

  const addAward = () => setAwardsList([...awardsList, { name: '', description: '', sort_order: awardsList.length + 1 }])
  const addField = () => setFields([...fields, { field_name: '', field_type: 'text', is_required: false, options: null, sort_order: fields.length + 1 }])

  const handleSave = async () => {
    if (!title.trim()) return alert('请输入赛事标题')
    setSaving(true)
    try {
      const data = {
        title, description, location,
        start_date: startDate, end_date: endDate,
        registration_start: regStart, registration_end: regEnd,
        max_participants: Number(maxParticipants),
        groups: selectedGroupIds.map((gid, i) => {
          // Find the item in templates
          for (const t of templates) {
            const item = t.items.find(it => it.id === gid)
            if (item) return { name: item.name, description: item.description, max_participants: item.max_participants, sort_order: i + 1 }
          }
          return { name: `组别${gid}`, description: '', max_participants: 0, sort_order: i + 1 }
        }),
        awards: awardsList.filter(a => a.name),
        fields: fields.filter(f => f.field_name),
      }
      if (isNew) await api.post('/admin/contests', data)
      else await api.put(`/admin/contests/${id}`, data)
      navigate('/admin/contests')
    } catch (e) { alert(e instanceof Error ? e.message : '保存失败') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isNew ? '创建赛事' : '编辑赛事'}</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => navigate('/admin/contests')}>取消</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
        </div>
      </div>

      {/* 1. Basic Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">基本信息</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1"><Label>赛事标题 <span className="text-destructive">*</span></Label><Input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} /></div>
          <div className="space-y-1"><Label>赛事介绍</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} className="min-h-[80px]" /></div>
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
        </CardContent>
      </Card>

      {/* 2. Group Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">组别选择</CardTitle>
          <p className="text-sm text-muted-foreground">勾选本赛事开放的参赛组别</p>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无分组模板，请先在「组别管理」中创建</p>
          ) : (
            <div className="space-y-4">
              {templates.map(t => (
                <div key={t.id}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">{t.name}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {t.items.map(item => (
                      <label key={item.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                        <Checkbox checked={selectedGroupIds.includes(item.id)} onCheckedChange={() => toggleGroup(item.id)} />
                        <div>
                          <span className="text-sm font-medium">{item.name}</span>
                          {item.description && <span className="text-xs text-muted-foreground ml-2">{item.description}</span>}
                          {item.max_participants > 0 && <Badge variant="outline" className="text-xs ml-2">限{item.max_participants}人</Badge>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Awards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">奖项设置</CardTitle>
          <Button variant="outline" size="sm" onClick={addAward}><Plus className="h-3 w-3 mr-1" />添加</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {awardsList.map((a, i) => (
            <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>名称</Label><Input value={a.name} onChange={e => { const na = [...awardsList]; na[i] = { ...a, name: e.target.value }; setAwardsList(na) }} placeholder="如：一等奖" /></div>
                <div className="space-y-1"><Label>说明</Label><Input value={a.description} onChange={e => { const na = [...awardsList]; na[i] = { ...a, description: e.target.value }; setAwardsList(na) }} /></div>
              </div>
              <Button variant="ghost" size="sm" className="mt-6" onClick={() => setAwardsList(awardsList.filter((_, ii) => ii !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 4. Registration Fields */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">报名表单</CardTitle>
          <Button variant="outline" size="sm" onClick={addField}><Plus className="h-3 w-3 mr-1" />添加字段</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">默认字段：姓名、手机号（无需添加）</p>
          {fields.map((f, i) => (
            <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="flex-1 grid grid-cols-4 gap-3">
                <div className="space-y-1"><Label>字段名</Label><Input value={f.field_name} onChange={e => { const nf = [...fields]; nf[i] = { ...f, field_name: e.target.value }; setFields(nf) }} placeholder="如：学校名称" /></div>
                <div className="space-y-1">
                  <Label>类型</Label>
                  <select value={f.field_type} onChange={e => { const nf = [...fields]; nf[i] = { ...f, field_type: e.target.value }; setFields(nf) }}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1 pt-6">
                  <div className="flex items-center gap-2">
                    <Switch checked={f.is_required} onCheckedChange={v => { const nf = [...fields]; nf[i] = { ...f, is_required: !!v }; setFields(nf) }} />
                    <Label>必填</Label>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="mt-6" onClick={() => setFields(fields.filter((_, ii) => ii !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Bottom save */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => navigate('/admin/contests')}>取消</Button>
        <Button onClick={handleSave} disabled={saving} size="lg">{saving ? '保存中...' : '保存赛事'}</Button>
      </div>
    </div>
  )
}
