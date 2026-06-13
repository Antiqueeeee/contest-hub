import { useState, useEffect } from 'react'
import { api } from '@/api/client'

const DEFAULT = `<h1>联系我们</h1>
<p>如有任何问题、建议或合作意向，欢迎通过以下方式与我们取得联系。</p>
<ul>
  <li><strong>邮箱：</strong>admin@example.com</li>
  <li><strong>电话：</strong>400-123-4567</li>
  <li><strong>地址：</strong>XX省XX市XX区XX路XX号</li>
</ul>
<p><strong>工作时间：</strong>周一至周五 9:00 — 18:00</p>
<hr />
<p>我们会在 1-2 个工作日内回复您的来信。</p>`

export default function ContactPage() {
  const [content, setContent] = useState(DEFAULT)
  useEffect(() => {
    api.get<{ content: string }>('/public/site-content/contact').then(r => {
      if (r.content) setContent(r.content)
    }).catch(() => {})
  }, [])

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="prose prose-sm max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  )
}
