import { useState, useEffect } from 'react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

const pages = [
  { key: 'about', label: '平台介绍' },
  { key: 'faq', label: '常见问题' },
  { key: 'contact', label: '联系我们' },
]

export default function SiteContentPage() {
  const [pageKey, setPageKey] = useState('about')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get<{ content: string }>(`/admin/site-content/${pageKey}`).then(r => {
      setContent(r.content || '')
    }).catch(console.error).finally(() => setLoading(false))
  }, [pageKey])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/admin/site-content/${pageKey}`, { content })
      alert('保存成功，前台页面已更新')
    } catch (e) {
      alert('保存失败')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">站点内容管理</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">编辑页面内容</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>选择页面</Label>
            <select value={pageKey} onChange={e => setPageKey(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm w-48">
              {pages.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>内容（支持 HTML）</Label>
            {loading ? (
              <p className="text-sm text-muted-foreground">加载中...</p>
            ) : (
              <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
                placeholder="<h1>标题</h1><p>正文内容...</p>"
              />
            )}
          </div>
          <Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存并发布'}</Button>
        </CardContent>
      </Card>
    </div>
  )
}
