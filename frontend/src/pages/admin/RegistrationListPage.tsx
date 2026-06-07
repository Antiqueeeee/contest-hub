import { useState, useEffect, useCallback } from 'react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Eye, Trash2 } from 'lucide-react'

interface RegItem { id: number; contest_id: number; group_id: number | null; registration_number: string; form_data: Record<string, string>; submitted_at: string }
interface ContestItem { id: number; title: string }

export default function RegistrationListPage() {
  const [items, setItems] = useState<RegItem[]>([])
  const [contests, setContests] = useState<ContestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [contestFilter, setContestFilter] = useState('all')
  const [detail, setDetail] = useState<RegItem | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (contestFilter !== 'all') params.set('contest_id', contestFilter)
      if (keyword) params.set('keyword', keyword)
      const [regRes, contestRes] = await Promise.all([
        api.get<{ items: RegItem[] }>(`/admin/registrations?${params}`),
        api.get<{ items: ContestItem[] }>('/admin/contests'),
      ])
      setItems(regRes.items); setContests(contestRes.items)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [keyword, contestFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = async (r: RegItem) => {
    if (!confirm(`确认删除 ${r.form_data?.name ?? r.registration_number} 的报名记录？`)) return
    await api.delete(`/admin/registrations/${r.id}`)
    fetchData()
  }

  const maskPhone = (phone: string) => phone ? phone.slice(0, 3) + '****' + phone.slice(7) : '-'

  if (loading) return <div className="text-center py-12 text-muted-foreground">加载中...</div>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">报名管理</h1>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs"><Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" /><Input placeholder="搜索姓名/编号..." className="pl-8" value={keyword} onChange={e => setKeyword(e.target.value)} /></div>
        <Select value={contestFilter} onValueChange={(v) => setContestFilter(v ?? 'all')}>
          <SelectTrigger className="w-48"><SelectValue placeholder="选择赛事" /></SelectTrigger>
          <SelectContent><SelectItem value="all">全部赛事</SelectItem>{contests.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>报名编号</TableHead><TableHead>姓名</TableHead><TableHead>手机号</TableHead><TableHead>报名时间</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
        <TableBody>
          {items.map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-sm">{r.registration_number}</TableCell>
              <TableCell>{r.form_data?.name ?? '-'}</TableCell>
              <TableCell>{maskPhone(r.form_data?.phone ?? '')}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{r.submitted_at?.split('.')[0]}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button variant="ghost" size="sm" onClick={() => setDetail(r)}><Eye className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(r)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>报名详情</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">报名编号</span><span className="font-mono">{detail.registration_number}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">报名时间</span><span>{detail.submitted_at?.split('.')[0]}</span></div><hr />
              {Object.entries(detail.form_data || {}).map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span>{v || '-'}</span></div>)}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
