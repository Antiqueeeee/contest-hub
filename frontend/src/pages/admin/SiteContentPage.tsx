import { useState, useEffect } from 'react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import RichTextEditor from '@/components/editor/RichTextEditor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">站点内容管理</h1>
        <div className="flex items-center gap-3">
          <select value={pageKey} onChange={e => setPageKey(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            {pages.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存并发布'}</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{pages.find(p => p.key === pageKey)?.label}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">加载中...</p>
          ) : (
            <RichTextEditor
              value={content}
              onChange={setContent}
              minHeight="520px"
              placeholder="输入内容..."
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
