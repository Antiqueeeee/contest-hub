import { useState, useEffect } from 'react'
import { api } from '@/api/client'

const DEFAULT = `<h1>常见问题</h1>

<h3>Q: 如何报名参赛？</h3>
<p>注册并登录账号后，进入赛事详情页面，点击"立即报名"按钮，填写所需信息并提交即可完成报名。</p>

<h3>Q: 报名需要准备哪些材料？</h3>
<p>通常需要提供姓名、身份证号、联系方式等基本信息。不同赛事可能有额外要求，详见赛事详情页。</p>

<h3>Q: 如何查询比赛成绩？</h3>
<p>成绩发布后，您可以在赛事页面通过报名编号和邮箱查询，或登录后在个人中心查看。</p>

<h3>Q: 忘记密码怎么办？</h3>
<p>请联系管理员协助重置密码（联系方式见"联系我们"页面）。</p>

<h3>Q: 可以修改已提交的报名信息吗？</h3>
<p>报名截止前可联系管理员处理，报名截止后信息锁定不可更改。</p>`

export default function FAQPage() {
  const [content, setContent] = useState(DEFAULT)
  useEffect(() => {
    api.get<{ content: string }>('/public/site-content/faq').then(r => {
      if (r.content) setContent(r.content)
    }).catch(() => {})
  }, [])

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="prose prose-sm max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  )
}
