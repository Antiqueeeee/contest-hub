import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'

interface NewsItem { id: number; title: string; content: string; category_id: number; published_at: string | null }

export default function NewsDetailPage() {
  const { id } = useParams()
  const [news, setNews] = useState<NewsItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<NewsItem>(`/public/news/${id}`).then(setNews).catch(() => setNews(null)).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-center py-12 text-muted-foreground">加载中...</div>
  if (!news) return <div className="text-center py-12"><p className="text-muted-foreground">新闻不存在</p><Link to="/"><Button variant="link">返回首页</Button></Link></div>

  const catLabels: Record<number, string> = { 1: '赛事通知', 2: '行业动态', 3: '获奖公告' }

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />返回首页
      </Link>
      <article>
        <Badge variant="outline" className="mb-3">{catLabels[news.category_id] || '其他'}</Badge>
        <h1 className="text-2xl font-bold mb-2">{news.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{news.published_at?.split('T')[0]}</p>
        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: news.content }} />
      </article>
    </div>
  )
}
