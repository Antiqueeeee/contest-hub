import { useState, useEffect } from 'react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Upload, Download, Pencil, X } from 'lucide-react'

interface ContestItem { id: number; title: string; status: string }
interface RegItem { id: number; registration_number: string; form_data: Record<string, string>; contest_id: number; group_id: number | null }
interface ResultItem { id: number; registration_id: number; scores: Record<string, number>; total_score: number; rank: number | null; award_id: number | null; is_published: boolean }

const selectCls = "h-10 rounded-md border border-input bg-background px-3 text-sm"

export default function ResultListPage() {
  const [contests, setContests] = useState<ContestItem[]>([])
  const [contestId, setContestId] = useState('')
  const [registrations, setRegistrations] = useState<RegItem[]>([])
  const [results, setResults] = useState<ResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [editReg, setEditReg] = useState<RegItem | null>(null)
  const [editScores, setEditScores] = useState<Record<string, number>>({ 客观题得分: 0, 主观题得分: 0 })
  const [saving, setSaving] = useState(false)

  // Load contests
  useEffect(() => {
    api.get<{ items: ContestItem[] }>('/admin/contests').then(r =>
      setContests(r.items.filter(c => c.status === 'finished'))
    ).catch(() => {})
  }, [])

  // Load data when contest selected
  useEffect(() => {
    if (!contestId) { setRegistrations([]); setResults([]); return }
    setLoading(true)
    const load = async () => {
      try {
        const [regRes, resRes] = await Promise.all([
          api.get<{ items: RegItem[] }>(`/admin/registrations?contest_id=${contestId}&page_size=200`),
          api.get<{ items: ResultItem[] }>(`/admin/results?contest_id=${contestId}&page_size=200`),
        ])
        setRegistrations(Array.isArray(regRes.items) ? regRes.items : [])
        setResults(Array.isArray(resRes.items) ? resRes.items : [])
      } catch (e) {
        console.error('Failed to load contest data:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [contestId])

  const getResultForReg = (regId: number) => results.find(r => r.registration_id === regId)

  const openScoreDialog = (reg: RegItem) => {
    const existing = getResultForReg(reg.id)
    setEditReg(reg)
    setEditScores(existing?.scores ? { ...existing.scores } : { 客观题得分: 0, 主观题得分: 0 })
  }

  const handleSaveScores = async () => {
    if (!editReg) return
    setSaving(true)
    const total = Object.values(editScores).reduce((s, v) => s + (Number(v) || 0), 0)
    try {
      await api.post('/admin/results', {
        contest_id: Number(contestId),
        registration_id: editReg.id,
        scores: editScores,
        total_score: total,
      })
      // Refresh results
      const res = await api.get<{ items: ResultItem[] }>(`/admin/results?contest_id=${contestId}&page_size=200`)
      setResults(res.items || [])
      setEditReg(null)
    } catch (e) { alert('保存失败') }
    finally { setSaving(false) }
  }

  const handlePublishAll = async () => {
    if (!confirm('确认发布所有已录入的成绩？发布后选手端即可查看。')) return
    for (const r of results) {
      if (!r.is_published) {
        await api.patch(`/admin/results/${r.id}/publish`).catch(() => {})
      }
    }
    const res = await api.get<{ items: ResultItem[] }>(`/admin/results?contest_id=${contestId}&page_size=200`)
    setResults(res.items || [])
  }

  const handleWithdraw = async (id: number) => {
    if (!confirm('确认撤回？')) return
    await api.patch(`/admin/results/${id}/withdraw`)
    const res = await api.get<{ items: ResultItem[] }>(`/admin/results?contest_id=${contestId}&page_size=200`)
    setResults(res.items || [])
  }

  const handleDownloadTemplate = async () => {
    const token = sessionStorage.getItem('contest_hub_token')
    const res = await fetch('http://localhost:8000/api/admin/results/template', { headers: { Authorization: `Bearer ${token}` } })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'template.xlsx'; a.click()
  }

  const handleImport = async () => {
    if (!contestId) return alert('请先选择赛事')
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.xlsx'
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return
      const formData = new FormData(); formData.append('file', file)
      const token = sessionStorage.getItem('contest_hub_token')
      const res = await fetch(`http://localhost:8000/api/admin/results/import?contest_id=${contestId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
      const data = await res.json()
      alert(`导入完成：成功 ${data.success_count} 条，失败 ${data.error_count} 条`)
      // Refresh
      const r = await api.get<{ items: ResultItem[] }>(`/admin/results?contest_id=${contestId}&page_size=200`)
      setResults(r.items || [])
    }
    input.click()
  }

  const unpublishedCount = results.filter(r => !r.is_published).length
  const scoreCount = results.length
  const regCount = registrations.length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">成绩管理</h1>
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}><Download className="h-4 w-4 mr-1" />下载导入模板</Button>
          <Button variant="outline" size="sm" onClick={handleImport}><Upload className="h-4 w-4 mr-1" />批量导入Excel</Button>
        </div>
      </div>

      {/* Contest selector */}
      <div className="flex items-center gap-4">
        <div className="space-y-1">
          <Label>选择赛事</Label>
          <select value={contestId} onChange={e => setContestId(e.target.value)} className={`${selectCls} w-64`}>
            <option value="">请选择已结束的赛事</option>
            {contests.map(c => <option key={c.id} value={String(c.id)}>{c.title}</option>)}
          </select>
        </div>
        {contestId && !loading && (
          <div className="flex gap-4 text-sm pt-6">
            <span>报名人数：<strong>{regCount}</strong></span>
            <span>已录入成绩：<strong>{scoreCount}</strong></span>
            {unpublishedCount > 0 && <span className="text-amber-600">待发布：<strong>{unpublishedCount}</strong></span>}
            {scoreCount > 0 && unpublishedCount > 0 && (
              <Button size="sm" onClick={handlePublishAll}>一键发布全部</Button>
            )}
          </div>
        )}
      </div>

      {loading && <div className="text-center py-12 text-muted-foreground">加载中...</div>}

      {!loading && contestId && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>报名编号</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>手机号</TableHead>
              <TableHead>总分</TableHead>
              <TableHead>排名</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations.map(reg => {
              const result = getResultForReg(reg.id)
              return (
                <TableRow key={reg.id}>
                  <TableCell className="font-mono text-sm">{reg.registration_number}</TableCell>
                  <TableCell>{reg.form_data?.name || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{reg.form_data?.phone?.slice(0, 3) + '****' + (reg.form_data?.phone?.slice(7) || '')}</TableCell>
                  <TableCell className="font-bold">{result?.total_score ?? <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell>{result?.rank ?? '-'}</TableCell>
                  <TableCell>
                    {result ? (
                      result.is_published ? <Badge>已发布</Badge> : <Badge variant="secondary">草稿</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">未录入</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openScoreDialog(reg)}>
                      <Pencil className="h-3 w-3 mr-1" />{result ? '编辑' : '录入'}
                    </Button>
                    {result?.is_published && (
                      <Button variant="ghost" size="sm" onClick={() => handleWithdraw(result.id)}>
                        <X className="h-3 w-3 mr-1" />撤回
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
      {!loading && contestId && registrations.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">该赛事暂无报名记录</div>
      )}

      {/* Score entry dialog */}
      <Dialog open={!!editReg} onOpenChange={() => setEditReg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editReg ? `${editReg.form_data?.name || '-'} — ${editReg.registration_number}` : '录入成绩'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {Object.entries(editScores).map(([key, val]) => (
              <div key={key} className="space-y-1">
                <Label>{key}</Label>
                <Input type="number" value={val} onChange={e => setEditScores(prev => ({ ...prev, [key]: Number(e.target.value) }))} />
              </div>
            ))}
            <div className="text-sm font-medium">
              总分：{Object.values(editScores).reduce((s, v) => s + (Number(v) || 0), 0)}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveScores} disabled={saving}>{saving ? '保存中...' : '保存成绩'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
