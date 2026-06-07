import { useState } from 'react'
import { Link } from 'react-router-dom'
import { contests, getContestGroups, getRegistrations } from '@/mock/data'
import type { Contest } from '@/mock/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search } from 'lucide-react'

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: '草稿', variant: 'secondary' },
  open: { label: '报名中', variant: 'default' },
  ongoing: { label: '进行中', variant: 'outline' },
  finished: { label: '已结束', variant: 'secondary' },
  cancelled: { label: '已取消', variant: 'destructive' },
}

export default function ContestListPage() {
  const [items] = useState<Contest[]>(contests)
  const [keyword, setKeyword] = useState('')
  const [statusTab, setStatusTab] = useState('all')

  const filtered = items.filter(c => {
    if (keyword && !c.title.includes(keyword)) return false
    if (statusTab !== 'all' && c.status !== statusTab) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">赛事列表</h1>
        <Link to="/admin/contests/new"><Button><Plus className="h-4 w-4 mr-1" />创建赛事</Button></Link>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input placeholder="搜索标题..." className="pl-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
        </div>
      </div>
      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="draft">草稿</TabsTrigger>
          <TabsTrigger value="open">报名中</TabsTrigger>
          <TabsTrigger value="ongoing">进行中</TabsTrigger>
          <TabsTrigger value="finished">已结束</TabsTrigger>
          <TabsTrigger value="cancelled">已取消</TabsTrigger>
        </TabsList>
      </Tabs>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>标题</TableHead>
            <TableHead>组别</TableHead>
            <TableHead>报名时间</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>报名人数</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map(c => {
            const s = statusMap[c.status]
            const groups = getContestGroups(c.id)
            const regCount = getRegistrations(c.id).length
            const max = c.maxParticipants || '-'
            return (
              <TableRow key={c.id}>
                <TableCell className="font-medium max-w-[200px] truncate">
                  <Link to={`/admin/contests/${c.id}`} className="hover:text-primary">{c.title}</Link>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {groups.map(g => <Badge key={g.id} variant="outline" className="text-xs">{g.name}</Badge>)}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.registrationStart.split('T')[0]} ~ {c.registrationEnd.split('T')[0]}
                </TableCell>
                <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                <TableCell>{regCount} / {max}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.createdAt}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Link to={`/admin/contests/${c.id}`}><Button variant="ghost" size="sm">编辑</Button></Link>
                  <Link to={`/admin/registrations?contestId=${c.id}`}><Button variant="ghost" size="sm">报名</Button></Link>
                  {c.status === 'finished' && (
                    <Link to={`/admin/results?contestId=${c.id}`}><Button variant="ghost" size="sm">成绩</Button></Link>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
