import { useState, useEffect } from 'react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lightbulb } from 'lucide-react'

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
    purpose: '介绍平台定位、功能特色与优势。',
    prompt: `你是一个网页内容编辑。请为「竞赛信息发布平台」的"关于我们"页面生成 HTML 内容。

要求：
- 使用简单的 HTML 标签（h1, h2, h3, p, ul, li, strong），不要用 class 或 style
- 包含以下板块：平台简介、核心功能、优势或特色
- 语言简洁专业，面向参赛选手和赛事主办方
- 输出纯 HTML，不使用 markdown 代码块包裹`,
  },
  faq: {
    purpose: '以问答形式列出选手常见问题。',
    prompt: `你是一个网页内容编辑。请为「竞赛信息发布平台」的"常见问题"页面生成 HTML 内容。

要求：
- 使用简单的 HTML 标签（h1, h3, p），不要用 class 或 style
- 每个问题用 <h3>Q: 问题内容</h3>，回答用 <p>回答内容</p>
- 至少覆盖：报名流程、材料准备、成绩查询、密码找回、信息修改
- 输出纯 HTML，不使用 markdown 代码块包裹`,
  },
  contact: {
    purpose: '提供联系方式与服务时间。',
    prompt: `你是一个网页内容编辑。请为「竞赛信息发布平台」的"联系我们"页面生成 HTML 内容。

要求：
- 使用简单的 HTML 标签（h1, p, ul, li, strong, hr），不要用 class 或 style
- 至少包含：邮箱、电话、地址、工作时间
- 末尾可添加收尾语
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

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">站点内容管理</h1>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">编辑页面内容</CardTitle>
            <div className="flex items-center gap-2">
              <select value={pageKey} onChange={e => setPageKey(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                {pages.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">加载中...</p>
          ) : (
            <>
              <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                className="min-h-[420px] font-mono text-sm"
                placeholder="<h1>标题</h1><p>正文内容...</p>"
              />
              <div className="flex items-center justify-between">
                <Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存并发布'}</Button>
                <button
                  onClick={() => setShowGuide(!showGuide)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Lightbulb className="h-3 w-3" />
                  AI 生成参考
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* AI guide — subtle, below the fold */}
      {showGuide && (
        <div className="rounded-lg border border-dashed bg-muted/30 p-4 space-y-3 text-sm">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">{pages.find(p => p.key === pageKey)?.label}</strong> — {guide.purpose}
          </p>
          <div>
            <p className="text-xs font-medium mb-1">AI 生成提示词（复制发给 ChatGPT / 通义千问 / 豆包）</p>
            <pre className="bg-background border rounded-md p-2.5 text-xs overflow-auto whitespace-pre-wrap text-muted-foreground">{guide.prompt}</pre>
          </div>
          <div>
            <p className="text-xs font-medium mb-1">默认模板</p>
            <div className="flex gap-2 mb-1.5">
              <Button variant="secondary" size="sm" onClick={() => { setContent(DEFAULTS[pageKey]); setShowGuide(false) }}>填入编辑框</Button>
              <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(DEFAULTS[pageKey])}>复制模板</Button>
              <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(guide.prompt)}>复制提示词</Button>
            </div>
            <pre className="bg-background border rounded-md p-2.5 text-xs overflow-auto whitespace-pre-wrap max-h-40 text-muted-foreground">{DEFAULTS[pageKey]}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
