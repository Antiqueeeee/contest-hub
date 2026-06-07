import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search } from 'lucide-react'

interface ContestItem {
  id: number; title: string; status: string; max_participants: number
  registration_start: string; registration_end: string; created_at: string
  groups: { id: number; name: string }[]
}

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: '草稿', variant: 'secondary' },
  open: { label: '报名中', variant: 'default' },
  ongoing: { label: '进行中', variant: 'outline' },
  finished: { label: '已结束', variant: 'secondary' },
  cancelled: { label: '已取消', variant: 'destructive' },
}

export default function ContestListPage() {
  const [items, setItems] = useState<ContestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [statusTab, setStatusTab] = useState('all')

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (keyword) params.set('keyword', keyword)
      if (statusTab !== 'all') params.set('status', statusTab)
      const res = await api.get<{ items: ContestItem[] }>(`/admin/contests?${params}`)
      setItems(res.items)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [keyword, statusTab])

  useEffect(() => { fetchData() }, [fetchData])

  const handleStatusChange = useCallback(async (contestId: number, newStatus: string) => {
    const labels: Record<string, string> = { open: '确认发布该赛事？发布后选手即可报名', ongoing: '确认关闭报名？', finished: '确认结束该比赛？', cancelled: '确认取消该赛事？此操作不可恢复' }
    if (!confirm(labels[newStatus] || `确认将状态改为 ${newStatus}？`)) return
    await api.patch(`/admin/contests/${contestId}/status?status=${newStatus}`)
    fetchData()
  }, [fetchData])

  if (loading) return <div className="text-center py-12 text-muted-foreground">加载中...</div>

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
          <TabsTrigger value="all">全部</TabsTrigger><TabsTrigger value="draft">草稿</TabsTrigger>
          <TabsTrigger value="open">报名中</TabsTrigger><TabsTrigger value="ongoing">进行中</TabsTrigger>
          <TabsTrigger value="finished">已结束</TabsTrigger><TabsTrigger value="cancelled">已取消</TabsTrigger>
        </TabsList>
      </Tabs>
      <Table>
        <TableHeader><TableRow>
          <TableHead>标题</TableHead><TableHead>组别</TableHead><TableHead>报名时间</TableHead>
          <TableHead>状态</TableHead><TableHead>创建时间</TableHead><TableHead className="text-right">操作</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {items.map(c => {
            const s = statusMap[c.status] || { label: c.status, variant: 'outline' as const }
            return (
              <TableRow key={c.id}>
                <TableCell className="font-medium max-w-[200px] truncate">
                  <Link to={`/admin/contests/${c.id}`} className="hover:text-primary">{c.title}</Link>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">{c.groups?.map(g => <Badge key={g.id} variant="outline" className="text-xs">{g.name}</Badge>)}</div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.registration_start?.split('T')[0]} ~ {c.registration_end?.split('T')[0]}</TableCell>
                <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.created_at?.split('T')[0]}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Link to={`/admin/contests/${c.id}`}><Button variant="ghost" size="sm">编辑</Button></Link>
                  {c.status === 'draft' && <Button variant="ghost" size="sm" onClick={() => handleStatusChange(c.id, 'open')} className="text-green-600">发布</Button>}
                  {c.status === 'open' && <Button variant="ghost" size="sm" onClick={() => handleStatusChange(c.id, 'ongoing')}>截止报名</Button>}
                  {c.status === 'ongoing' && <Button variant="ghost" size="sm" onClick={() => handleStatusChange(c.id, 'finished')}>结束比赛</Button>}
                  {c.status === 'open' && <Button variant="ghost" size="sm" onClick={() => handleStatusChange(c.id, 'cancelled')} className="text-destructive">取消</Button>}
                  {(c.status === 'open' || c.status === 'ongoing') && <Link to={`/admin/registrations?contestId=${c.id}`}><Button variant="ghost" size="sm">报名</Button></Link>}
                  {c.status === 'finished' && <Link to={`/admin/results?contest_id=${c.id}`}><Button variant="ghost" size="sm">成绩</Button></Link>}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
