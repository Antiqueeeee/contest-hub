import { useState, useEffect } from 'react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download } from 'lucide-react'

interface Contest { id: number; title: string; score_categories: string[] | null }

const selectCls = "w-full h-10 rounded-md border border-input bg-background px-3 text-sm"

const REG_DEFAULTS = ['registration_number', 'name', 'email', 'id_number', 'organization', 'submitted_at']

export default function ExportPage() {
  const [exportType, setExportType] = useState<'registration' | 'result'>('registration')
  const [contestId, setContestId] = useState('')
  const [contests, setContests] = useState<Contest[]>([])
  const [scoreCats, setScoreCats] = useState<string[]>([])
  const [selectedFields, setSelectedFields] = useState<string[]>([...REG_DEFAULTS])
  const [exporting, setExporting] = useState(false)

  useEffect(() => { api.get<{ items: Contest[] }>('/admin/contests').then(r => setContests(r.items)).catch(console.error) }, [])

  // Fetch contest details to get score_categories
  useEffect(() => {
    if (!contestId) { setScoreCats([]); return }
    api.get<Contest>(`/admin/contests/${contestId}`).then(c => {
      setScoreCats((c.score_categories || []).filter(s => s.trim()))
    }).catch(() => setScoreCats([]))
  }, [contestId])

  const regFields = [
    { key: 'registration_number', label: '报名编号' }, { key: 'name', label: '姓名' },
    { key: 'email', label: '邮箱' }, { key: 'id_number', label: '身份证号' },
    { key: 'organization', label: '学校/单位' }, { key: 'submitted_at', label: '报名时间' },
  ]
  const baseResultFields = [
    { key: 'registration_number', label: '报名编号' }, { key: 'name', label: '姓名' },
  ]
  const tailResultFields = [
    { key: 'total_score', label: '总分' }, { key: 'rank', label: '排名' }, { key: 'award', label: '奖项' },
  ]
  const scoreFields = scoreCats.map(c => ({ key: c, label: c }))
  const resultFields = [...baseResultFields, ...scoreFields, ...tailResultFields]

  const fields = exportType === 'registration' ? regFields : resultFields

  // Auto-select defaults when type/contest/scoreCats changes
  const handleTypeChange = (t: 'registration' | 'result') => {
    setExportType(t)
    if (t === 'registration') {
      setSelectedFields([...REG_DEFAULTS])
    } else {
      setSelectedFields(['registration_number', 'name', ...scoreCats.filter(s => s.trim()), 'total_score', 'rank', 'award'])
    }
  }

  const handleExport = async () => {
    if (!contestId) return alert('请选择赛事')
    setExporting(true)
    try {
      const res = await api.post<{ task_id: string }>('/admin/export', { export_type: exportType, contest_id: Number(contestId), fields: selectedFields })
      let attempts = 0
      while (attempts < 30) {
        await new Promise(r => setTimeout(r, 1000))
        const task = await api.get<{ status: string; task_id: string }>(`/admin/export/tasks/${res.task_id}`)
        if (task.status === 'completed') {
          const token = sessionStorage.getItem('contest_hub_token')
          const blob = await fetch(`http://localhost:8000/api/admin/export/download/${res.task_id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.blob())
          const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `export_${res.task_id}.xlsx`; a.click()
          return
        }
        if (task.status === 'failed') { alert('导出失败，请重试'); return }
        attempts++
      }
      alert('导出超时，请稍后重试')
    } catch (e) { alert(e instanceof Error ? e.message : '导出失败') }
    finally { setExporting(false) }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">数据导出</h1>
      <Card><CardHeader><CardTitle className="text-base">步骤 1：选择导出类型和范围</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>导出类型</Label>
            <select value={exportType} onChange={e => handleTypeChange(e.target.value as 'registration' | 'result')} className={selectCls}>
              <option value="registration">报名数据</option>
              <option value="result">成绩数据</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>选择赛事</Label>
            <select value={contestId} onChange={e => setContestId(e.target.value)} className={selectCls}>
              <option value="">请选择赛事</option>
              {contests.map(c => <option key={c.id} value={String(c.id)}>{c.title}</option>)}
            </select>
          </div>
        </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">步骤 2：选择导出字段</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {fields.map(f => (
              <div key={f.key} className="flex items-center gap-2">
                <Checkbox id={f.key} checked={selectedFields.includes(f.key)} onCheckedChange={() => setSelectedFields(prev => prev.includes(f.key) ? prev.filter(k => k !== f.key) : [...prev, f.key])} />
                <Label htmlFor={f.key} className="cursor-pointer">{f.label}</Label>
              </div>
            ))}
          </div>
        </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">步骤 3：确认与下载</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleExport} className="w-full" disabled={exporting}><Download className="h-4 w-4 mr-1" />{exporting ? '生成中...' : '提交导出任务'}</Button>
          <p className="text-xs text-muted-foreground">文件后台生成，完成后自动下载。保留 7 天。</p>
        </CardContent></Card>
    </div>
  )
}
