import { useParams, Link } from 'react-router-dom'
import { contests, getContestGroups, getAwards } from '@/mock/data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Calendar, MapPin, Users, Clock, Share2 } from 'lucide-react'

export default function ContestDetailPage() {
  const { id } = useParams()
  const contest = contests.find(c => c.id === Number(id))

  if (!contest) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">赛事不存在</p>
        <Link to="/"><Button variant="link">返回首页</Button></Link>
      </div>
    )
  }

  const groups = getContestGroups(contest.id)
  const awardsList = getAwards(contest.id)
  const isOpen = contest.status === 'open'
  const isFinished = contest.status === 'finished'

  const statusLabel: Record<string, string> = { draft: '草稿', open: '报名中', ongoing: '进行中', finished: '已结束', cancelled: '已取消' }
  const statusVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = { draft: 'secondary', open: 'default', ongoing: 'outline', finished: 'secondary', cancelled: 'destructive' }

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />返回首页
      </Link>

      <Badge variant={statusVariant[contest.status]} className="mb-3">{statusLabel[contest.status]}</Badge>
      <h1 className="text-2xl font-bold mb-4">{contest.title}</h1>

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
        <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{contest.startDate} ~ {contest.endDate}</span>
        <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{contest.location}</span>
        <span className="flex items-center gap-1"><Users className="h-4 w-4" />限 {contest.maxParticipants || '不限'} 人</span>
        {isOpen && (
          <span className="flex items-center gap-1"><Clock className="h-4 w-4" />报名截止：{contest.registrationEnd.split('T')[0]}</span>
        )}
      </div>

      <div className="flex gap-3 mb-6">
        {isOpen && (
          <Link to={`/contests/${contest.id}/register`}>
            <Button size="lg">立即报名</Button>
          </Link>
        )}
        {isFinished && (
          <Link to={`/contests/${contest.id}/results`}>
            <Button size="lg" variant="outline">查询成绩</Button>
          </Link>
        )}
        <Button variant="outline" size="lg"><Share2 className="h-4 w-4 mr-1" />分享</Button>
      </div>

      <div className="prose prose-sm max-w-none mb-6" dangerouslySetInnerHTML={{ __html: contest.description }} />

      {groups.length > 0 && (
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base">参赛组别</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {groups.map(g => (
              <div key={g.id} className="flex justify-between text-sm p-2 bg-muted rounded-md">
                <span className="font-medium">{g.name}</span>
                <span className="text-muted-foreground">{g.description} · 限 {g.maxParticipants || '不限'} 人</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {awardsList.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">奖项设置</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {awardsList.map(a => (
              <div key={a.id} className="flex justify-between text-sm p-2 bg-muted rounded-md">
                <span className="font-medium">{a.name}</span>
                <span className="text-muted-foreground">{a.description || '-'}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
