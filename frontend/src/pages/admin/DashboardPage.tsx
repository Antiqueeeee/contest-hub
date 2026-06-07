import { Link } from 'react-router-dom'
import { contests, registrations, results, newsList, getRegistrations } from '@/mock/data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Flag, ClipboardList, BarChart3, Newspaper, TrendingUp, Users, ArrowRight, Trophy } from 'lucide-react'

export default function DashboardPage() {
  const totalContests = contests.length
  const openContests = contests.filter(c => c.status === 'open').length
  const totalRegistrations = registrations.length
  const publishedResults = results.filter(r => r.isPublished).length
  const publishedNews = newsList.filter(n => n.status === 'published').length

  const stats = [
    {
      label: '赛事总数', value: totalContests, sub: `${openContests} 个报名中`,
      icon: Flag, gradient: 'stats-gradient-1',
    },
    {
      label: '报名总数', value: totalRegistrations, sub: '人次',
      icon: Users, gradient: 'stats-gradient-2',
    },
    {
      label: '已发布成绩', value: publishedResults, sub: '条记录',
      icon: BarChart3, gradient: 'stats-gradient-3',
    },
    {
      label: '已发布新闻', value: publishedNews, sub: '篇',
      icon: Newspaper, gradient: 'stats-gradient-4',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">首页概览</h1>
          <p className="text-muted-foreground text-sm mt-1">欢迎回来，这是您的竞赛管理数据中心</p>
        </div>
        <Link to="/admin/contests/new">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            <Trophy className="h-4 w-4" /> 创建赛事
          </span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-5">
        {stats.map(s => (
          <Card key={s.label} className="border-0 shadow-sm overflow-hidden">
            <div className={`h-1.5 ${s.gradient}`} />
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <div className={`p-2 rounded-xl ${s.gradient}`}>
                  <s.icon className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{s.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-5">
        {/* Status Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              赛事状态分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(['open', 'ongoing', 'draft', 'finished', 'cancelled'] as const).map(status => {
                const count = contests.filter(c => c.status === status).length
                const total = contests.length || 1
                const pct = Math.round((count / total) * 100)
                const labels: Record<string, string> = { draft: '草稿', open: '报名中', ongoing: '进行中', finished: '已结束', cancelled: '已取消' }
                const colors: Record<string, string> = { draft: 'bg-gray-300', open: 'bg-green-500', ongoing: 'bg-blue-500', finished: 'bg-gray-500', cancelled: 'bg-red-500' }
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{labels[status]}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${colors[status]} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Contests */}
        <Card className="border-0 shadow-sm col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Flag className="h-4 w-4 text-primary" />
              最近赛事动态
            </CardTitle>
            <Link to="/admin/contests" className="text-sm text-primary hover:underline flex items-center gap-1">
              查看全部 <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contests.filter(c => c.status !== 'draft').slice(0, 4).map(c => {
                const regCount = getRegistrations(c.id).length
                const statusLabels: Record<string, string> = { open: '报名中', ongoing: '进行中', finished: '已结束' }
                const statusColors: Record<string, string> = { open: 'bg-green-100 text-green-700', ongoing: 'bg-blue-100 text-blue-700', finished: 'bg-gray-100 text-gray-600' }
                return (
                  <Link key={c.id} to={`/admin/contests/${c.id}`} className="no-underline">
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.startDate} ~ {c.endDate}</p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className="text-sm font-medium">{regCount} 人报名</span>
                        <Badge className={statusColors[c.status] ?? '' + ' text-xs'} variant="outline">
                          {statusLabels[c.status] ?? c.status}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
