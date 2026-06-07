import { useState, useEffect } from 'react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface Category { id: number; name: string; sort_order: number }

export default function NewsCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  const fetchData = async () => {
    try { setCategories(await api.get<Category[]>('/admin/news/categories')) } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { fetchData() }, [])

  const handleAdd = async () => {
    const cat = await api.post<Category>('/admin/news/categories', { name: '新分类', sort_order: categories.length + 1 })
    setCategories([...categories, cat])
    setEditingId(cat.id); setEditName(cat.name)
  }

  const handleSave = async (id: number) => {
    if (!editName.trim()) return alert('分类名称不可为空')
    await api.put(`/admin/news/categories/${id}`, { name: editName })
    fetchData(); setEditingId(null)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除该分类？')) return
    await api.delete(`/admin/news/categories/${id}`)
    fetchData()
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">加载中...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">新闻分类</h1>
        <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />添加分类</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>排序</TableHead><TableHead>分类名称</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
        <TableBody>
          {categories.map(c => (
            <TableRow key={c.id}>
              <TableCell className="w-20">{c.sort_order}</TableCell>
              <TableCell>
                {editingId === c.id ? (
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="w-40" autoFocus />
                ) : c.name}
              </TableCell>
              <TableCell className="text-right space-x-1">
                {editingId === c.id ? (
                  <Button size="sm" onClick={() => handleSave(c.id)}>保存</Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => { setEditingId(c.id); setEditName(c.name) }}><Pencil className="h-3 w-3" /></Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
