import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useContestantAuth, contestantApi } from '@/hooks/useContestantAuth'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Medal, Trophy } from 'lucide-react'

interface ResultItem {
  id: number
  registration_number: string
  contest_title: string
  total_score: number
  rank: number | null
  award_name: string
  scores: Record<string, number>
}

export default function GeneralResultQueryPage() {
  const { isLoggedIn } = useContestantAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login', { replace: true })
    }
  }, [isLoggedIn, navigate])

  const [results, setResults] = useState<ResultItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!isLoggedIn) return
    contestantApi().get<{ items: ResultItem[] }>('/contestant/results')
      .then(r => setResults(r.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isLoggedIn])

  const filtered = useMemo(() => {
    if (!search.trim()) return results
    const kw = search.trim().toLowerCase()
    return results.filter(r =>
      r.contest_title.toLowerCase().includes(kw) ||
      r.registration_number.toLowerCase().includes(kw) ||
      (r.award_name && r.award_name.toLowerCase().includes(kw))
    )
  }, [results, search])

  // 未登录时不渲染页面内容
  if (!isLoggedIn) return null

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">成绩查询</h1>
        {results.length > 0 && (
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="搜索赛事名称..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">加载中...</div>
      ) : results.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="text-center py-16">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
            <p className="text-muted-foreground mb-1">暂无成绩记录</p>
            <p className="text-sm text-muted-foreground/60">参与的比赛结束后，成绩将会在这里展示</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <Medal className="h-5 w-5 text-primary" />
              共 {results.length} 场赛事成绩
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>赛事名称</TableHead>
                  <TableHead>报名编号</TableHead>
                  <TableHead>总分</TableHead>
                  <TableHead>排名</TableHead>
                  <TableHead>奖项</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, idx) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{r.contest_title}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{r.registration_number}</TableCell>
                    <TableCell>
                      <span className="font-bold text-lg">{r.total_score}</span>
                      {/* 各科小分 */}
                      {r.scores && Object.keys(r.scores).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(r.scores).map(([k, v]) => (
                            <span key={k} className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {k}: {v}
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.rank != null ? (
                        <span className="font-medium">第 {r.rank} 名</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.award_name ? (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{r.award_name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      未找到匹配的成绩记录
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
