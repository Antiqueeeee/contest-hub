import { useState, useEffect } from 'react'
import { api } from '@/api/client'

export default function ContactPage() {
  const [content, setContent] = useState('')
  useEffect(() => {
    api.get<{ content: string }>('/public/site-content/contact').then(r => {
      setContent(r.content || '<h1>联系我们</h1><p>内容编辑中...</p>')
    }).catch(() => {})
  }, [])

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="prose prose-sm max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  )
}
