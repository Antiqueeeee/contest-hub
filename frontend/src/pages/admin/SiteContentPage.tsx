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

const GUIDES: Record<string, { purpose: string; prompt: string }> = {
  about: {
    purpose: '介绍平台定位、功能特色与优势，让访客快速了解平台能力。',
    prompt: `你是一个网页内容编辑。请为「竞赛信息发布平台」的"关于我们"页面生成 HTML 内容。

要求：
- 使用简单的 HTML 标签（h1, h2, h3, p, ul, li, strong），不要用 class 或 style
- 包含以下板块：
  1. 平台简介（1-2 段）
  2. 核心功能（列表）
  3. 优势或特色（列表）
- 语言简洁专业，面向参赛选手和赛事主办方
- 输出纯 HTML，不使用 markdown 代码块包裹`,
  },
  faq: {
    purpose: '以问答形式列出选手常见问题，减少重复咨询。',
    prompt: `你是一个网页内容编辑。请为「竞赛信息发布平台」的"常见问题"页面生成 HTML 内容。

要求：
- 使用简单的 HTML 标签（h1, h3, p），不要用 class 或 style
- 每个问题用 <h3>Q: 问题内容</h3> 格式
- 每个回答用 <p>回答内容</p> 格式
- 至少覆盖以下主题：报名流程、材料准备、成绩查询、密码找回、信息修改
- 输出纯 HTML，不使用 markdown 代码块包裹`,
  },
  contact: {
    purpose: '提供联系方式与服务时间，建立访客信任。',
    prompt: `你是一个网页内容编辑。请为「竞赛信息发布平台」的"联系我们"页面生成 HTML 内容。

要求：
- 使用简单的 HTML 标签（h1, p, ul, li, strong, hr），不要用 class 或 style
- 至少包含：邮箱、电话、地址、工作时间
- 末尾可添加一句收尾语（如"我们会在 X 个工作日内回复"）
- 输出纯 HTML，不使用 markdown 代码块包裹`,
  },
}

export default function SiteContentPage() {
  const [pageKey, setPageKey] = useState('about')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

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

  const guide = GUIDES[pageKey]
  const pageLabel = pages.find(p => p.key === pageKey)?.label || ''

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">站点内容管理</h1>

      {/* AI 方法论指南 */}
      <Card className={showGuide ? '' : 'border-dashed'}>
        <div
          className="p-3 cursor-pointer select-none"
          onClick={() => setShowGuide(!showGuide)}
        >
          <h3 className="text-sm font-medium flex items-center gap-2">
            <span>{showGuide ? '▾' : '▸'}</span>
            AI 内容生成指南（方法论）
          </h3>
        </div>
        {showGuide && (
          <CardContent className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">{pageLabel} — 定位</p>
              <p className="text-sm text-muted-foreground">{guide.purpose}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">复制以下提示词发给 AI（如 ChatGPT、通义千问、豆包）即可生成内容：</p>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-auto whitespace-pre-wrap">{guide.prompt}</pre>
            </div>
            <p className="text-xs text-muted-foreground">
              生成后将 HTML 粘贴到下方编辑框中，保存即可发布到前台页面。
            </p>
          </CardContent>
        )}
      </Card>

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
