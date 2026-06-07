import { Link } from 'react-router-dom'
import { newsList, contests, getRegistrations } from '@/mock/data'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Users, ArrowRight, Trophy, Sparkles, TrendingUp } from 'lucide-react'

export default function HomePage() {
  const publishedNews = newsList.filter(n => n.status === 'published').sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')
  })

  const visibleContests = contests.filter(c => c.status !== 'draft' && c.status !== 'cancelled')
  const openContests = contests.filter(c => c.status === 'open')

  const statusLabel: Record<string, string> = { open: '报名中', ongoing: '进行中', finished: '已结束' }
  const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = { open: 'default', ongoing: 'outline', finished: 'secondary' }

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-gradient text-primary-foreground">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-sm mb-6">
                <Sparkles className="h-4 w-4" />
                让竞赛管理更简单
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
                专业的竞赛信息
                <br />
                发布与管理平台
              </h1>
              <p className="text-lg text-white/80 mb-8 leading-relaxed max-w-md">
                一站式管理赛事宣传、在线报名、成绩发布与数据导出，
                让每一场竞赛都高效、专业。
              </p>
              <div className="flex items-center gap-4">
                {openContests.length > 0 && (
                  <Link to={`/contests/${openContests[0].id}`}>
                    <span className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary rounded-xl font-semibold hover:shadow-lg transition-shadow">
                      立即报名 <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                )}
                <Link to="/admin/login">
                  <span className="inline-flex items-center gap-2 px-6 py-3 border-2 border-white/30 text-white rounded-xl font-semibold hover:bg-white/10 transition-colors">
                    管理后台
                  </span>
                </Link>
              </div>
              <div className="flex items-center gap-8 mt-8 text-white/70 text-sm">
                <div><span className="font-bold text-white text-lg">{contests.length}</span> 场赛事</div>
                <div><span className="font-bold text-white text-lg">
                  {contests.reduce((sum, c) => sum + getRegistrations(c.id).length, 0)}
                </span> 人次报名</div>
                <div><span className="font-bold text-white text-lg">{publishedNews.length}</span> 篇资讯</div>
              </div>
            </div>
            <div className="hidden md:flex justify-center">
              <div className="relative">
                <div className="h-64 w-64 rounded-3xl bg-white/15 backdrop-blur animate-float" />
                <div className="absolute -top-4 -right-4 h-20 w-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Trophy className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
                  <TrendingUp className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Open Contests Section */}
      {openContests.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 -mt-8 relative z-10">
          <div className="grid md:grid-cols-2 gap-6">
            {openContests.slice(0, 2).map(c => (
              <Link key={c.id} to={`/contests/${c.id}`} className="no-underline">
                <Card className="card-hover border-0 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">🔥 报名中</Badge>
                      <span className="text-xs text-muted-foreground">截止 {c.registrationEnd.split('T')[0]}</span>
                    </div>
                    <CardTitle className="text-lg">{c.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {c.description.replace(/<[^>]+>/g, '').slice(0, 80)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{c.startDate}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{c.location}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* News Section */}
      <section className="max-w-6xl mx-auto px-6 mt-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">新闻资讯</h2>
            <p className="text-muted-foreground text-sm mt-1">最新赛事动态与通知</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {publishedNews.slice(0, 4).map((n, i) => (
            <Link key={n.id} to={`/news/${n.id}`} className="no-underline" style={{ animationDelay: `${i * 0.1}s` }}>
              <Card className="card-hover border-0 shadow-sm h-full animate-fade-in-up">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    {n.isPinned && <Badge variant="secondary" className="text-xs">置顶</Badge>}
                    <Badge variant="outline" className="text-xs">
                      {n.categoryId === 1 ? '赛事通知' : n.categoryId === 2 ? '行业动态' : '获奖公告'}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm leading-snug">{n.title}</CardTitle>
                  <CardDescription className="text-xs">{n.publishedAt?.split(' ')[0]}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* All Contests Section */}
      <section className="max-w-6xl mx-auto px-6 mt-16">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">全部赛事</h2>
          <p className="text-muted-foreground text-sm mt-1">浏览所有进行中与已结束的竞赛</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleContests.map(c => (
            <Link key={c.id} to={`/contests/${c.id}`} className="no-underline">
              <Card className="card-hover border-0 shadow-sm h-full">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={statusVariant[c.status] ?? 'outline'} className={c.status === 'open' ? 'bg-green-100 text-green-700' : ''}>
                      {statusLabel[c.status] ?? c.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{c.title}</CardTitle>
                  <CardDescription className="line-clamp-2 text-xs">
                    {c.description.replace(/<[^>]+>/g, '').slice(0, 80)}
                  </CardDescription>
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

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-6 mt-16 mb-8">
        <div className="bg-accent rounded-2xl p-10 text-center">
          <h2 className="text-2xl font-bold mb-3">还没有创建赛事？</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            登录管理后台，3 分钟即可创建您的第一场竞赛，开始收集报名。
          </p>
          <Link to="/admin/login">
            <span className="inline-flex items-center gap-2 px-8 py-3 hero-gradient text-white rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-lg">
              进入管理后台 <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </section>
    </div>
  )
}
