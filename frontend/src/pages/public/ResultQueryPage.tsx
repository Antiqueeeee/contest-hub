import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/api/client'
import { useContestantAuth, contestantApi } from '@/hooks/useContestantAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Search } from 'lucide-react'

interface Contest { id: number; title: string; status: string }

export default function ResultQueryPage() {
  const { id } = useParams()
  const { isLoggedIn } = useContestantAuth()
  const [contest, setContest] = useState<Contest | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoResult, setAutoResult] = useState<any>(null)
  const [regNumber, setRegNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [found, setFound] = useState<any>(null)
  const [queried, setQueried] = useState(false)
  const [querying, setQuerying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<Contest>(`/public/contests/${id}`).then(setContest).catch(() => setContest(null)).finally(() => setLoading(false))
  }, [id])

  // Auto-fetch result for logged-in contestant
  useEffect(() => {
    if (!isLoggedIn || !contest) return
    const ca = contestantApi()
    ca.get<any>(`/contestant/results/${contest.id}`).then(setAutoResult).catch(() => setAutoResult(null))
  }, [isLoggedIn, contest])

  if (loading) return <div className="text-center py-12 text-muted-foreground">加载中...</div>
  if (!contest || contest.status !== 'finished') return <div className="text-center py-12"><p className="text-muted-foreground">{contest ? '该赛事成绩尚未发布' : '赛事不存在'}</p><Link to="/"><Button variant="link">返回首页</Button></Link></div>

  const handleQuery = async () => {
    setError(''); setQueried(true)
    if (!regNumber.trim() || !phone.trim()) { setError('请输入报名编号和手机号'); return }
    setQuerying(true)
    try {
      const res = await api.post<any>(`/public/contests/${contest.id}/query-result`, { registration_number: regNumber, phone })
      setFound(res)
    } catch { setFound(null) }
    finally { setQuerying(false) }
  }

  const displayResult = autoResult || found

  return (
    <div className="max-w-lg mx-auto">
      <Link to={`/contests/${contest.id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-4 w-4 mr-1" />返回赛事详情</Link>
      <Card><CardHeader><CardTitle className="text-lg">成绩查询</CardTitle><p className="text-sm text-muted-foreground">{contest.title}</p></CardHeader>
        <CardContent className="space-y-4">
          {displayResult ? (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h3 className="font-bold text-lg">{displayResult.name} 的成绩</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(displayResult.scores || {}).map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span>{String(v)}</span></div>)}
                <div className="flex justify-between border-t pt-1 mt-1 col-span-2"><span className="font-medium">总分</span><span className="font-bold text-lg">{displayResult.total_score}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">排名</span><span>第 {displayResult.rank ?? '-'} 名</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">奖项</span><span className="font-medium text-primary">{displayResult.award_name || '无'}</span></div>
              </div>
            </div>
          ) : (
            <>
              {!isLoggedIn && (
                <>
                  <div className="space-y-1"><Label>报名编号</Label><Input value={regNumber} onChange={e => { setRegNumber(e.target.value); setQueried(false) }} placeholder="请输入报名编号" /></div>
                  <div className="space-y-1"><Label>手机号</Label><Input value={phone} onChange={e => { setPhone(e.target.value); setQueried(false) }} placeholder="请输入报名时填写的手机号" maxLength={11} /></div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button className="w-full" onClick={handleQuery} disabled={querying}><Search className="h-4 w-4 mr-1" />{querying ? '查询中...' : '查询成绩'}</Button>
                </>
              )}
              {isLoggedIn && !autoResult && (
                <p className="text-sm text-muted-foreground text-center py-4">未找到您在该赛事的成绩，可能尚未发布。</p>
              )}
            </>
          )}
          {queried && !found && !error && !querying && !autoResult && <p className="text-sm text-muted-foreground text-center py-4">未查询到成绩。</p>}
        </CardContent></Card>
    </div>
  )
}
