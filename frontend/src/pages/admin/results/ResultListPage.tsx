import { useState, useEffect, useCallback } from 'react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Upload, Download, Eye } from 'lucide-react'

interface ResultItem { id: number; contest_id: number; registration_id: number; scores: Record<string, number>; total_score: number; rank: number | null; award_id: number | null; is_published: boolean; registration_number: string; contestant_name: string }
interface ContestItem { id: number; title: string }

export default function ResultListPage() {
  const [items, setItems] = useState<ResultItem[]>([])
  const [contests, setContests] = useState<ContestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [contestFilter, setContestFilter] = useState('all')
  const [publishTab, setPublishTab] = useState('all')
  const [editResult, setEditResult] = useState<ResultItem | null>(null)
  const [editScores, setEditScores] = useState<Record<string, number>>({})

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (contestFilter !== 'all') params.set('contest_id', contestFilter)
      if (publishTab === 'published') params.set('is_published', 'true')
      else if (publishTab === 'draft') params.set('is_published', 'false')
      if (keyword) params.set('keyword', keyword)
      const [res, cRes] = await Promise.all([
        api.get<{ items: ResultItem[] }>(`/admin/results?${params}`),
        api.get<{ items: ContestItem[] }>('/admin/contests'),
      ])
      setItems(res.items); setContests(cRes.items)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [keyword, contestFilter, publishTab])

  useEffect(() => { fetchData() }, [fetchData])

  const handlePublish = async (id: number) => { await api.patch(`/admin/results/${id}/publish`); fetchData() }
  const handleWithdraw = async (id: number) => {
    if (!confirm('确认撤下？')) return
    await api.patch(`/admin/results/${id}/withdraw`); fetchData()
  }
  const openEdit = (r: ResultItem) => { setEditResult(r); setEditScores({ ...r.scores }) }
  const saveEdit = async () => {
    if (!editResult) return
    const total = Object.values(editScores).reduce((s, v) => s + (Number(v) || 0), 0)
    await api.post('/admin/results', { contest_id: editResult.contest_id, registration_id: editResult.registration_id, scores: editScores, total_score: total })
    setEditResult(null); fetchData()
  }

  const handleDownloadTemplate = async () => {
    const token = sessionStorage.getItem('contest_hub_token')
    const res = await fetch('http://localhost:8000/api/admin/results/template', { headers: { Authorization: `Bearer ${token}` } })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'template.xlsx'; a.click()
  }

  const handleImport = async () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.xlsx'
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return
      const formData = new FormData(); formData.append('file', file)
      const token = sessionStorage.getItem('contest_hub_token')
      const res = await fetch(`http://localhost:8000/api/admin/results/import?contest_id=${contestFilter !== 'all' ? contestFilter : ''}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
      const data = await res.json()
      alert(`导入完成：成功 ${data.success_count} 条，失败 ${data.error_count} 条`)
      fetchData()
    }
    input.click()
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">加载中...</div>

  const finishedContests = contests.filter(c => {
    const found = items.find(i => i.contest_id === c.id)
    return found || c.title.includes('已结束')
  }).slice(0, 10)
  if (finishedContests.length === 0) {
    contests.filter(c => c.title).slice(0, 10).forEach(c => { if (!finishedContests.find(f => f.id === c.id)) finishedContests.push(c) })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">成绩管理</h1>
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}><Download className="h-4 w-4 mr-1" />下载模板</Button>
          <Button variant="outline" size="sm" onClick={handleImport}><Upload className="h-4 w-4 mr-1" />批量导入</Button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs"><Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" /><Input placeholder="搜索姓名/编号..." className="pl-8" value={keyword} onChange={e => setKeyword(e.target.value)} /></div>
        <Select value={contestFilter} onValueChange={(v) => setContestFilter(v ?? 'all')}>
          <SelectTrigger className="w-48"><SelectValue placeholder="选择赛事" /></SelectTrigger>
          <SelectContent><SelectItem value="all">全部赛事</SelectItem>{finishedContests.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Tabs value={publishTab} onValueChange={setPublishTab}><TabsList><TabsTrigger value="all">全部</TabsTrigger><TabsTrigger value="published">已发布</TabsTrigger><TabsTrigger value="draft">草稿</TabsTrigger></TabsList></Tabs>
      <Table>
        <TableHeader><TableRow><TableHead>报名编号</TableHead><TableHead>姓名</TableHead><TableHead>总分</TableHead><TableHead>排名</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
        <TableBody>
          {items.map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-sm">{r.registration_number || '-'}</TableCell>
              <TableCell>{r.contestant_name || '-'}</TableCell>
              <TableCell className="font-bold">{r.total_score}</TableCell>
              <TableCell>{r.rank ?? '-'}</TableCell>
              <TableCell><Badge variant={r.is_published ? 'default' : 'secondary'}>{r.is_published ? '已发布' : '草稿'}</Badge></TableCell>
              <TableCell className="text-right space-x-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Eye className="h-3 w-3" /></Button>
                {r.is_published ? <Button variant="ghost" size="sm" onClick={() => handleWithdraw(r.id)}>撤回</Button> : <Button variant="ghost" size="sm" onClick={() => handlePublish(r.id)}>发布</Button>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!editResult} onOpenChange={() => setEditResult(null)}>
        <DialogContent><DialogHeader><DialogTitle>编辑成绩</DialogTitle></DialogHeader>
          {editResult && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">编号：{editResult.registration_number} | 姓名：{editResult.contestant_name}</div>
              {Object.entries(editScores).map(([key, val]) => (
                <div key={key} className="space-y-1"><Label>{key}</Label><Input type="number" value={val} onChange={e => setEditScores(prev => ({ ...prev, [key]: Number(e.target.value) }))} /></div>
              ))}
              <div className="text-sm">总分：{Object.values(editScores).reduce((s, v) => s + (Number(v) || 0), 0)}</div>
            </div>
          )}
          <DialogFooter><Button onClick={saveEdit}>保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
