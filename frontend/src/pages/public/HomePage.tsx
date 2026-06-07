import { Link } from 'react-router-dom'
import { newsList, contests, getRegistrations } from '@/mock/data'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Users, ArrowRight, Trophy, Sparkles } from 'lucide-react'

const heroGradient = { background: 'linear-gradient(135deg, hsl(243 75% 59%) 0%, hsl(271 81% 56%) 100%)' }

export default function HomePage() {
  const publishedNews = newsList.filter(n => n.status === 'published').sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')
  })
  const visibleContests = contests.filter(c => c.status !== 'draft' && c.status !== 'cancelled')
  const openContests = contests.filter(c => c.status === 'open')

  const statusCfg: Record<string, { label: string; cls: string }> = {
    open: { label: '报名中', cls: 'bg-green-100 text-green-700 hover:bg-green-100' },
    ongoing: { label: '进行中', cls: 'bg-blue-100 text-blue-700' },
    finished: { label: '已结束', cls: 'bg-gray-100 text-gray-600' },
  }

  return (
    <div>
      {/* Hero */}
      <section style={heroGradient} className="text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-sm mb-5">
              <Sparkles className="h-4 w-4" />
              让竞赛管理更简单
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
              专业的竞赛信息<br />发布与管理平台
            </h1>
            <p className="text-lg text-white/80 mb-8">
              一站式管理赛事宣传、在线报名、成绩发布与数据导出
            </p>
            {openContests.length > 0 && (
              <Link to={`/contests/${openContests[0].id}`} className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary rounded-xl font-semibold hover:shadow-lg transition-shadow no-underline">
                立即报名 <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <div className="flex gap-8 mt-10 text-white/70 text-sm">
              <div><span className="font-bold text-white text-lg">{contests.length}</span> 场赛事</div>
              <div><span className="font-bold text-white text-lg">{contests.reduce((sum, c) => sum + getRegistrations(c.id).length, 0)}</span> 人次报名</div>
              <div><span className="font-bold text-white text-lg">{publishedNews.length}</span> 篇资讯</div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick entry for open contests */}
      {openContests.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 -mt-6 relative z-10">
          <div className="grid md:grid-cols-2 gap-6">
            {openContests.slice(0, 2).map(c => (
              <Link key={c.id} to={`/contests/${c.id}`} className="no-underline group">
                <Card className="border-0 shadow-lg transition-shadow hover:shadow-xl">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">🔥 报名中</Badge>
                      <span className="text-xs text-muted-foreground">截止 {c.registrationEnd.split('T')[0]}</span>
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">{c.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{c.description.replace(/<[^>]+>/g, '').slice(0, 80)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{c.startDate}</span>
                      <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{c.location}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* News */}
      <section className="max-w-6xl mx-auto px-6 mt-14">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">新闻资讯</h2>
          <p className="text-muted-foreground text-sm mt-1">最新赛事动态与通知</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {publishedNews.slice(0, 4).map(n => (
            <Link key={n.id} to={`/news/${n.id}`} className="no-underline group">
              <Card className="border-0 shadow-sm transition-shadow hover:shadow-md h-full">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    {n.isPinned && <Badge variant="secondary" className="text-xs">置顶</Badge>}
                    <Badge variant="outline" className="text-xs">{n.categoryId === 1 ? '赛事通知' : n.categoryId === 2 ? '行业动态' : '获奖公告'}</Badge>
                  </div>
                  <CardTitle className="text-sm leading-snug group-hover:text-primary transition-colors">{n.title}</CardTitle>
                  <CardDescription className="text-xs">{n.publishedAt?.split(' ')[0]}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* All Contests */}
      <section className="max-w-6xl mx-auto px-6 mt-14">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">全部赛事</h2>
          <p className="text-muted-foreground text-sm mt-1">浏览所有进行中和已结束的竞赛</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleContests.map(c => (
            <Link key={c.id} to={`/contests/${c.id}`} className="no-underline group">
              <Card className="border-0 shadow-sm transition-shadow hover:shadow-md h-full">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={statusCfg[c.status]?.cls ?? ''}>{statusCfg[c.status]?.label ?? c.status}</Badge>
                  </div>
                  <CardTitle className="text-base group-hover:text-primary transition-colors">{c.title}</CardTitle>
                  <CardDescription className="line-clamp-2 text-xs">{c.description.replace(/<[^>]+>/g, '').slice(0, 80)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{c.startDate}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.location.length > 6 ? c.location.slice(0, 6) + '…' : c.location}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.maxParticipants || '不限'}人</span>
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
