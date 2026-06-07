import { useState } from 'react'
import { results, contests, getContestTitle, getGroupName, getAwardName, getRegistrationById } from '@/mock/data'
import type { Result } from '@/mock/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Upload, Download, Eye } from 'lucide-react'

export default function ResultListPage() {
  const [items, setItems] = useState<Result[]>(results)
  const [keyword, setKeyword] = useState('')
  const [contestFilter, setContestFilter] = useState('all')
  const [publishTab, setPublishTab] = useState('all')
  const [editResult, setEditResult] = useState<Result | null>(null)
  const [editScores, setEditScores] = useState<Record<string, number>>({})

  const filtered = items.filter(r => {
    if (contestFilter !== 'all' && String(r.contestId) !== contestFilter) return false
    if (publishTab === 'published' && !r.isPublished) return false
    if (publishTab === 'draft' && r.isPublished) return false
    if (keyword) {
      const reg = getRegistrationById(r.registrationId)
      if (reg && !(reg.formData.name ?? '').includes(keyword) && !reg.registrationNumber.includes(keyword)) return false
    }
    return true
  })

  const handlePublish = (id: number) => {
    setItems(prev => prev.map(r => r.id === id ? { ...r, isPublished: true } : r))
  }
  const handleWithdraw = (id: number) => {
    if (!confirm('确认撤下该成绩？选手端将不可见。')) return
    setItems(prev => prev.map(r => r.id === id ? { ...r, isPublished: false } : r))
  }
  const openEdit = (r: Result) => {
    setEditResult(r)
    setEditScores({ ...r.scores })
  }
  const saveEdit = () => {
    if (!editResult) return
    const total = Object.values(editScores).reduce((sum, v) => sum + (Number(v) || 0), 0)
    setItems(prev => prev.map(r => r.id === editResult.id ? { ...r, scores: editScores, totalScore: total } : r))
    setEditResult(null)
  }

  const finishedContests = contests.filter(c => c.status === 'finished')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">成绩管理</h1>
        <div className="space-x-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />下载模板</Button>
          <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-1" />批量导入</Button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input placeholder="搜索姓名/报名编号..." className="pl-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
        </div>
        <Select value={contestFilter} onValueChange={(v) => setContestFilter(v ?? 'all')}>
          <SelectTrigger className="w-48"><SelectValue placeholder="选择赛事" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部赛事</SelectItem>
            {finishedContests.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Tabs value={publishTab} onValueChange={setPublishTab}>
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="published">已发布</TabsTrigger>
          <TabsTrigger value="draft">草稿</TabsTrigger>
        </TabsList>
      </Tabs>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>报名编号</TableHead>
            <TableHead>姓名</TableHead>
            <TableHead>组别</TableHead>
            <TableHead>总分</TableHead>
            <TableHead>排名</TableHead>
            <TableHead>奖项</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map(r => {
            const reg = getRegistrationById(r.registrationId)
            const name = reg?.formData.name ?? '-'
            const group = getGroupName(r.contestId, reg?.groupId ?? null)
            return (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-sm">{reg?.registrationNumber ?? '-'}</TableCell>
                <TableCell>{name}</TableCell>
                <TableCell>{group}</TableCell>
                <TableCell className="font-bold">{r.totalScore}</TableCell>
                <TableCell>{r.rank ?? '-'}</TableCell>
                <TableCell><Badge variant="outline">{getAwardName(r.awardId)}</Badge></TableCell>
                <TableCell>
                  <Badge variant={r.isPublished ? 'default' : 'secondary'}>{r.isPublished ? '已发布' : '草稿'}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Eye className="h-3 w-3" /></Button>
                  {r.isPublished ? (
                    <Button variant="ghost" size="sm" onClick={() => handleWithdraw(r.id)}>撤回</Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => handlePublish(r.id)}>发布</Button>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <Dialog open={!!editResult} onOpenChange={() => setEditResult(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑成绩</DialogTitle></DialogHeader>
          {editResult && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                报名编号：{getRegistrationById(editResult.registrationId)?.registrationNumber ?? '-'}
                &nbsp;|&nbsp;姓名：{getRegistrationById(editResult.registrationId)?.formData.name ?? '-'}
              </div>
              {Object.entries(editScores).map(([key, val]) => (
                <div key={key} className="space-y-1">
                  <Label>{key}</Label>
                  <Input type="number" value={val} onChange={e => setEditScores(prev => ({ ...prev, [key]: Number(e.target.value) }))} />
                </div>
              ))}
              <div className="text-sm">总分：{Object.values(editScores).reduce((sum, v) => sum + (Number(v) || 0), 0)}</div>
            </div>
          )}
          <DialogFooter><Button onClick={saveEdit}>保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
