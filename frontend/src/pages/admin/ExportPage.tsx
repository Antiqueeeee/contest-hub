import { useState } from 'react'
import { contests, getRegistrations, getContestFields, getResults } from '@/mock/data'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download } from 'lucide-react'

export default function ExportPage() {
  const [exportType, setExportType] = useState<'registration' | 'result'>('registration')
  const [contestId, setContestId] = useState('')
  const [selectedFields, setSelectedFields] = useState<string[]>(['registrationNumber', 'name', 'phone', 'groupId', 'submittedAt'])

  const registrationFields = [
    { key: 'registrationNumber', label: '报名编号', default: true },
    { key: 'name', label: '姓名', default: true },
    { key: 'phone', label: '手机号', default: true },
    { key: 'groupId', label: '组别', default: true },
    { key: 'submittedAt', label: '报名时间', default: true },
  ]

  const resultFields = [
    { key: 'registrationNumber', label: '报名编号', default: true },
    { key: 'name', label: '姓名', default: true },
    { key: 'phone', label: '手机号', default: true },
    { key: 'groupId', label: '组别', default: true },
    { key: 'scores', label: '各评分项得分', default: true },
    { key: 'totalScore', label: '总分', default: true },
    { key: 'rank', label: '排名', default: true },
    { key: 'awardId', label: '奖项', default: true },
  ]

  const fields = exportType === 'registration' ? registrationFields : resultFields
  const selectedContest = contests.find(c => String(c.id) === contestId)
  const recordCount = selectedContest
    ? (exportType === 'registration' ? getRegistrations(selectedContest.id).length : getResults(selectedContest.id).length)
    : 0

  const customFields = selectedContest ? getContestFields(selectedContest.id) : []

  const toggleField = (key: string) => {
    setSelectedFields(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const handleExport = () => {
    if (!contestId) { alert('请选择赛事'); return }
    if (selectedFields.length === 0) { alert('请至少选择一个导出字段'); return }
    alert(`导出任务已提交，预计导出 ${recordCount} 条记录。\n\n（Mock 模式，实际将生成 .xlsx 文件通过异步任务下载）`)
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">数据导出</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">步骤 1：选择导出类型和范围</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>导出类型</Label>
            <Select value={exportType} onValueChange={v => { setExportType(v as 'registration' | 'result'); setSelectedFields([]) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="registration">报名数据</SelectItem>
                <SelectItem value="result">成绩数据</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>选择赛事</Label>
            <Select value={contestId} onValueChange={(v) => setContestId(v ?? '')}>
              <SelectTrigger><SelectValue placeholder="请选择" /></SelectTrigger>
              <SelectContent>
                {contests.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">步骤 2：选择导出字段</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {fields.map(f => (
              <div key={f.key} className="flex items-center gap-2">
                <Checkbox
                  id={f.key}
                  checked={selectedFields.includes(f.key)}
                  onCheckedChange={() => toggleField(f.key)}
                />
                <Label htmlFor={f.key} className="cursor-pointer">{f.label}</Label>
              </div>
            ))}
            {exportType === 'registration' && customFields.map(f => (
              <div key={f.id} className="flex items-center gap-2">
                <Checkbox
                  id={`custom-${f.id}`}
                  checked={selectedFields.includes(f.fieldName)}
                  onCheckedChange={() => toggleField(f.fieldName)}
                />
                <Label htmlFor={`custom-${f.id}`} className="cursor-pointer">{f.fieldName}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">步骤 3：确认与下载</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            预计导出 <strong>{recordCount}</strong> 条记录，格式 .xlsx
          </p>
          <Button onClick={handleExport} className="w-full">
            <Download className="h-4 w-4 mr-1" />提交导出任务
          </Button>
          <p className="text-xs text-muted-foreground">文件将在后台生成，完成后可下载。文件保留 7 天。</p>
        </CardContent>
      </Card>
    </div>
  )
}
