import { useState, useEffect } from 'react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, FolderOpen, Tag } from 'lucide-react'
import { Collapsible } from '@/components/ui/collapsible'

interface Item { id: number; name: string; description: string; max_participants: number; sort_order: number }
interface Template { id: number; name: string; description: string; sort_order: number; items: Item[] }

export default function GroupManagementPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [dialog, setDialog] = useState(false)
  const [editType, setEditType] = useState<'template' | 'item'>('template')
  const [edit, setEdit] = useState<any>(null)

  const fetchData = async () => {
    try {
      const res = await api.get<{ items: Template[] }>('/admin/groups/templates')
      setTemplates(res.items)
      setExpanded(prev => {
        const next = { ...prev }
        res.items.forEach(t => { if (!(t.id in next)) next[t.id] = true })
        return next
      })
    } finally { setLoading(false) }
  }
  useEffect(() => { fetchData() }, [])

  const handleSave = async () => {
    if (!edit?.name?.trim()) return alert('请输入名称')
    try {
      if (editType === 'template') {
        if (edit.id) await api.put(`/admin/groups/templates/${edit.id}`, edit)
        else await api.post('/admin/groups/templates', edit)
      } else {
        if (edit.id) await api.put(`/admin/groups/items/${edit.id}`, edit)
        else await api.post('/admin/groups/items', edit)
      }
      setDialog(false); fetchData()
    } catch (e) { alert('保存失败') }
  }

  const handleDelete = async () => {
    if (!confirm('确认删除？其中的类别也会被删除。')) return
    if (editType === 'template') await api.delete(`/admin/groups/templates/${edit.id}`)
    else await api.delete(`/admin/groups/items/${edit.id}`)
    setDialog(false); fetchData()
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">加载中...</div>

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">组别管理</h1>
          <p className="text-muted-foreground text-sm mt-1">管理分组方案，每个分组下可包含多个类别</p>
        </div>
        <Button onClick={() => { setEditType('template'); setEdit({ name: '', description: '', sort_order: templates.length + 1 }); setDialog(true) }}>
          <Plus className="h-4 w-4 mr-1" />添加分组
        </Button>
      </div>

      <div className="space-y-3">
        {templates.map(t => (
          <Card key={t.id} className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setExpanded(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  {expanded[t.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <FolderOpen className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  {t.description && <span className="text-xs text-muted-foreground">— {t.description}</span>}
                  <Badge variant="secondary" className="text-xs">{t.items.length} 个类别</Badge>
                </button>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setEditType('item'); setEdit({ template_id: t.id, name: '', description: '', max_participants: 0, sort_order: t.items.length + 1 }); setDialog(true) }}>
                    <Plus className="h-3 w-3 mr-1" />类别
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditType('template'); setEdit({ ...t }); setDialog(true) }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditType('template'); setEdit(t); handleDelete() }}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <Collapsible open={expanded[t.id] ?? true}>
              <CardContent className="pt-0">
                {t.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">暂无类别，点击「+ 类别」添加</p>
                ) : (
                  <div className="grid gap-2">
                    {t.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{item.name}</span>
                          {item.description && <span className="text-xs text-muted-foreground">{item.description}</span>}
                          <Badge variant="outline" className="text-xs">{item.max_participants > 0 ? `限${item.max_participants}人` : '不限'}</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditType('item'); setEdit({ ...item }); setDialog(true) }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setEditType('item'); setEdit(item); handleDelete() }}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editType === 'template' ? (edit?.id ? '编辑分组' : '添加分组') : (edit?.id ? '编辑类别' : '添加类别')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {editType === 'item' && edit?.id === undefined && (
              <p className="text-sm text-muted-foreground">添加到「{templates.find(t => t.id === edit?.template_id)?.name}」</p>
            )}
            <div className="space-y-1"><Label>名称</Label>
              <Input value={edit?.name || ''} onChange={e => setEdit((p: any) => p ? { ...p, name: e.target.value } : null)}
                placeholder={editType === 'template' ? '如：学历分组、技能分组' : '如：小学组、初级组'} />
            </div>
            <div className="space-y-1"><Label>说明</Label>
              <Input value={edit?.description || ''} onChange={e => setEdit((p: any) => p ? { ...p, description: e.target.value } : null)} />
            </div>
            {editType === 'item' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>人数上限</Label><Input type="number" value={edit?.max_participants || 0} onChange={e => setEdit((p: any) => p ? { ...p, max_participants: Number(e.target.value) } : null)} /></div>
                <div className="space-y-1"><Label>排序</Label><Input type="number" value={edit?.sort_order || 0} onChange={e => setEdit((p: any) => p ? { ...p, sort_order: Number(e.target.value) } : null)} /></div>
              </div>
            )}
            {editType === 'template' && (
              <div className="space-y-1"><Label>排序</Label><Input type="number" value={edit?.sort_order || 0} onChange={e => setEdit((p: any) => p ? { ...p, sort_order: Number(e.target.value) } : null)} /></div>
            )}
          </div>
          <DialogFooter>
            {edit?.id && <Button variant="destructive" onClick={handleDelete}>删除</Button>}
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
