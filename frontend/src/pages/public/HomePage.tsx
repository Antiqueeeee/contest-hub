import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react'

interface NewsItem { id: number; title: string; category_id: number; is_pinned: boolean; status: string; published_at: string | null }
interface ContestItem { id: number; title: string; description: string; status: string; start_date: string; end_date: string; location: string; max_participants: number; registration_end: string }

const heroGradient = { background: 'linear-gradient(135deg, hsl(243 75% 59%) 0%, hsl(271 81% 56%) 100%)' }

export default function HomePage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [contests, setContests] = useState<ContestItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<{ items: NewsItem[] }>('/public/news'),
      api.get<{ items: ContestItem[] }>('/public/contests'),
    ]).then(([n, c]) => { setNews(n.items); setContests(c.items) }).catch(console.error).finally(() => setLoading(false))
    // Scroll to hash if present
    const hash = window.location.hash
    if (hash) {
      setTimeout(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' })
      }, 300)
    }
  }, [])

  const openContests = contests.filter(c => c.status === 'open')
  const visibleContests = contests.filter(c => c.status !== 'draft' && c.status !== 'cancelled')
  const statusCfg: Record<string, { label: string; cls: string }> = {
    open: { label: '报名中', cls: 'bg-green-100 text-green-700' },
    ongoing: { label: '进行中', cls: 'bg-blue-100 text-blue-700' },
    finished: { label: '已结束', cls: 'bg-gray-100 text-gray-600' },
  }

  if (loading) return <div className="text-center py-20 text-muted-foreground">加载中...</div>

  return (
    <div>
      <section style={heroGradient} className="text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">发现并参与<br />精彩竞赛</h1>
            <p className="text-lg text-white/80 mb-8">浏览赛事信息，在线报名，赛后自助查询成绩</p>
            {openContests.length > 0 ? (
              <Link to={`/contests/${openContests[0].id}`} className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary rounded-xl font-semibold hover:shadow-lg transition-shadow no-underline">
                立即报名 <ArrowRight className="h-4 w-4" />
              </Link>
            ) : <p className="text-white/60">暂无开放报名的赛事，请留意后续通知</p>}
          </div>
        </div>
      </section>

      {openContests.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 -mt-6 relative z-10">
          <div className="grid md:grid-cols-2 gap-6">
            {openContests.slice(0, 2).map(c => (
              <Link key={c.id} to={`/contests/${c.id}`} className="no-underline group">
                <Card className="border-0 shadow-lg transition-shadow hover:shadow-xl">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2"><Badge className="bg-green-100 text-green-700">🔥 报名中</Badge><span className="text-xs text-muted-foreground">截止 {c.registration_end?.split('T')[0]}</span></div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">{c.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{c.description?.replace(/<[^>]+>/g, '').slice(0, 80)}</CardDescription>
                  </CardHeader>
                  <CardContent><div className="flex items-center gap-4 text-sm text-muted-foreground"><span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{c.start_date?.split('T')[0]}</span><span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{c.location}</span></div></CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section id="news" className="max-w-6xl mx-auto px-6 mt-14">
        <div className="mb-6"><h2 className="text-2xl font-bold">新闻资讯</h2><p className="text-muted-foreground text-sm mt-1">最新赛事动态与通知</p></div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {news.slice(0, 4).map(n => (
            <Link key={n.id} to={`/news/${n.id}`} className="no-underline group">
              <Card className="border-0 shadow-sm transition-shadow hover:shadow-md h-full">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">{n.is_pinned && <Badge variant="secondary" className="text-xs">置顶</Badge>}<Badge variant="outline" className="text-xs">{n.category_id === 1 ? '赛事通知' : n.category_id === 2 ? '行业动态' : '获奖公告'}</Badge></div>
                  <CardTitle className="text-sm leading-snug group-hover:text-primary transition-colors">{n.title}</CardTitle>
                  <CardDescription className="text-xs">{n.published_at?.split('T')[0]}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section id="contests" className="max-w-6xl mx-auto px-6 mt-14 mb-8">
        <div className="mb-6"><h2 className="text-2xl font-bold">全部赛事</h2><p className="text-muted-foreground text-sm mt-1">浏览所有进行中和已结束的竞赛</p></div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleContests.map(c => (
            <Link key={c.id} to={`/contests/${c.id}`} className="no-underline group">
              <Card className="border-0 shadow-sm transition-shadow hover:shadow-md h-full">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2"><Badge className={statusCfg[c.status]?.cls ?? ''}>{statusCfg[c.status]?.label ?? c.status}</Badge></div>
                  <CardTitle className="text-base group-hover:text-primary transition-colors">{c.title}</CardTitle>
                  <CardDescription className="line-clamp-2 text-xs">{c.description?.replace(/<[^>]+>/g, '').slice(0, 80)}</CardDescription>
                </CardHeader>
                <CardContent><div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{c.start_date?.split('T')[0]}</span><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.location?.length > 6 ? c.location.slice(0, 6) + '…' : c.location}</span><span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.max_participants || '不限'}人</span></div></CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
