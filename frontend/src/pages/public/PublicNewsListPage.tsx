import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface NewsItem { id: number; title: string; category_id: number; is_pinned: boolean; published_at: string | null }

export default function PublicNewsListPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ items: NewsItem[] }>('/public/news?page_size=50').then(r => setNews(r.items)).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-20 text-muted-foreground">加载中...</div>

  const catLabels: Record<number, string> = { 1: '赛事通知', 2: '行业动态', 3: '获奖公告' }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">通知公告</h1>
      <div className="space-y-4">
        {news.map(n => (
          <Link key={n.id} to={`/news/${n.id}`} className="no-underline group block">
            <Card className="border-0 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  {n.is_pinned && <Badge variant="secondary" className="text-xs">置顶</Badge>}
                  <Badge variant="outline" className="text-xs">{catLabels[n.category_id] || '其他'}</Badge>
                </div>
                <CardTitle className="text-base group-hover:text-primary transition-colors">{n.title}</CardTitle>
                <CardDescription className="text-xs">{n.published_at?.split('T')[0]}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
