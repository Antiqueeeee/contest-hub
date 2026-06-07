import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Calendar, MapPin, Users, Clock, Share2, Trophy, Award, Layers } from 'lucide-react'

const ctaGradient = { background: 'linear-gradient(135deg, hsl(243 75% 59%), hsl(271 81% 56%))' }

interface Contest { id: number; title: string; description: string; location: string; status: string; start_date: string; end_date: string; registration_start: string; registration_end: string; max_participants: number; groups: { id: number; name: string; description: string; max_participants: number }[]; awards: { id: number; name: string; description: string }[] }

export default function ContestDetailPage() {
  const { id } = useParams()
  const [contest, setContest] = useState<Contest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Contest>(`/public/contests/${id}`).then(setContest).catch(() => setContest(null)).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-center py-12 text-muted-foreground">加载中...</div>
  if (!contest) return <div className="text-center py-20"><Trophy className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground text-lg">赛事不存在</p><Link to="/"><Button variant="link" className="mt-2">返回首页</Button></Link></div>

  const isOpen = contest.status === 'open'; const isFinished = contest.status === 'finished'
  const statusCfg: Record<string, { label: string; cls: string }> = {
    draft: { label: '草稿', cls: 'bg-gray-100 text-gray-600' }, open: { label: '报名中', cls: 'bg-green-100 text-green-700' },
    ongoing: { label: '进行中', cls: 'bg-blue-100 text-blue-700' }, finished: { label: '已结束', cls: 'bg-gray-100 text-gray-600' }, cancelled: { label: '已取消', cls: 'bg-red-100 text-red-700' },
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"><ArrowLeft className="h-4 w-4 mr-1" />返回首页</Link>
      <div className="mb-8">
        <Badge className={`mb-4 text-sm px-3 py-1 ${statusCfg[contest.status]?.cls}`}>{statusCfg[contest.status]?.label}</Badge>
        <h1 className="text-3xl font-bold mb-4">{contest.title}</h1>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-lg"><Calendar className="h-4 w-4 text-primary" />{contest.start_date?.split('T')[0]} ~ {contest.end_date?.split('T')[0]}</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-lg"><MapPin className="h-4 w-4 text-primary" />{contest.location}</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-lg"><Users className="h-4 w-4 text-primary" />{contest.max_participants ? `限 ${contest.max_participants} 人` : '人数不限'}</span>
          {isOpen && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg"><Clock className="h-4 w-4" />截止 {contest.registration_end?.split('T')[0]}</span>}
        </div>
      </div>
      <div className="flex gap-3 mb-8">
        {isOpen && <Link to={`/contests/${contest.id}/register`}><Button size="lg" className="h-12 px-8 text-base border-0 shadow-lg" style={ctaGradient}>立即报名</Button></Link>}
        {isFinished && <Link to={`/contests/${contest.id}/results`}><Button size="lg" className="h-12 px-8 border-0 shadow-lg" style={ctaGradient}><Trophy className="h-4 w-4 mr-2" />查询成绩</Button></Link>}
        <Button variant="outline" size="lg" className="h-12"><Share2 className="h-4 w-4 mr-2" />分享</Button>
      </div>

      <Card className="border-0 shadow-sm mb-6"><CardHeader><CardTitle className="text-lg">赛事介绍</CardTitle></CardHeader><CardContent><div className="text-foreground/80 leading-relaxed text-sm" dangerouslySetInnerHTML={{ __html: contest.description }} /></CardContent></Card>

      <div className="grid md:grid-cols-2 gap-6">
        {contest.groups?.length > 0 && (
          <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4 text-primary" />参赛组别</CardTitle></CardHeader>
            <CardContent className="space-y-2">{contest.groups.map(g => (
              <div key={g.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"><div><span className="font-medium text-sm">{g.name}</span>{g.description && <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>}</div><Badge variant="secondary" className="text-xs">{g.max_participants > 0 ? `限 ${g.max_participants} 人` : '不限'}</Badge></div>
            ))}</CardContent></Card>
        )}
        {contest.awards?.length > 0 && (
          <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4 text-primary" />奖项设置</CardTitle></CardHeader>
            <CardContent className="space-y-2">{contest.awards.map((a, i) => (
              <div key={a.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'}`}>{i + 1}</div>
                <div><span className="font-medium text-sm">{a.name}</span>{a.description && <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>}</div>
              </div>
            ))}</CardContent></Card>
        )}
      </div>
    </div>
  )
}
