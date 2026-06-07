import { useState, useEffect, useCallback } from 'react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface Group { id: number; contest_id: number; name: string; description: string; max_participants: number; sort_order: number }
interface Contest { id: number; title: string }

export default function GroupManagementPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [contests, setContests] = useState<Contest[]>([])
  const [contestFilter, setContestFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(false)
  const [edit, setEdit] = useState<Partial<Group> | null>(null)

  const fetchGroups = useCallback(async () => {
    try {
      const params = contestFilter !== 'all' ? `?contest_id=${contestFilter}` : ''
      const [gRes, cRes] = await Promise.all([
        api.get<{ items: Group[] }>(`/admin/groups${params}`),
        api.get<{ items: Contest[] }>('/admin/contests'),
      ])
      setGroups(gRes.items); setContests(cRes.items)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [contestFilter])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  const handleSave = async () => {
    if (!edit?.name?.trim()) return alert('请输入组别名称')
    try {
      if (edit?.id) await api.put(`/admin/groups/${edit.id}`, edit)
      else await api.post('/admin/groups', edit)
      setDialog(false); fetchGroups()
    } catch (e) { alert('保存失败') }
  }

  const handleDelete = async (g: Group) => {
    if (!confirm(`确认删除组别「${g.name}」？`)) return
    await api.delete(`/admin/groups/${g.id}`)
    fetchGroups()
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">加载中...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">组别管理</h1>
        <Button onClick={() => { setEdit({ contest_id: 0, name: '', description: '', max_participants: 0, sort_order: 0 }); setDialog(true) }}>
          <Plus className="h-4 w-4 mr-1" />添加组别
        </Button>
      </div>
      <Select value={contestFilter} onValueChange={(v) => setContestFilter(v ?? 'all')}>
        <SelectTrigger className="w-64"><SelectValue placeholder="按赛事筛选" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部赛事</SelectItem>
          {contests.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
        </SelectContent>
      </Select>
      <Table>
        <TableHeader><TableRow>
          <TableHead>赛事</TableHead><TableHead>组别名称</TableHead><TableHead>说明</TableHead>
          <TableHead>人数上限</TableHead><TableHead>排序</TableHead><TableHead className="text-right">操作</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {groups.map(g => {
            const ct = contests.find(c => c.id === g.contest_id)
            return (
              <TableRow key={g.id}>
                <TableCell className="text-sm max-w-[200px] truncate">{ct?.title || `赛事 #${g.contest_id}`}</TableCell>
                <TableCell className="font-medium">{g.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{g.description || '-'}</TableCell>
                <TableCell>{g.max_participants || '不限'}</TableCell>
                <TableCell>{g.sort_order}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => { setEdit({ ...g }); setDialog(true) }}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(g)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? '编辑组别' : '添加组别'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>所属赛事</Label>
              <Select value={String(edit?.contest_id || '')} onValueChange={(v) => setEdit(p => p ? { ...p, contest_id: Number(v) } : null)}>
                <SelectTrigger><SelectValue placeholder="选择赛事" /></SelectTrigger>
                <SelectContent>{contests.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>组别名称</Label><Input value={edit?.name || ''} onChange={e => setEdit(p => p ? { ...p, name: e.target.value } : null)} /></div>
            <div className="space-y-1"><Label>说明</Label><Input value={edit?.description || ''} onChange={e => setEdit(p => p ? { ...p, description: e.target.value } : null)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>人数上限</Label><Input type="number" value={edit?.max_participants || 0} onChange={e => setEdit(p => p ? { ...p, max_participants: Number(e.target.value) } : null)} /></div>
              <div className="space-y-1"><Label>排序</Label><Input type="number" value={edit?.sort_order || 0} onChange={e => setEdit(p => p ? { ...p, sort_order: Number(e.target.value) } : null)} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave}>保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
