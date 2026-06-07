import { useState } from 'react'
import { newsCategories } from '@/mock/data'
import type { NewsCategory } from '@/mock/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export default function NewsCategoriesPage() {
  const [categories, setCategories] = useState<NewsCategory[]>(newsCategories)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  const handleAdd = () => {
    const newCat: NewsCategory = { id: Math.max(...categories.map(c => c.id)) + 1, name: '新分类', sortOrder: categories.length + 1 }
    setCategories([...categories, newCat])
    setEditingId(newCat.id)
    setEditName(newCat.name)
  }

  const handleSave = (id: number) => {
    if (!editName.trim()) { alert('分类名称不可为空'); return }
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name: editName } : c))
    setEditingId(null)
  }

  const handleDelete = (id: number) => {
    if (!confirm('确认删除该分类？')) return
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">新闻分类</h1>
        <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />添加分类</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>排序</TableHead>
            <TableHead>分类名称</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map(c => (
            <TableRow key={c.id}>
              <TableCell className="w-20">{c.sortOrder}</TableCell>
              <TableCell>
                {editingId === c.id ? (
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="w-40" autoFocus />
                ) : (
                  c.name
                )}
              </TableCell>
              <TableCell className="text-right space-x-1">
                {editingId === c.id ? (
                  <Button size="sm" onClick={() => handleSave(c.id)}>保存</Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => { setEditingId(c.id); setEditName(c.name) }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
