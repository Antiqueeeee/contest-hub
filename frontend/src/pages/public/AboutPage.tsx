import { useState, useEffect } from 'react'
import { api } from '@/api/client'

export default function AboutPage() {
  const [content, setContent] = useState('')
  useEffect(() => {
    api.get<{ content: string }>('/public/site-content/about').then(r => {
      setContent(r.content || '<h1>平台介绍</h1><p>内容编辑中...</p>')
    }).catch(() => {})
  }, [])

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="prose prose-sm max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  )
}
