import { useState } from 'react'
import { users } from '@/mock/data'
import type { User } from '@/mock/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserPlus, Pencil, Ban, KeyRound } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function AdminUsersPage() {
  const [adminUsers, setAdminUsers] = useState<User[]>(users)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null)
  const { user: currentUser } = useAuth()

  const handleAdd = () => {
    setEditingUser({ username: '', name: '', phone: '', status: 'active' })
    setDialogOpen(true)
  }

  const handleEdit = (u: User) => {
    setEditingUser({ ...u })
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!editingUser) return
    if (editingUser.id) {
      setAdminUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...editingUser } as User : u))
    } else {
      const newUser: User = {
        id: Math.max(...adminUsers.map(u => u.id)) + 1,
        username: editingUser.username ?? '',
        name: editingUser.name ?? '',
        phone: editingUser.phone ?? '',
        status: (editingUser.status as 'active') ?? 'active',
        lastLoginAt: '',
        createdAt: new Date().toISOString().split('T')[0],
      }
      setAdminUsers([...adminUsers, newUser])
    }
    setDialogOpen(false)
    setEditingUser(null)
  }

  const handleToggleStatus = (u: User) => {
    setAdminUsers(prev => prev.map(au => au.id === u.id ? { ...au, status: au.status === 'active' ? 'disabled' as const : 'active' as const } : au))
  }

  const handleResetPassword = (u: User) => {
    alert(`已重置用户「${u.name}」的密码为随机密码，请通知其尽快修改。`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">管理员管理</h1>
        <Button onClick={handleAdd}><UserPlus className="h-4 w-4 mr-1" />添加管理员</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>用户名</TableHead>
            <TableHead>姓名</TableHead>
            <TableHead>手机号</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>最后登录</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {adminUsers.map(u => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.username}</TableCell>
              <TableCell>{u.name}</TableCell>
              <TableCell>{u.phone}</TableCell>
              <TableCell>
                <Badge variant={u.status === 'active' ? 'default' : 'secondary'}>
                  {u.status === 'active' ? '正常' : '已禁用'}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{u.lastLoginAt || '从未登录'}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(u)}><Pencil className="h-3 w-3" /></Button>
                {u.id !== currentUser?.id && (
                  <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(u)}>
                    <Ban className="h-3 w-3" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => handleResetPassword(u)}><KeyRound className="h-3 w-3" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingUser?.id ? '编辑管理员' : '添加管理员'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>用户名</Label>
              <Input value={editingUser?.username ?? ''} onChange={e => setEditingUser(prev => prev ? { ...prev, username: e.target.value } : null)} />
            </div>
            <div className="space-y-1">
              <Label>姓名</Label>
              <Input value={editingUser?.name ?? ''} onChange={e => setEditingUser(prev => prev ? { ...prev, name: e.target.value } : null)} />
            </div>
            <div className="space-y-1">
              <Label>手机号</Label>
              <Input value={editingUser?.phone ?? ''} onChange={e => setEditingUser(prev => prev ? { ...prev, phone: e.target.value } : null)} />
            </div>
            {!editingUser?.id && (
              <div className="space-y-1">
                <Label>密码</Label>
                <Input type="password" placeholder="请输入初始密码" />
              </div>
            )}
          </div>
          <DialogFooter><Button onClick={handleSave}>保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
