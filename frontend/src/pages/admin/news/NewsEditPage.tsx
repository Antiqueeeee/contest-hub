import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Category { id: number; name: string }
interface NewsItem { id?: number; title: string; category_id: number; content: string; cover_image: string }

export default function NewsEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [content, setContent] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get<Category[]>('/admin/news/categories').then(setCategories)
    if (!isNew) {
      api.get<NewsItem>(`/admin/news/${id}`).then(n => {
        setTitle(n.title); setCategoryId(String(n.category_id)); setContent(n.content)
      })
    }
  }, [id, isNew])

  const handleSave = async () => {
    if (!title.trim()) return alert('请输入标题')
    setSaving(true)
    try {
      const data = { title, category_id: Number(categoryId), content }
      if (isNew) await api.post('/admin/news', data)
      else await api.put(`/admin/news/${id}`, data)
      navigate('/admin/news')
    } catch (e) { alert(e instanceof Error ? e.message : '保存失败') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isNew ? '新建新闻' : '编辑新闻'}</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => navigate('/admin/news')}>返回</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">基本信息</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1"><Label>标题 <span className="text-destructive">*</span></Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} placeholder="请输入新闻标题" />
          </div>
          <div className="space-y-1"><Label>分类</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? '')}>
              <SelectTrigger><SelectValue placeholder="选择分类" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>正文</Label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} className="min-h-[300px] font-mono text-sm" placeholder="支持 HTML 格式" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
