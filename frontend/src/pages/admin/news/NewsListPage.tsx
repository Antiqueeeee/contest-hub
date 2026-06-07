import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search, Pin, PinOff } from 'lucide-react'

interface NewsItem { id: number; title: string; category_id: number; is_pinned: boolean; status: string; published_at: string | null; created_at: string }
interface Category { id: number; name: string }

export default function NewsListPage() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (keyword) params.set('keyword', keyword)
      if (categoryFilter !== 'all') params.set('category_id', categoryFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const [newsRes, catRes] = await Promise.all([
        api.get<{ items: NewsItem[] }>(`/admin/news?${params}`),
        api.get<Category[]>('/admin/news/categories'),
      ])
      setItems(newsRes.items)
      setCategories(catRes)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [keyword, categoryFilter, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const togglePin = async (id: number, current: boolean) => {
    await api.put(`/admin/news/${id}`, { is_pinned: !current })
    fetchData()
  }

  const updateStatus = async (id: number, status: string) => {
    await api.patch(`/admin/news/${id}/status?status=${status}`)
    fetchData()
  }

  const deleteNews = async (id: number) => {
    if (!confirm('确认删除该新闻？')) return
    await api.delete(`/admin/news/${id}`)
    fetchData()
  }

  const catLabels: Record<number, string> = {}
  categories.forEach(c => catLabels[c.id] = c.name)

  const statusBadge = (status: string) => {
    const map: Record<string, 'default' | 'secondary' | 'outline'> = { published: 'default', draft: 'secondary', archived: 'outline' }
    const labels: Record<string, string> = { published: '已发布', draft: '草稿', archived: '已归档' }
    return <Badge variant={map[status]}>{labels[status]}</Badge>
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">加载中...</div>

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
            {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
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
          {items.map(n => (
            <TableRow key={n.id}>
              <TableCell className="font-medium max-w-[300px] truncate">
                <Link to={`/admin/news/${n.id}`} className="hover:text-primary">{n.title}</Link>
              </TableCell>
              <TableCell><Badge variant="outline">{catLabels[n.category_id] || '未知'}</Badge></TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => togglePin(n.id, n.is_pinned)}>
                  {n.is_pinned ? <Pin className="h-3 w-3 text-orange-500" /> : <PinOff className="h-3 w-3 text-muted-foreground" />}
                </Button>
              </TableCell>
              <TableCell>{statusBadge(n.status)}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{n.published_at?.split('T')[0] ?? '-'}</TableCell>
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
