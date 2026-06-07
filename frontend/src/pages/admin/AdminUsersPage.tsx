import { useState, useEffect } from 'react'
import { api } from '@/api/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserPlus, Pencil, Ban, KeyRound } from 'lucide-react'

interface User { id: number; username: string; name: string; phone: string; status: string; last_login_at: string | null; created_at: string }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<{ username: string; password: string; name: string; phone: string; id?: number } | null>(null)
  const { user: currentUser } = useAuth()

  const fetchUsers = async () => {
    try { const res = await api.get<{ items: User[] }>('/admin/users'); setUsers(res.items) } catch (e) { console.error(e) } finally { setLoading(false) }
  }
  useEffect(() => { fetchUsers() }, [])

  const handleAdd = () => { setEditing({ username: '', password: '', name: '', phone: '' }); setDialogOpen(true) }
  const handleEdit = (u: User) => { setEditing({ id: u.id, username: u.username, password: '', name: u.name, phone: u.phone }); setDialogOpen(true) }

  const handleSave = async () => {
    if (!editing) return
    try {
      if (editing.id) await api.put(`/admin/users/${editing.id}`, { name: editing.name, phone: editing.phone })
      else await api.post('/admin/users', { username: editing.username, password: editing.password, name: editing.name, phone: editing.phone })
      setDialogOpen(false); fetchUsers()
    } catch (e) { alert(e instanceof Error ? e.message : '操作失败') }
  }

  const handleToggleStatus = async (u: User) => {
    await api.patch(`/admin/users/${u.id}/status`)
    fetchUsers()
  }

  const handleResetPassword = async (u: User) => {
    const res = await api.post<{ message: string }>(`/admin/users/${u.id}/reset-password`)
    alert(res.message)
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">加载中...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">管理员管理</h1><Button onClick={handleAdd}><UserPlus className="h-4 w-4 mr-1" />添加管理员</Button></div>
      <Table>
        <TableHeader><TableRow><TableHead>用户名</TableHead><TableHead>姓名</TableHead><TableHead>手机号</TableHead><TableHead>状态</TableHead><TableHead>最后登录</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
        <TableBody>
          {users.map(u => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.username}</TableCell><TableCell>{u.name}</TableCell><TableCell>{u.phone}</TableCell>
              <TableCell><Badge variant={u.status === 'active' ? 'default' : 'secondary'}>{u.status === 'active' ? '正常' : '已禁用'}</Badge></TableCell>
              <TableCell className="text-muted-foreground text-sm">{u.last_login_at?.split('.')[0] || '从未登录'}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(u)}><Pencil className="h-3 w-3" /></Button>
                {u.id !== currentUser?.id && <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(u)}><Ban className="h-3 w-3" /></Button>}
                <Button variant="ghost" size="sm" onClick={() => handleResetPassword(u)}><KeyRound className="h-3 w-3" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editing?.id ? '编辑管理员' : '添加管理员'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>用户名</Label><Input value={editing?.username ?? ''} onChange={e => setEditing(p => p ? { ...p, username: e.target.value } : null)} disabled={!!editing?.id} /></div>
            <div className="space-y-1"><Label>姓名</Label><Input value={editing?.name ?? ''} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} /></div>
            <div className="space-y-1"><Label>手机号</Label><Input value={editing?.phone ?? ''} onChange={e => setEditing(p => p ? { ...p, phone: e.target.value } : null)} /></div>
            {!editing?.id && <div className="space-y-1"><Label>密码</Label><Input type="password" value={editing?.password ?? ''} onChange={e => setEditing(p => p ? { ...p, password: e.target.value } : null)} placeholder="6-20位" /></div>}
          </div>
          <DialogFooter><Button onClick={handleSave}>保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
