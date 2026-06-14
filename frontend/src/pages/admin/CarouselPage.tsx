import { useState, useEffect, useRef } from 'react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Upload, GripVertical } from 'lucide-react'

interface SlideItem {
  id: number
  title: string
  image_url: string
  link_url: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

const EMPTY_FORM = { title: '', image_url: '', link_url: '', sort_order: 0, is_active: true }

export default function CarouselPage() {
  const [slides, setSlides] = useState<SlideItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [, setDragId] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchSlides = () => {
    api.get<{ items: SlideItem[] }>('/admin/carousel').then(r => setSlides(r.items)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetchSlides() }, [])

  const openNew = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, sort_order: slides.length })
    setDialogOpen(true)
  }

  const openEdit = (s: SlideItem) => {
    setEditingId(s.id)
    setForm({ title: s.title, image_url: s.image_url, link_url: s.link_url, sort_order: s.sort_order, is_active: s.is_active })
    setDialogOpen(true)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await api.upload<{ url: string }>('/admin/upload', file)
      setForm(f => ({ ...f, image_url: res.url }))
    } catch (err: any) {
      alert(err.message || '上传失败')
    } finally { setUploading(false) }
  }

  const handleSave = async () => {
    if (!form.image_url) { alert('请上传轮播图'); return }
    setSaving(true)
    try {
      if (editingId) {
        await api.put(`/admin/carousel/${editingId}`, form)
      } else {
        await api.post('/admin/carousel', form)
      }
      setDialogOpen(false)
      fetchSlides()
    } catch (err: any) {
      alert(err.message || '保存失败')
    } finally { setSaving(false) }
  }

  const handleDelete = async (s: SlideItem) => {
    if (!confirm(`确定删除「${s.title || '无标题'}」吗？图片文件将同时删除。`)) return
    try {
      await api.delete(`/admin/carousel/${s.id}`)
      fetchSlides()
    } catch (err: any) {
      alert(err.message || '删除失败')
    }
  }

  const toggleActive = async (s: SlideItem) => {
    try {
      await api.put(`/admin/carousel/${s.id}`, { ...s, is_active: !s.is_active })
      fetchSlides()
    } catch (err: any) {
      alert(err.message || '操作失败')
    }
  }

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= slides.length) return
    const updated = [...slides]
    const [moved] = updated.splice(index, 1)
    updated.splice(target, 0, moved)
    const items = updated.map((s, i) => ({ id: s.id, sort_order: i }))
    // Optimistic update
    setSlides(updated.map((s, i) => ({ ...s, sort_order: i })))
    try {
      await api.put('/admin/carousel/reorder', { items })
    } catch {
      fetchSlides() // rollback
    }
  }

  const handleDragStart = (id: number) => setDragId(id)
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault() }
  const handleDrop = (targetId: number) => {
    setDragId(null)
    const srcIdx = slides.findIndex(s => s.id === targetId)
    // ... simplified: reorder is handled by move buttons; drag just highlights
    // In a real implementation we'd compute the new order from drag state
    // For now, up/down buttons handle reordering reliably
    if (srcIdx < 0) return
  }

  if (loading) return <div className="text-center py-20 text-muted-foreground">加载中...</div>

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">轮播图管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理首页轮播图，支持排序和启用/禁用</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" />
          添加轮播图
        </Button>
      </div>

      {slides.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <p className="mb-4">暂无轮播图</p>
            <Button variant="outline" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" />
              添加第一张轮播图
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {slides.map((s, i) => (
            <Card
              key={s.id}
              draggable
              onDragStart={() => handleDragStart(s.id)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(s.id)}
              className={`overflow-hidden transition-opacity ${!s.is_active ? 'opacity-50' : ''}`}
            >
              <CardContent className="flex items-center gap-4 p-4">
                {/* Drag handle */}
                <div className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground flex-shrink-0">
                  <GripVertical className="h-5 w-5" />
                </div>

                {/* Thumbnail */}
                <div className="h-16 w-28 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                  <img src={s.image_url} alt={s.title} className="h-full w-full object-cover" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{s.title || '未命名'}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.image_url}</p>
                  {s.link_url && <p className="text-xs text-muted-foreground truncate">链接: {s.link_url}</p>}
                </div>

                {/* Sort order badge */}
                <span className="text-xs text-muted-foreground flex-shrink-0 w-8 text-center">#{s.sort_order + 1}</span>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(i, -1)} disabled={i === 0}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(i, 1)} disabled={i === slides.length - 1}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1 ml-2">
                    <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} aria-label="启用/禁用" />
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(s)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑轮播图' : '添加轮播图'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Image upload */}
            <div className="space-y-1.5">
              <Label>图片 <span className="text-destructive">*</span></Label>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-shrink-0"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {uploading ? '上传中...' : '选择图片'}
                </Button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleUpload} />
                <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="或手动输入图片URL" className="flex-1" />
              </div>
              {form.image_url && (
                <div className="h-32 rounded-md overflow-hidden bg-muted mt-2">
                  <img src={form.image_url} alt="预览" className="h-full w-full object-cover" />
                </div>
              )}
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="carousel-title">标题（alt 文本）</Label>
              <Input id="carousel-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="例如：2026春季赛报名开启" />
            </div>

            {/* Link URL */}
            <div className="space-y-1.5">
              <Label htmlFor="carousel-link">跳转链接（可选）</Label>
              <Input id="carousel-link" value={form.link_url} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} placeholder="https://..." />
              <p className="text-xs text-muted-foreground">仅支持 http/https 链接</p>
            </div>

            {/* Sort order */}
            <div className="space-y-1.5">
              <Label htmlFor="carousel-sort">排序</Label>
              <Input id="carousel-sort" type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="w-24" />
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <Switch id="carousel-active" checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label htmlFor="carousel-active">启用</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving || !form.image_url}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
