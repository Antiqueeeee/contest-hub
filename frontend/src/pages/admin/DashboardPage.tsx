import { Link } from 'react-router-dom'
import { contests, registrations, results, newsList, getRegistrations } from '@/mock/data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Flag, ClipboardList, BarChart3, Newspaper, ArrowRight, Trophy, Plus } from 'lucide-react'

const statsGradients = [
  { from: 'from-indigo-500', to: 'to-purple-500' },
  { from: 'from-emerald-500', to: 'to-teal-500' },
  { from: 'from-orange-500', to: 'to-amber-500' },
  { from: 'from-violet-500', to: 'to-fuchsia-500' },
]

export default function DashboardPage() {
  const totalContests = contests.length
  const openContests = contests.filter(c => c.status === 'open').length
  const totalRegistrations = registrations.length
  const publishedResults = results.filter(r => r.isPublished).length
  const publishedNews = newsList.filter(n => n.status === 'published').length

  const stats = [
    { label: '赛事总数', value: totalContests, sub: `${openContests} 个报名中`, icon: Flag },
    { label: '报名总数', value: totalRegistrations, sub: '人次', icon: ClipboardList },
    { label: '已发布成绩', value: publishedResults, sub: '条记录', icon: BarChart3 },
    { label: '已发布新闻', value: publishedNews, sub: '篇', icon: Newspaper },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">首页概览</h1>
          <p className="text-muted-foreground text-sm mt-0.5">竞赛管理数据中心</p>
        </div>
        <Link to="/admin/contests/new" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors no-underline">
          <Plus className="h-4 w-4" />创建赛事
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <Card key={s.label} className="border-0 shadow-sm overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${statsGradients[i].from} ${statsGradients[i].to}`} />
            <CardHeader className="pb-1 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <div className={`p-2 rounded-lg bg-gradient-to-r ${statsGradients[i].from} ${statsGradients[i].to}`}>
                  <s.icon className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">赛事状态分布</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(['open', 'ongoing', 'draft', 'finished'] as const).map(status => {
              const count = contests.filter(c => c.status === status).length
              const pct = Math.round((count / (totalContests || 1)) * 100)
              const labels: Record<string, string> = { draft: '草稿', open: '报名中', ongoing: '进行中', finished: '已结束' }
              const barColors: Record<string, string> = { draft: 'bg-gray-300', open: 'bg-green-500', ongoing: 'bg-blue-500', finished: 'bg-gray-500' }
              return (
                <div key={status} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{labels[status]}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColors[status]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">最近赛事</CardTitle>
            <Link to="/admin/contests" className="text-sm text-primary hover:underline flex items-center gap-1 no-underline">
              查看全部 <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {contests.filter(c => c.status !== 'draft').slice(0, 5).map(c => {
              const regCount = getRegistrations(c.id).length
              const sl: Record<string, string> = { open: '报名中', ongoing: '进行中', finished: '已结束' }
              const sc: Record<string, string> = { open: 'bg-green-100 text-green-700', ongoing: 'bg-blue-100 text-blue-700', finished: 'bg-gray-100 text-gray-600' }
              return (
                <Link key={c.id} to={`/admin/contests/${c.id}`} className="no-underline">
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.startDate} ~ {c.endDate}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      <span className="text-sm font-medium">{regCount} 人</span>
                      <Badge className={sc[c.status] ?? '' + ' text-xs'} variant="outline">{sl[c.status] ?? c.status}</Badge>
                    </div>
                  </div>
                </Link>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
