import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useContestantAuth, contestantApi } from '@/hooks/useContestantAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ClipboardList, BarChart3, Settings, LogOut, ArrowRight } from 'lucide-react'

export default function ContestantCenterPage() {
  const { user, isLoggedIn, logout, updateProfile } = useContestantAuth()
  const navigate = useNavigate()
  const [registrations, setRegistrations] = useState<any[]>([])
  const [results, setResults] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('registrations')

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return }
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
  }, [isLoggedIn, navigate, user])

  const handleSaveProfile = async () => {
    setSaving(true)
    try { await updateProfile(editName, editPhone) }
    catch { alert('保存失败') }
    finally { setSaving(false) }
  }

  if (dataLoading) return <div className="text-center py-20 text-muted-foreground">加载中...</div>
  if (!isLoggedIn) return null

  return (
    <div className="max-w-5xl mx-auto py-8">
      {/* Header */}
      <div className="flex items-center gap-5 mb-8 p-6 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
        <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
          {user?.name?.charAt(0) || 'U'}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{user?.name}</h1>
          <p className="text-white/70 text-sm">{user?.phone}</p>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="px-3 py-1 rounded-full bg-white/20">{registrations.length} 次参赛</span>
          <span className="px-3 py-1 rounded-full bg-white/20">{results.length} 条成绩</span>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 shrink-0 space-y-1">
          {[
            { id: 'registrations', icon: ClipboardList, label: '我的报名' },
            { id: 'results', icon: BarChart3, label: '我的成绩' },
            { id: 'profile', icon: Settings, label: '账号设置' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm transition-colors text-left ${
                activeTab === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
          <hr className="my-2" />
          <button
            onClick={() => { logout(); navigate('/') }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors text-left"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'registrations' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">我的报名</h2>
              {registrations.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="text-center py-12">
                    <ClipboardList className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground mb-3">还没有报名记录</p>
                    <Link to="/contests"><Button size="sm">去浏览赛事 <ArrowRight className="h-3 w-3 ml-1" /></Button></Link>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-sm">
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
                </Card>
              )}
            </div>
          )}

          {activeTab === 'results' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">我的成绩</h2>
              {results.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="text-center py-12">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground">还没有成绩记录</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-sm">
                  <Table>
                    <TableHeader><TableRow><TableHead>报名编号</TableHead><TableHead>总分</TableHead><TableHead>排名</TableHead><TableHead>奖项</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {results.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-sm">{r.registration_number}</TableCell>
                          <TableCell className="font-bold">{r.total_score}</TableCell>
                          <TableCell>{r.rank ?? '-'}</TableCell>
                          <TableCell>
                            {r.award_name ? <Badge className="bg-amber-100 text-amber-700">{r.award_name}</Badge> : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">账号设置</h2>
              <Card className="border-0 shadow-sm max-w-md">
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-1.5">
                    <Label>真实姓名</Label>
                    <Input value={editName} onChange={e => setEditName(e.target.value)} />
                    <p className="text-xs text-muted-foreground">报名和成绩单上显示的名称</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>手机号（登录账号）</Label>
                    <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} maxLength={11} />
                    <p className="text-xs text-muted-foreground">修改后下次请使用新手机号登录</p>
                  </div>
                  <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                    {saving ? '保存中...' : '保存修改'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
