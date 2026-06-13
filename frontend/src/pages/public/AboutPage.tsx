import { useState, useEffect } from 'react'
import { api } from '@/api/client'

const DEFAULT = `<h1>关于我们</h1>
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
</ul>`

export default function AboutPage() {
  const [content, setContent] = useState(DEFAULT)
  useEffect(() => {
    api.get<{ content: string }>('/public/site-content/about').then(r => {
      if (r.content) setContent(r.content)
    }).catch(() => {})
  }, [])

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="prose prose-sm max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  )
}
