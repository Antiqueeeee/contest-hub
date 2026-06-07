import { useState } from 'react'
import { registrations, contests, getContestTitle, getGroupName } from '@/mock/data'
import type { Registration } from '@/mock/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Eye, Trash2 } from 'lucide-react'

export default function RegistrationListPage() {
  const [items] = useState<Registration[]>(registrations)
  const [keyword, setKeyword] = useState('')
  const [contestFilter, setContestFilter] = useState('all')
  const [detail, setDetail] = useState<Registration | null>(null)

  const filtered = items.filter(r => {
    if (contestFilter !== 'all' && String(r.contestId) !== contestFilter) return false
    if (keyword && !(r.registrationNumber.includes(keyword) || (r.formData.name ?? '').includes(keyword) || (r.formData.phone ?? '').includes(keyword))) return false
    return true
  })

  const handleDelete = (r: Registration) => {
    if (!confirm(`确认删除 ${r.formData.name ?? r.registrationNumber} 的报名记录？`)) return
    alert('已删除（Mock），数据将在30天后自动清除')
  }

  const maskPhone = (phone: string) => phone ? phone.slice(0, 3) + '****' + phone.slice(7) : '-'

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">报名管理</h1>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input placeholder="搜索姓名/手机号/报名编号..." className="pl-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
        </div>
        <Select value={contestFilter} onValueChange={(v) => setContestFilter(v ?? 'all')}>
          <SelectTrigger className="w-48"><SelectValue placeholder="选择赛事" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部赛事</SelectItem>
            {contests.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>报名编号</TableHead>
            <TableHead>姓名</TableHead>
            <TableHead>手机号</TableHead>
            <TableHead>赛事</TableHead>
            <TableHead>组别</TableHead>
            <TableHead>报名时间</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-sm">{r.registrationNumber}</TableCell>
              <TableCell>{r.formData.name ?? '-'}</TableCell>
              <TableCell>{maskPhone(r.formData.phone ?? '')}</TableCell>
              <TableCell className="max-w-[150px] truncate text-sm">{getContestTitle(r.contestId)}</TableCell>
              <TableCell>{getGroupName(r.contestId, r.groupId)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{r.submittedAt}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button variant="ghost" size="sm" onClick={() => setDetail(r)}><Eye className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(r)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>报名详情</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">报名编号</span><span className="font-mono">{detail.registrationNumber}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">赛事</span><span>{getContestTitle(detail.contestId)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">组别</span><span>{getGroupName(detail.contestId, detail.groupId)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">报名时间</span><span>{detail.submittedAt}</span></div>
              <hr />
              {Object.entries(detail.formData).map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span>{v || '-'}</span></div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
