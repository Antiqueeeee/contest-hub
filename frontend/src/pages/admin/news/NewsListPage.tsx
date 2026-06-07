import { useState } from 'react'
import { Link } from 'react-router-dom'
import { newsList, getNewsCategoryName } from '@/mock/data'
import type { News } from '@/mock/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search, Pin, PinOff } from 'lucide-react'
import { newsCategories } from '@/mock/data'

export default function NewsListPage() {
  const [items, setItems] = useState<News[]>(newsList)
  const [keyword, setKeyword] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = items.filter(n => {
    if (keyword && !n.title.includes(keyword)) return false
    if (categoryFilter !== 'all' && String(n.categoryId) !== categoryFilter) return false
    if (statusFilter !== 'all' && n.status !== statusFilter) return false
    return true
  })

  const togglePin = (id: number) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n))
  }

  const updateStatus = (id: number, status: News['status']) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, status, publishedAt: status === 'published' ? new Date().toISOString() : n.publishedAt } : n))
  }

  const deleteNews = (id: number) => {
    if (!confirm('确认删除该新闻？')) return
    setItems(prev => prev.filter(n => n.id !== id))
  }

  const statusBadge = (status: string) => {
    const map: Record<string, 'default' | 'secondary' | 'outline'> = { published: 'default', draft: 'secondary', archived: 'outline' }
    const labels: Record<string, string> = { published: '已发布', draft: '草稿', archived: '已归档' }
    return <Badge variant={map[status]}>{labels[status]}</Badge>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">新闻列表</h1>
        <Link to="/admin/news/new"><Button><Plus className="h-4 w-4 mr-1" />新建新闻</Button></Link>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input placeholder="搜索标题..." className="pl-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? 'all')}>
          <SelectTrigger className="w-32"><SelectValue placeholder="分类" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {newsCategories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-28"><SelectValue placeholder="状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="published">已发布</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
            <SelectItem value="archived">已归档</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>标题</TableHead>
            <TableHead>分类</TableHead>
            <TableHead>置顶</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>发布时间</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map(n => (
            <TableRow key={n.id}>
              <TableCell className="font-medium max-w-[300px] truncate">
                <Link to={`/admin/news/${n.id}`} className="hover:text-primary">{n.title}</Link>
              </TableCell>
              <TableCell><Badge variant="outline">{getNewsCategoryName(n.categoryId)}</Badge></TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => togglePin(n.id)}>
                  {n.isPinned ? <Pin className="h-3 w-3 text-orange-500" /> : <PinOff className="h-3 w-3 text-muted-foreground" />}
                </Button>
              </TableCell>
              <TableCell>{statusBadge(n.status)}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{n.publishedAt?.split(' ')[0] ?? '-'}</TableCell>
              <TableCell className="text-right space-x-1">
                <Link to={`/admin/news/${n.id}`}><Button variant="ghost" size="sm">编辑</Button></Link>
                {n.status === 'draft' && <Button variant="ghost" size="sm" onClick={() => updateStatus(n.id, 'published')}>发布</Button>}
                {n.status === 'published' && <Button variant="ghost" size="sm" onClick={() => updateStatus(n.id, 'archived')}>归档</Button>}
                <Button variant="ghost" size="sm" onClick={() => deleteNews(n.id)} className="text-destructive">删除</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
