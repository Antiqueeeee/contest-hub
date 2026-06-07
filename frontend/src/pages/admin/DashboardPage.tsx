import { contests, registrations, results, newsList } from '@/mock/data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Flag, ClipboardList, BarChart3, Newspaper, Users } from 'lucide-react'

export default function DashboardPage() {
  const totalContests = contests.length
  const openContests = contests.filter(c => c.status === 'open').length
  const totalRegistrations = registrations.length
  const publishedResults = results.filter(r => r.isPublished).length
  const publishedNews = newsList.filter(n => n.status === 'published').length

  const stats = [
    { label: '赛事总数', value: totalContests, sub: `${openContests} 个报名中`, icon: Flag, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '报名总数', value: totalRegistrations, sub: '人次', icon: ClipboardList, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '已发布成绩', value: publishedResults, sub: '条', icon: BarChart3, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: '已发布新闻', value: publishedNews, sub: '篇', icon: Newspaper, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">首页概览</h1>
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <div className={`p-2 rounded-lg ${s.bg}`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{s.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">赛事状态分布</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {['draft', 'open', 'ongoing', 'finished', 'cancelled'].map(status => {
                const count = contests.filter(c => c.status === status).length
                const labels: Record<string, string> = { draft: '草稿', open: '报名中', ongoing: '进行中', finished: '已结束', cancelled: '已取消' }
                const colors: Record<string, string> = { draft: 'bg-gray-200', open: 'bg-green-500', ongoing: 'bg-blue-500', finished: 'bg-gray-500', cancelled: 'bg-red-500' }
                return (
                  <div key={status} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
                    <span className="text-sm flex-1">{labels[status]}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">最近报名趋势</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">（数据看板功能将在后续版本提供图表展示）</p>
            <div className="mt-4 space-y-2">
              {contests.filter(c => c.status !== 'draft').slice(0, 3).map(c => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="truncate max-w-[200px]">{c.title}</span>
                  <span className="text-muted-foreground">{getRegistrations(c.id).length} 人报名</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import { getRegistrations } from '@/mock/data'
