import { useParams, Link } from 'react-router-dom'
import { contests, getContestGroups, getAwards } from '@/mock/data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Calendar, MapPin, Users, Clock, Share2, Trophy, Award, Layers } from 'lucide-react'

export default function ContestDetailPage() {
  const { id } = useParams()
  const contest = contests.find(c => c.id === Number(id))

  if (!contest) {
    return (
      <div className="text-center py-20">
        <Trophy className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground text-lg">赛事不存在</p>
        <Link to="/"><Button variant="link" className="mt-2">返回首页</Button></Link>
      </div>
    )
  }

  const groups = getContestGroups(contest.id)
  const awardsList = getAwards(contest.id)
  const isOpen = contest.status === 'open'
  const isFinished = contest.status === 'finished'

  const statusLabel: Record<string, string> = { draft: '草稿', open: '报名中', ongoing: '进行中', finished: '已结束', cancelled: '已取消' }
  const statusColor: Record<string, string> = { draft: 'bg-gray-100 text-gray-600', open: 'bg-green-100 text-green-700', ongoing: 'bg-blue-100 text-blue-700', finished: 'bg-gray-100 text-gray-600', cancelled: 'bg-red-100 text-red-700' }

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4 mr-1" />返回首页
      </Link>

      {/* Header */}
      <div className="mb-8">
        <Badge className={`mb-4 text-sm px-3 py-1 ${statusColor[contest.status]}`}>
          {statusLabel[contest.status]}
        </Badge>
        <h1 className="text-3xl font-bold mb-4 leading-tight">{contest.title}</h1>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
            <Calendar className="h-4 w-4 text-primary" />
            {contest.startDate} ~ {contest.endDate}
          </span>
          <span className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
            <MapPin className="h-4 w-4 text-primary" />
            {contest.location}
          </span>
          <span className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
            <Users className="h-4 w-4 text-primary" />
            {contest.maxParticipants ? `限 ${contest.maxParticipants} 人` : '人数不限'}
          </span>
          {isOpen && (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg">
              <Clock className="h-4 w-4" />
              报名截止：{contest.registrationEnd.split('T')[0]}
            </span>
          )}
        </div>
      </div>

      {/* CTA Buttons */}
      {isOpen && (
        <div className="flex gap-3 mb-8">
          <Link to={`/contests/${contest.id}/register`}>
            <Button size="lg" className="hero-gradient border-0 shadow-lg shadow-primary/25 h-12 px-8 text-base">
              立即报名 <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
            </Button>
          </Link>
          <Button variant="outline" size="lg" className="h-12">
            <Share2 className="h-4 w-4 mr-2" />分享
          </Button>
        </div>
      )}
      {isFinished && (
        <Link to={`/contests/${contest.id}/results`} className="inline-block mb-8">
          <Button size="lg" className="hero-gradient border-0 shadow-lg shadow-primary/25 h-12 px-8">
            <Trophy className="h-4 w-4 mr-2" />查询成绩
          </Button>
        </Link>
      )}

      {/* Description */}
      <Card className="border-0 shadow-sm mb-6">
        <CardHeader><CardTitle className="text-lg">赛事介绍</CardTitle></CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none text-foreground/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: contest.description }} />
        </CardContent>
      </Card>

      {/* Groups & Awards */}
      <div className="grid md:grid-cols-2 gap-6">
        {groups.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />参赛组别
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {groups.map((g, i) => (
                <div key={g.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                  <div>
                    <span className="font-medium text-sm">{g.name}</span>
                    {g.description && <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>}
                  </div>
                  <Badge variant="secondary" className="text-xs">{g.maxParticipants > 0 ? `限 ${g.maxParticipants} 人` : '不限'}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {awardsList.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />奖项设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {awardsList.map((a, i) => (
                <div key={a.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-amber-100 text-amber-700' :
                    i === 1 ? 'bg-gray-100 text-gray-600' :
                    i === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <span className="font-medium text-sm">{a.name}</span>
                    {a.description && <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
