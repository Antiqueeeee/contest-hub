import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search } from 'lucide-react'

interface Contest { id: number; title: string; status: string }

export default function GeneralResultQueryPage() {
  const [contests, setContests] = useState<Contest[]>([])
  const [contestId, setContestId] = useState('')
  const [regNumber, setRegNumber] = useState('')
  const [email, setEmail] = useState('')
  const [found, setFound] = useState<any>(null)
  const [queried, setQueried] = useState(false)
  const [querying, setQuerying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<{ items: Contest[] }>('/public/contests').then(r => {
      setContests(r.items.filter(c => c.status === 'finished'))
    }).catch(console.error)
  }, [])

  const handleQuery = async () => {
    setError(''); setQueried(true)
    if (!contestId) { setError('请选择赛事'); return }
    if (!regNumber.trim() || !email.trim()) { setError('请输入报名编号和邮箱'); return }
    setQuerying(true)
    try {
      const res = await api.post<any>(`/public/contests/${contestId}/query-result`, { registration_number: regNumber, email })
      setFound(res)
    } catch { setFound(null) }
    finally { setQuerying(false) }
  }

  return (
    <div className="max-w-lg mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">成绩查询</h1>
      <Card>
        <CardHeader><CardTitle className="text-lg">查询您的比赛成绩</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1"><Label>选择赛事</Label>
            <select value={contestId} onChange={e => { setContestId(e.target.value); setQueried(false) }} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">请选择已结束的赛事</option>
              {contests.map(c => <option key={c.id} value={String(c.id)}>{c.title}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label>报名编号</Label><Input value={regNumber} onChange={e => { setRegNumber(e.target.value); setQueried(false) }} placeholder="请输入报名编号" /></div>
          <div className="space-y-1"><Label>邮箱</Label><Input value={email} onChange={e => { setEmail(e.target.value); setQueried(false) }} placeholder="请输入报名时填写的邮箱" /></div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleQuery} disabled={querying}><Search className="h-4 w-4 mr-1" />{querying ? '查询中...' : '查询成绩'}</Button>
          {queried && found && (
            <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
              <h3 className="font-bold text-lg">{found.name}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(found.scores || {}).map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span>{String(v)}</span></div>)}
                <div className="flex justify-between border-t pt-1 mt-1 col-span-2"><span className="font-medium">总分</span><span className="font-bold text-lg">{found.total_score}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">排名</span><span>第 {found.rank ?? '-'} 名</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">奖项</span><span className="font-medium text-primary">{found.award_name || '无'}</span></div>
              </div>
            </div>
          )}
          {queried && !found && !error && !querying && <p className="text-sm text-muted-foreground text-center py-4">未查询到成绩，请检查输入信息是否正确。</p>}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground text-center mt-4">
        也可以从赛事详情页进入成绩查询。已有账号？
        <Link to="/login" className="text-primary hover:underline ml-1">登录</Link>后可在个人中心查看成绩。
      </p>
    </div>
  )
}
