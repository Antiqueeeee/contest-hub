import { Link } from 'react-router-dom'
import { newsList, contests } from '@/mock/data'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Users } from 'lucide-react'

export default function HomePage() {
  const publishedNews = newsList.filter(n => n.status === 'published').sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')
  })

  const visibleContests = contests.filter(c => c.status !== 'draft' && c.status !== 'cancelled')

  const statusLabel: Record<string, string> = { open: '报名中', ongoing: '进行中', finished: '已结束' }
  const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = { open: 'default', ongoing: 'outline', finished: 'secondary' }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold mb-2">竞赛信息发布平台</h1>
        <p className="text-muted-foreground">查看最新赛事资讯，报名参加竞赛，查询比赛成绩</p>
      </div>

      {/* News Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">新闻资讯</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {publishedNews.slice(0, 4).map(n => (
            <Link key={n.id} to={`/news/${n.id}`} className="no-underline">
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-1">
                    {n.isPinned && <Badge variant="secondary" className="text-xs">置顶</Badge>}
                    <Badge variant="outline" className="text-xs">{n.categoryId === 1 ? '赛事通知' : n.categoryId === 2 ? '行业动态' : '获奖公告'}</Badge>
                  </div>
                  <CardTitle className="text-base">{n.title}</CardTitle>
                  <CardDescription>{n.publishedAt?.split(' ')[0]}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Contest Section */}
      <section>
        <h2 className="text-xl font-bold mb-4">赛事列表</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {visibleContests.map(c => (
            <Link key={c.id} to={`/contests/${c.id}`} className="no-underline">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={statusVariant[c.status] ?? 'outline'}>{statusLabel[c.status] ?? c.status}</Badge>
                  </div>
                  <CardTitle className="text-lg">{c.title}</CardTitle>
                  <CardDescription className="line-clamp-2" dangerouslySetInnerHTML={{ __html: c.description.replace(/<[^>]+>/g, '').slice(0, 100) }} />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{c.startDate}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.location}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.maxParticipants || '不限'}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
