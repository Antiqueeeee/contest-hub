import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { contests, getContestGroups, getAwards, getContestFields } from '@/mock/data'
import type { ContestGroup, Award, ContestField } from '@/mock/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react'

const STEPS = ['基本信息', '组别设置', '奖项设置', '报名表单']

export default function ContestEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'
  const [step, setStep] = useState(0)

  // Step 1: Basic info
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [regStart, setRegStart] = useState('')
  const [regEnd, setRegEnd] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('0')

  // Step 2: Groups
  const [groups, setGroups] = useState<Partial<ContestGroup>[]>([])
  // Step 3: Awards
  const [awardsList, setAwardsList] = useState<Partial<Award>[]>([])
  // Step 4: Custom fields
  const [fields, setFields] = useState<Partial<ContestField>[]>([])

  useEffect(() => {
    if (!isNew) {
      const c = contests.find(cc => cc.id === Number(id))
      if (c) {
        setTitle(c.title); setDescription(c.description); setLocation(c.location)
        setStartDate(c.startDate); setEndDate(c.endDate)
        setRegStart(c.registrationStart); setRegEnd(c.registrationEnd)
        setMaxParticipants(String(c.maxParticipants))
        setGroups(getContestGroups(c.id).map(g => ({ ...g })))
        setAwardsList(getAwards(c.id).map(a => ({ ...a })))
        setFields(getContestFields(c.id).map(f => ({ ...f })))
      }
    }
  }, [id, isNew])

  // Make sure groups/awards/fields have at least one entry
  if (groups.length === 0) setGroups([{ name: '', description: '', maxParticipants: 0, sortOrder: 1 }])
  if (awardsList.length === 0) setAwardsList([{ name: '', description: '', sortOrder: 1 }])

  const addGroup = () => setGroups([...groups, { name: '', description: '', maxParticipants: 0, sortOrder: groups.length + 1 }])
  const addAward = () => setAwardsList([...awardsList, { name: '', description: '', sortOrder: awardsList.length + 1 }])
  const addField = () => setFields([...fields, { fieldName: '', fieldType: 'text', isRequired: false, options: null, sortOrder: fields.length + 1 }])

  const handleSave = () => {
    if (!title.trim()) { alert('请输入赛事标题'); return }
    alert(isNew ? '赛事已创建（Mock）' : '赛事已更新（Mock）')
    navigate('/admin/contests')
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isNew ? '创建赛事' : '编辑赛事'}</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => navigate('/admin/contests')}>返回列表</Button>
          <Button onClick={handleSave}>保存</Button>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-4">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => setStep(i)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                i === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {i + 1}. {s}
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">基本信息</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1"><Label>赛事标题 <span className="text-destructive">*</span></Label><Input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} /></div>
            <div className="space-y-1"><Label>赛事介绍</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} className="min-h-[120px]" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>比赛地点</Label><Input value={location} onChange={e => setLocation(e.target.value)} /></div>
              <div className="space-y-1"><Label>联系方式</Label><Input placeholder="咨询电话" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>比赛开始日期</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
              <div className="space-y-1"><Label>比赛结束日期</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>报名开始时间</Label><Input type="datetime-local" value={regStart} onChange={e => setRegStart(e.target.value)} /></div>
              <div className="space-y-1"><Label>报名截止时间</Label><Input type="datetime-local" value={regEnd} onChange={e => setRegEnd(e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>人数上限（0=不限）</Label><Input type="number" value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} /></div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Groups */}
      {step === 1 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">组别设置</CardTitle>
            <Button variant="outline" size="sm" onClick={addGroup}><Plus className="h-3 w-3 mr-1" />添加组别</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {groups.map((g, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <div className="space-y-1"><Label>组别名称</Label><Input value={g.name ?? ''} onChange={e => setGroups(prev => prev.map((gg, ii) => ii === i ? { ...gg, name: e.target.value } : gg))} /></div>
                  <div className="space-y-1"><Label>说明</Label><Input value={g.description ?? ''} onChange={e => setGroups(prev => prev.map((gg, ii) => ii === i ? { ...gg, description: e.target.value } : gg))} /></div>
                  <div className="space-y-1"><Label>人数上限</Label><Input type="number" value={g.maxParticipants ?? ''} onChange={e => setGroups(prev => prev.map((gg, ii) => ii === i ? { ...gg, maxParticipants: Number(e.target.value) } : gg))} /></div>
                </div>
                <Button variant="ghost" size="sm" className="mt-6" onClick={() => setGroups(prev => prev.filter((_, ii) => ii !== i))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Awards */}
      {step === 2 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">奖项设置</CardTitle>
            <Button variant="outline" size="sm" onClick={addAward}><Plus className="h-3 w-3 mr-1" />添加奖项</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {awardsList.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>奖项名称</Label><Input value={a.name ?? ''} onChange={e => setAwardsList(prev => prev.map((aa, ii) => ii === i ? { ...aa, name: e.target.value } : aa))} /></div>
                  <div className="space-y-1"><Label>说明</Label><Input value={a.description ?? ''} onChange={e => setAwardsList(prev => prev.map((aa, ii) => ii === i ? { ...aa, description: e.target.value } : aa))} /></div>
                </div>
                <Button variant="ghost" size="sm" className="mt-6" onClick={() => setAwardsList(prev => prev.filter((_, ii) => ii !== i))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Custom Fields */}
      {step === 3 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">报名表单配置</CardTitle>
            <Button variant="outline" size="sm" onClick={addField}><Plus className="h-3 w-3 mr-1" />添加字段</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">系统默认字段：姓名、手机号（不可删除）</p>
            {fields.map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="flex-1 grid grid-cols-4 gap-3">
                  <div className="space-y-1"><Label>字段名</Label><Input value={f.fieldName ?? ''} onChange={e => setFields(prev => prev.map((ff, ii) => ii === i ? { ...ff, fieldName: e.target.value } : ff))} /></div>
                  <div className="space-y-1">
                    <Label>类型</Label>
                    <Select value={f.fieldType ?? 'text'} onValueChange={v => setFields(prev => prev.map((ff, ii) => ii === i ? { ...ff, fieldType: v as ContestField['fieldType'] } : ff))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">文本</SelectItem>
                        <SelectItem value="number">数字</SelectItem>
                        <SelectItem value="select">单选</SelectItem>
                        <SelectItem value="date">日期</SelectItem>
                        <SelectItem value="textarea">文本域</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 pt-6">
                    <div className="flex items-center gap-2">
                      <Switch checked={f.isRequired ?? false} onCheckedChange={v => setFields(prev => prev.map((ff, ii) => ii === i ? { ...ff, isRequired: v } : ff))} />
                      <Label>必填</Label>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="mt-6" onClick={() => setFields(prev => prev.filter((_, ii) => ii !== i))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" />上一步
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)}>下一步<ChevronRight className="h-4 w-4 ml-1" /></Button>
        ) : (
          <Button onClick={handleSave}>完成</Button>
        )}
      </div>
    </div>
  )
}
