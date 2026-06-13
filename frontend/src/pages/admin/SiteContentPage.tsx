import { useState, useEffect } from 'react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

const pages = [
  { key: 'about', label: '平台介绍' },
  { key: 'faq', label: '常见问题' },
  { key: 'contact', label: '联系我们' },
]

const DEFAULTS: Record<string, string> = {
  about: `<h1>关于我们</h1>
<p>本平台致力于为参赛选手和主办方提供高效、便捷的赛事服务。</p>
<h2>平台功能</h2>
<ul>
  <li><strong>赛事浏览</strong> — 查看进行中及即将举办的各类竞赛信息</li>
  <li><strong>在线报名</strong> — 填写信息，一键提交参赛申请</li>
  <li><strong>成绩查询</strong> — 比赛结束后自助查询个人成绩与排名</li>
</ul>
<h2>我们的优势</h2>
<ul>
  <li>简洁高效的报名流程</li>
  <li>安全可靠的数据保护</li>
  <li>及时透明的成绩发布</li>
</ul>`,
  faq: `<h1>常见问题</h1>

<h3>Q: 如何报名参赛？</h3>
<p>注册并登录账号后，进入赛事详情页面，点击"立即报名"按钮，填写所需信息并提交即可完成报名。</p>

<h3>Q: 报名需要准备哪些材料？</h3>
<p>通常需要提供姓名、身份证号、联系方式等基本信息。不同赛事可能有额外要求，详见赛事详情页。</p>

<h3>Q: 如何查询比赛成绩？</h3>
<p>成绩发布后，您可以在赛事页面通过报名编号和邮箱查询，或登录后在个人中心查看。</p>

<h3>Q: 忘记密码怎么办？</h3>
<p>请联系管理员协助重置密码（联系方式见"联系我们"页面）。</p>

<h3>Q: 可以修改已提交的报名信息吗？</h3>
<p>报名截止前可联系管理员处理，报名截止后信息锁定不可更改。</p>`,
  contact: `<h1>联系我们</h1>
<p>如有任何问题、建议或合作意向，欢迎通过以下方式与我们取得联系。</p>
<ul>
  <li><strong>邮箱：</strong>admin@example.com</li>
  <li><strong>电话：</strong>400-123-4567</li>
  <li><strong>地址：</strong>XX省XX市XX区XX路XX号</li>
</ul>
<p><strong>工作时间：</strong>周一至周五 9:00 — 18:00</p>
<hr />
<p>我们会在 1-2 个工作日内回复您的来信。</p>`,
}

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
            AI 内容生成指南（点击展开）
          </h3>
        </div>
        {showGuide && (
          <CardContent className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">{pageLabel} — 页面定位</p>
              <p className="text-sm text-muted-foreground">{guide.purpose}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">方式一：用 AI 生成</p>
              <p className="text-xs text-muted-foreground mb-1">复制以下提示词，发给 ChatGPT / 通义千问 / 豆包等 AI 工具</p>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-auto whitespace-pre-wrap">{guide.prompt}</pre>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">方式二：使用默认模板</p>
              <p className="text-xs text-muted-foreground mb-1">也可以直接使用我们预置的模板，或复制给 AI 让它在此基础上修改</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setContent(DEFAULTS[pageKey])}>填入编辑框</Button>
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(DEFAULTS[pageKey])}>复制模板</Button>
              </div>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-auto whitespace-pre-wrap max-h-48">{DEFAULTS[pageKey]}</pre>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
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
