import { useState, useEffect, useCallback } from 'react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface Group { id: number; name: string; description: string; max_participants: number; sort_order: number }

export default function GroupManagementPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(false)
  const [edit, setEdit] = useState<Partial<Group> | null>(null)

  const fetchGroups = useCallback(async () => {
    try {
      const res = await api.get<{ items: Group[] }>('/admin/groups')
      setGroups(res.items)
    } finally { setLoading(false) }
  }, [])

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
        <div>
          <h1 className="text-2xl font-bold">组别管理</h1>
          <p className="text-muted-foreground text-sm mt-1">管理全局参赛组别，创建赛事时可直接选用</p>
        </div>
        <Button onClick={() => { setEdit({ name: '', description: '', max_participants: 0, sort_order: groups.length + 1 }); setDialog(true) }}>
          <Plus className="h-4 w-4 mr-1" />添加组别
        </Button>
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead>排序</TableHead><TableHead>组别名称</TableHead><TableHead>说明</TableHead>
          <TableHead>人数上限</TableHead><TableHead className="text-right">操作</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {groups.map(g => (
            <TableRow key={g.id}>
              <TableCell className="w-20">{g.sort_order}</TableCell>
              <TableCell className="font-medium">{g.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{g.description || '-'}</TableCell>
              <TableCell>{g.max_participants || '不限'}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button variant="ghost" size="sm" onClick={() => { setEdit({ ...g }); setDialog(true) }}><Pencil className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(g)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? '编辑组别' : '添加组别'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>组别名称</Label><Input value={edit?.name || ''} onChange={e => setEdit(p => p ? { ...p, name: e.target.value } : null)} placeholder="如：小学组、初中组、高中组、大学组" /></div>
            <div className="space-y-1"><Label>说明</Label><Input value={edit?.description || ''} onChange={e => setEdit(p => p ? { ...p, description: e.target.value } : null)} placeholder="如：1-6年级在校学生" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>人数上限（0=不限）</Label><Input type="number" value={edit?.max_participants || 0} onChange={e => setEdit(p => p ? { ...p, max_participants: Number(e.target.value) } : null)} /></div>
              <div className="space-y-1"><Label>排序</Label><Input type="number" value={edit?.sort_order || 0} onChange={e => setEdit(p => p ? { ...p, sort_order: Number(e.target.value) } : null)} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave}>保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
