import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Calendar, MapPin, Users, Search } from 'lucide-react'

interface ContestItem { id: number; title: string; description: string; status: string; start_date: string; end_date: string; location: string; max_participants: number; registration_start: string; registration_end: string; is_registration_open?: boolean; is_upcoming?: boolean }

function getEffectiveStatus(c: ContestItem): { label: string; cls: string } {
  if (c.status === 'open') {
    if (c.is_upcoming) return { label: '即将报名', cls: 'bg-amber-100 text-amber-700' }
    if (c.is_registration_open) return { label: '报名中', cls: 'bg-green-100 text-green-700' }
    // Fallback: compute from dates
    const now = new Date().getTime()
    const regStart = c.registration_start ? new Date(c.registration_start).getTime() : 0
    if (now < regStart) return { label: '即将报名', cls: 'bg-amber-100 text-amber-700' }
    return { label: '报名中', cls: 'bg-green-100 text-green-700' }
  }
  const cfg: Record<string, { label: string; cls: string }> = {
    ongoing: { label: '进行中', cls: 'bg-blue-100 text-blue-700' },
    finished: { label: '已结束', cls: 'bg-gray-100 text-gray-600' },
  }
  return cfg[c.status] ?? { label: c.status, cls: 'bg-gray-100 text-gray-600' }
}

export default function PublicContestListPage() {
  const [contests, setContests] = useState<ContestItem[]>([])
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ items: ContestItem[] }>('/public/contests').then(r => setContests(r.items)).catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = contests.filter(c => !keyword || c.title.includes(keyword))

  if (loading) return <div className="text-center py-20 text-muted-foreground">加载中...</div>

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">竞赛列表</h1>
      <div className="relative max-w-xs mb-6">
        <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
        <Input placeholder="搜索赛事..." className="pl-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map(c => (
          <Link key={c.id} to={`/contests/${c.id}`} className="no-underline group">
            <Card className="border-0 shadow-sm transition-shadow hover:shadow-md h-full">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  {(() => { const s = getEffectiveStatus(c); return <Badge className={s.cls}>{s.label}</Badge> })()}
                </div>
                <CardTitle className="text-base group-hover:text-primary transition-colors">{c.title}</CardTitle>
                <CardDescription className="line-clamp-2 text-xs">{c.description?.replace(/<[^>]+>/g, '').slice(0, 80)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{c.start_date?.split('T')[0]}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.location?.length > 8 ? c.location.slice(0, 8) + '…' : c.location}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.max_participants || '不限'}人</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
