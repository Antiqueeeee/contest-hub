import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useContestantAuth, contestantApi } from '@/hooks/useContestantAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { User, ClipboardList, BarChart3 } from 'lucide-react'

export default function ContestantCenterPage() {
  const { user, isLoggedIn, loading, logout, updateProfile } = useContestantAuth()
  const navigate = useNavigate()
  const [registrations, setRegistrations] = useState<any[]>([])
  const [results, setResults] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  // Profile state
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading && !isLoggedIn) { navigate('/login'); return }
    if (!isLoggedIn) return
    setEditName(user?.name || '')
    setEditPhone(user?.phone || '')
    const ca = contestantApi()
    Promise.all([
      ca.get<any>('/contestant/registrations'),
      ca.get<any>('/contestant/results'),
    ]).then(([r, rs]) => {
      setRegistrations(r.items || [])
      setResults(rs.items || [])
    }).catch(console.error).finally(() => setDataLoading(false))
  }, [isLoggedIn, loading, navigate, user])

  const handleSaveProfile = async () => {
    setSaving(true)
    try { await updateProfile(editName, editPhone); alert('保存成功') }
    catch { alert('保存失败') }
    finally { setSaving(false) }
  }

  if (loading || dataLoading) return <div className="text-center py-20 text-muted-foreground">加载中...</div>
  if (!isLoggedIn) return null

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center">
          <User className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{user?.name}</h1>
          <p className="text-muted-foreground text-sm">{user?.phone}</p>
        </div>
      </div>

      <Tabs defaultValue="registrations">
        <TabsList className="mb-6">
          <TabsTrigger value="registrations"><ClipboardList className="h-4 w-4 mr-2" />我的报名</TabsTrigger>
          <TabsTrigger value="results"><BarChart3 className="h-4 w-4 mr-2" />我的成绩</TabsTrigger>
          <TabsTrigger value="profile"><User className="h-4 w-4 mr-2" />个人信息</TabsTrigger>
        </TabsList>

        <TabsContent value="registrations">
          {registrations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>暂无报名记录</p>
              <Link to="/" className="text-primary hover:underline text-sm mt-2 inline-block">去浏览赛事</Link>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>报名编号</TableHead><TableHead>姓名</TableHead><TableHead>报名时间</TableHead></TableRow></TableHeader>
              <TableBody>
                {registrations.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.registration_number}</TableCell>
                    <TableCell>{r.form_data?.name || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.submitted_at?.split('.')[0]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="results">
          {results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>暂无成绩记录</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>报名编号</TableHead><TableHead>总分</TableHead><TableHead>排名</TableHead><TableHead>奖项</TableHead></TableRow></TableHeader>
              <TableBody>
                {results.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.registration_number}</TableCell>
                    <TableCell className="font-bold">{r.total_score}</TableCell>
                    <TableCell>{r.rank ?? '-'}</TableCell>
                    <TableCell><Badge variant="outline">{r.award_name || '无'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="profile">
          <Card className="max-w-md border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">编辑个人信息</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5"><Label>姓名</Label><Input value={editName} onChange={e => setEditName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>手机号</Label><Input value={editPhone} onChange={e => setEditPhone(e.target.value)} maxLength={11} /></div>
              <Button onClick={handleSaveProfile} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
              <hr />
              <Button variant="outline" className="w-full text-destructive" onClick={() => { logout(); navigate('/') }}>退出登录</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
