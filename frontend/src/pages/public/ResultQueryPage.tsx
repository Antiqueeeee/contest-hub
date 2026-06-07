import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { contests, results, getRegistrationById, getAwardName } from '@/mock/data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Search } from 'lucide-react'

export default function ResultQueryPage() {
  const { id } = useParams()
  const contest = contests.find(c => c.id === Number(id))

  const [regNumber, setRegNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [queried, setQueried] = useState(false)
  const [foundResult, setFoundResult] = useState<{
    name: string
    totalScore: number
    rank: number | null
    award: string
    scores: Record<string, number>
  } | null>(null)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)

  if (!contest || contest.status !== 'finished') {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{contest ? '该赛事成绩尚未发布' : '赛事不存在'}</p>
        <Link to="/"><Button variant="link" className="mt-2">返回首页</Button></Link>
      </div>
    )
  }

  const handleQuery = () => {
    setError('')
    if (attempts >= 5) {
      setError('查询过于频繁，请稍后再试')
      return
    }
    if (!regNumber.trim() || !phone.trim()) {
      setError('请输入报名编号和手机号')
      return
    }
    setAttempts(prev => prev + 1)
    setQueried(true)

    const contestResults = results.filter(r => r.contestId === contest.id && r.isPublished)
    for (const r of contestResults) {
      const reg = getRegistrationById(r.registrationId)
      if (reg && reg.registrationNumber === regNumber.trim() && reg.formData.phone === phone.trim()) {
        setFoundResult({
          name: reg.formData.name ?? '-',
          totalScore: r.totalScore,
          rank: r.rank,
          award: getAwardName(r.awardId),
          scores: r.scores,
        })
        return
      }
    }
    setFoundResult(null)
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link to={`/contests/${contest.id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />返回赛事详情
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">成绩查询</CardTitle>
          <p className="text-sm text-muted-foreground">{contest.title}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>报名编号</Label>
            <Input
              value={regNumber}
              onChange={e => { setRegNumber(e.target.value); setQueried(false) }}
              placeholder="请输入报名编号（如 C001-20260606-0001）"
            />
          </div>
          <div className="space-y-1">
            <Label>手机号</Label>
            <Input
              value={phone}
              onChange={e => { setPhone(e.target.value); setQueried(false) }}
              placeholder="请输入报名时填写的手机号"
              maxLength={11}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleQuery}>
            <Search className="h-4 w-4 mr-1" />查询成绩
          </Button>

          {queried && foundResult && (
            <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
              <h3 className="font-bold text-lg">{foundResult.name}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(foundResult.scores).map(([k, v]) => (
                  <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span>{v}</span></div>
                ))}
                <div className="flex justify-between border-t pt-1 mt-1"><span className="font-medium">总分</span><span className="font-bold text-lg">{foundResult.totalScore}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">排名</span><span>第 {foundResult.rank ?? '-'} 名</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">奖项</span><span className="font-medium text-primary">{foundResult.award}</span></div>
              </div>
            </div>
          )}

          {queried && !foundResult && !error && (
            <p className="text-sm text-muted-foreground text-center py-4">
              未查询到成绩。请检查报名编号和手机号是否正确，或成绩尚未发布。
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
