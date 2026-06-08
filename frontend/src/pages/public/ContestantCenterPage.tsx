import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useContestantAuth, contestantApi } from '@/hooks/useContestantAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ClipboardList, Settings, LogOut, ArrowRight } from 'lucide-react'

export default function ContestantCenterPage() {
  const { user, isLoggedIn, logout, updateProfile } = useContestantAuth()
  const navigate = useNavigate()
  const [records, setRecords] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editOrganization, setEditOrganization] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('records')

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return }
    setEditName(user?.name || '')
    setEditEmail(user?.email || '')
    const ca = contestantApi()
    ca.get<any>('/contestant/profile').then(p => {
      setEditOrganization(p.organization || '')
    }).catch(() => {})
    ca.get<any>('/contestant/registrations').then(r => {
      setRecords(r.items || [])
    }).catch(console.error).finally(() => setDataLoading(false))
  }, [isLoggedIn, navigate, user])

  const handleSaveProfile = async () => {
    setSaving(true)
    try { await updateProfile(editName, editEmail, editOrganization) }
    catch { alert('保存失败') }
    finally { setSaving(false) }
  }

  if (dataLoading) return <div className="text-center py-20 text-muted-foreground">加载中...</div>
  if (!isLoggedIn) return null

  const statusCfg: Record<string, string> = {
    open: 'bg-green-100 text-green-700',
    ongoing: 'bg-blue-100 text-blue-700',
    finished: 'bg-gray-100 text-gray-600',
    draft: 'bg-gray-100 text-gray-500',
    cancelled: 'bg-red-100 text-red-600',
  }

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="flex items-center gap-5 mb-8 p-6 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
        <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
          {user?.name?.charAt(0) || 'U'}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{user?.name}</h1>
          <p className="text-white/70 text-sm">{user?.email}</p>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="px-3 py-1 rounded-full bg-white/20">{records.length} 次参赛</span>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-48 shrink-0 space-y-1">
          {[
            { id: 'records', icon: ClipboardList, label: '参赛记录' },
            { id: 'profile', icon: Settings, label: '账号设置' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm transition-colors text-left ${
                activeTab === item.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}>
              <item.icon className="h-4 w-4" />{item.label}
            </button>
          ))}
          <hr className="my-2" />
          <button onClick={() => { logout(); navigate('/') }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors text-left">
            <LogOut className="h-4 w-4" />退出登录
          </button>
        </div>

        <div className="flex-1 min-w-0">
          {activeTab === 'records' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">参赛记录</h2>
              {records.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="text-center py-12">
                    <ClipboardList className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground mb-3">还没有参赛记录</p>
                    <Link to="/contests"><Button size="sm">去浏览赛事 <ArrowRight className="h-3 w-3 ml-1" /></Button></Link>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-sm">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>赛事</TableHead><TableHead>状态</TableHead><TableHead>报名编号</TableHead>
                      <TableHead>报名时间</TableHead><TableHead>成绩</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {records.map((r: any, idx: number) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                          <TableCell className="text-sm font-medium max-w-[200px] truncate">
                            <Link to={`/contests/${r.contest_id}`} className="hover:text-primary">{r.contest_title || '-'}</Link>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusCfg[r.contest_status] || '' + ' text-xs'}>
                              {r.contest_status_label || r.contest_status || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{r.registration_number}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.submitted_at?.split('T')[0]}</TableCell>
                          <TableCell>
                            {r.result ? (
                              <div className="text-sm">
                                <span className="font-bold">{r.result.total_score}</span>
                                {r.result.rank && <span className="text-muted-foreground ml-1">第{r.result.rank}名</span>}
                                {r.result.award_name && <Badge className="bg-amber-100 text-amber-700 text-xs ml-2">{r.result.award_name}</Badge>}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">待公布</span>
                            )}
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
                  <div className="space-y-1.5"><Label>真实姓名</Label><Input value={editName} onChange={e => setEditName(e.target.value)} /><p className="text-xs text-muted-foreground">报名和成绩单上显示的名称</p></div>
                  <div className="space-y-1.5"><Label>邮箱（登录账号）</Label><Input value={editEmail} onChange={e => setEditEmail(e.target.value)} /><p className="text-xs text-muted-foreground">修改后下次请使用新邮箱登录</p></div>
                  <div className="space-y-1.5"><Label>学校/单位</Label><Input value={editOrganization} onChange={e => setEditOrganization(e.target.value)} maxLength={200} /><p className="text-xs text-muted-foreground">选填</p></div>
                  <Button onClick={handleSaveProfile} disabled={saving} className="w-full">{saving ? '保存中...' : '保存修改'}</Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
