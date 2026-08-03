import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useContestantAuth, contestantApi } from '@/hooks/useContestantAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ClipboardList, Settings, LogOut, ArrowRight, ShieldCheck } from 'lucide-react'

function passwordValid(pwd: string) {
  if (pwd.length < 8 || pwd.length > 64) return false
  const types = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(pwd)).length
  return types >= 2
}

export default function ContestantCenterPage() {
  const { user, isLoggedIn, logout, updateProfile } = useContestantAuth()
  const navigate = useNavigate()
  const [records, setRecords] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editOrganization, setEditOrganization] = useState('')
  const [saving, setSaving] = useState(false)
  const [idNumber, setIdNumber] = useState<string | null>(null)
  const [newIdNumber, setNewIdNumber] = useState('')
  const [idNumberMsg, setIdNumberMsg] = useState('')
  const [savingIdNumber, setSavingIdNumber] = useState(false)
  const [activeTab, setActiveTab] = useState('records')
  const [consents, setConsents] = useState<any[]>([])
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdMsg, setPwdMsg] = useState('')
  const [savingPwd, setSavingPwd] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawTarget, setWithdrawTarget] = useState('')  // 当前待撤回的同意类型
  const [consentMsg, setConsentMsg] = useState('')
  const [exporting, setExporting] = useState(false)
  const [deactivatePassword, setDeactivatePassword] = useState('')
  const [deactivateMsg, setDeactivateMsg] = useState('')
  const [deactivating, setDeactivating] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return }
    setEditName(user?.name || '')
    setEditEmail(user?.email || '')
    const ca = contestantApi()
    ca.get<any>('/contestant/profile').then(p => {
      setEditOrganization(p.organization || '')
      setIdNumber(p.id_number || null)
    }).catch(() => {})
    ca.get<any>('/contestant/registrations').then(r => {
      setRecords(r.items || [])
    }).catch(console.error).finally(() => setDataLoading(false))
    ca.get<any>('/contestant/consents').then(c => {
      setConsents(c.items || [])
    }).catch(() => {})
  }, [isLoggedIn, navigate, user])

  const handleSaveProfile = async () => {
    setSaving(true)
    try { await updateProfile(editName, editEmail, editOrganization) }
    catch { alert('保存失败') }
    finally { setSaving(false) }
  }

  const handleSaveIdNumber = async () => {
    setIdNumberMsg('')
    if (!/^\d{17}[\dXx]$/.test(newIdNumber)) { setIdNumberMsg('请输入正确的18位身份证号'); return }
    setSavingIdNumber(true)
    try {
      await contestantApi().put('/contestant/profile', { id_number: newIdNumber })
      const p = await contestantApi().get<any>('/contestant/profile')
      setIdNumber(p.id_number || null)
      setNewIdNumber('')
      setIdNumberMsg('身份证号保存成功')
    } catch (e) {
      setIdNumberMsg(e instanceof Error ? e.message : '保存失败')
    } finally { setSavingIdNumber(false) }
  }

  const handleChangePassword = async () => {
    setPwdMsg('')
    if (!oldPassword) { setPwdMsg('请输入原密码'); return }
    if (!passwordValid(newPassword)) { setPwdMsg('新密码需8-64位，且包含大写字母/小写字母/数字/符号中至少两种'); return }
    if (newPassword !== confirmPassword) { setPwdMsg('两次输入的新密码不一致'); return }
    setSavingPwd(true)
    try {
      await contestantApi().post('/contestant/password', { old_password: oldPassword, new_password: newPassword })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPwdMsg('密码修改成功')
    } catch (e) {
      setPwdMsg(e instanceof Error ? e.message : '修改失败')
    } finally { setSavingPwd(false) }
  }

  const withdrawTargetLabel: Record<string, string> = {
    id_number: '身份证号收集',
    guardian_consent: '监护人同意',
    minor_statement: '未成年人声明',
  }

  const handleWithdrawConsent = async () => {
    setConsentMsg('')
    setWithdrawing(true)
    try {
      await contestantApi().post(`/contestant/consents/${withdrawTarget}/withdraw`)
      setWithdrawOpen(false)
      if (withdrawTarget === 'id_number') {
        setConsentMsg('撤回成功：已删除绑定的身份证号，下次报名时需重新填写并单独同意')
      } else {
        setConsentMsg('撤回成功：已删除绑定的出生日期与监护人信息，下次报名面向未成年人的赛事时需重新确认')
      }
      const ca = contestantApi()
      const [c, p] = await Promise.all([
        ca.get<any>('/contestant/consents'),
        ca.get<any>('/contestant/profile'),
      ])
      setConsents(c.items || [])
      setIdNumber(p.id_number || null)
    } catch (e) {
      setConsentMsg(e instanceof Error ? e.message : '撤回失败')
    } finally { setWithdrawing(false) }
  }

  const handleExportData = async () => {
    setExporting(true)
    try {
      const data = await contestantApi().get<any>('/contestant/my-data')
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `我的数据_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : '导出失败')
    } finally { setExporting(false) }
  }

  const handleDeactivate = async () => {
    setDeactivateMsg('')
    if (!deactivatePassword) { setDeactivateMsg('请输入密码以确认注销'); return }
    if (!window.confirm('注销后账号不可恢复，确定要继续吗？')) return
    setDeactivating(true)
    try {
      await contestantApi().post('/contestant/deactivate', { password: deactivatePassword })
      logout()
      navigate('/')
    } catch (e) {
      setDeactivateMsg(e instanceof Error ? e.message : '注销失败')
      setDeactivating(false)
    }
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
            { id: 'security', icon: ShieldCheck, label: '隐私与安全' },
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
              <Card className="border-0 shadow-sm max-w-md">
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-1.5">
                    <Label>身份证号</Label>
                    <p className="text-sm text-muted-foreground">{idNumber || '未绑定'}</p>
                    <p className="text-xs text-muted-foreground">身份证号属于敏感个人信息，仅用于赛事报名核验，不会公开</p>
                  </div>
                  <div className="space-y-1.5">
                    <Input value={newIdNumber} onChange={e => { setNewIdNumber(e.target.value); setIdNumberMsg('') }} placeholder={idNumber ? '输入新的18位身份证号以更正' : '输入18位身份证号以绑定'} maxLength={18} />
                    {idNumberMsg && <p className={`text-sm ${idNumberMsg.includes('成功') ? 'text-green-600' : 'text-destructive'}`}>{idNumberMsg}</p>}
                  </div>
                  <Button onClick={handleSaveIdNumber} disabled={savingIdNumber || !newIdNumber} className="w-full">{savingIdNumber ? '保存中...' : idNumber ? '更正身份证号' : '绑定身份证号'}</Button>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">隐私与安全</h2>
              <Card className="border-0 shadow-sm max-w-md">
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-1.5">
                    <Label>修改密码</Label>
                    <p className="text-xs text-muted-foreground">新密码需8-64位，且包含大写字母/小写字母/数字/符号中至少两种</p>
                  </div>
                  <div className="space-y-1.5"><Label>原密码</Label><Input type="password" value={oldPassword} onChange={e => { setOldPassword(e.target.value); setPwdMsg('') }} placeholder="请输入原密码" /></div>
                  <div className="space-y-1.5"><Label>新密码</Label><Input type="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setPwdMsg('') }} placeholder="8-64位，含字母/数字/符号中至少两种" /></div>
                  <div className="space-y-1.5"><Label>确认新密码</Label><Input type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setPwdMsg('') }} placeholder="再次输入新密码" /></div>
                  {pwdMsg && <p className={`text-sm ${pwdMsg.includes('成功') ? 'text-green-600' : 'text-destructive'}`}>{pwdMsg}</p>}
                  <Button onClick={handleChangePassword} disabled={savingPwd || !oldPassword || !newPassword} className="w-full">{savingPwd ? '提交中...' : '修改密码'}</Button>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm max-w-md">
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-1.5">
                    <Label>授权管理</Label>
                    <p className="text-xs text-muted-foreground">管理你对平台收集和使用个人信息的授权</p>
                  </div>
                  {consents.map((c: any) => (
                    <div key={c.consent_type} className="flex items-start justify-between gap-3 text-sm border-t pt-3 first:border-0 first:pt-0">
                      <div>
                        <p className="font-medium">{({
                          privacy: '隐私政策',
                          id_number: '身份证号收集',
                          guardian_consent: '监护人同意（未成年人参赛）',
                          minor_statement: '未成年人声明（已满14周岁）',
                        } as Record<string, string>)[String(c.consent_type)] || c.consent_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.granted ? '已同意' : '未同意'}
                          {c.updated_at && ` · ${c.updated_at.split('T')[0]}`}
                          {c.policy_version && ` · 版本 ${c.policy_version}`}
                        </p>
                        {c.consent_type === 'privacy' && (
                          <p className="text-xs text-muted-foreground mt-1">隐私政策同意是使用平台服务的基础，如需撤回请注销账号</p>
                        )}
                        {(c.consent_type === 'guardian_consent' || c.consent_type === 'minor_statement') && (
                          <p className="text-xs text-muted-foreground mt-1">撤回后将删除账号绑定的出生日期与监护人信息</p>
                        )}
                      </div>
                      {['id_number', 'guardian_consent', 'minor_statement'].includes(c.consent_type) && c.granted && (
                        <Button variant="outline" size="sm" onClick={() => { setConsentMsg(''); setWithdrawTarget(c.consent_type); setWithdrawOpen(true) }}>撤回</Button>
                      )}
                    </div>
                  ))}
                  {consentMsg && <p className={`text-sm ${consentMsg.includes('成功') ? 'text-green-600' : 'text-destructive'}`}>{consentMsg}</p>}
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm max-w-md">
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-1.5">
                    <Label>导出我的数据</Label>
                    <p className="text-xs text-muted-foreground">下载你的账号资料、报名记录、成绩和授权记录的 JSON 副本</p>
                  </div>
                  <Button variant="outline" onClick={handleExportData} disabled={exporting} className="w-full">{exporting ? '导出中...' : '导出 JSON 文件'}</Button>
                </CardContent>
              </Card>
              <Card className="border border-destructive/50 shadow-sm max-w-md">
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-1.5">
                    <Label className="text-destructive">注销账号</Label>
                    <p className="text-xs text-muted-foreground">注销后账号不可恢复：姓名、身份证号、邮箱将被清除或匿名化，报名与成绩记录将匿名保留</p>
                  </div>
                  <div className="space-y-1.5"><Label>登录密码</Label><Input type="password" value={deactivatePassword} onChange={e => { setDeactivatePassword(e.target.value); setDeactivateMsg('') }} placeholder="输入密码以确认注销" /></div>
                  {deactivateMsg && <p className="text-sm text-destructive">{deactivateMsg}</p>}
                  <Button variant="destructive" onClick={handleDeactivate} disabled={deactivating || !deactivatePassword} className="w-full">{deactivating ? '注销中...' : '确认注销账号'}</Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>撤回{withdrawTargetLabel[withdrawTarget] || '同意'}同意</DialogTitle></DialogHeader>
          <DialogDescription>
            {withdrawTarget === 'id_number'
              ? '撤回后，账号上绑定的身份证号将被删除，下次报名时需重新填写并单独同意。确定要撤回吗？'
              : '撤回后，账号上绑定的出生日期与监护人信息将被删除（不可恢复），下次报名面向未成年人的赛事时需重新确认。确定要撤回吗？'}
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleWithdrawConsent} disabled={withdrawing}>{withdrawing ? '撤回中...' : '确认撤回'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
