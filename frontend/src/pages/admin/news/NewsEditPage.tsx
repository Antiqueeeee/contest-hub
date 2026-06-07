import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { newsList, newsCategories } from '@/mock/data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewsEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('1')
  const [content, setContent] = useState('')
  const [coverImage, setCoverImage] = useState('')

  useEffect(() => {
    if (!isNew) {
      const news = newsList.find(n => n.id === Number(id))
      if (news) {
        setTitle(news.title)
        setCategoryId(String(news.categoryId))
        setContent(news.content)
        setCoverImage(news.coverImage)
      }
    }
  }, [id, isNew])

  const handleSave = () => {
    if (!title.trim()) { alert('请输入标题'); return }
    if (isNew) {
      alert('新闻已创建（Mock）')
    } else {
      alert('新闻已更新（Mock）')
    }
    navigate('/admin/news')
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isNew ? '新建新闻' : '编辑新闻'}</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => navigate('/admin/news')}>返回</Button>
          <Button onClick={handleSave}>保存草稿</Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">基本信息</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>标题 <span className="text-destructive">*</span></Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="请输入新闻标题（最多100字符）" maxLength={100} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>分类</Label>
              <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? '1')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {newsCategories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>封面图</Label>
              <Input value={coverImage} onChange={e => setCoverImage(e.target.value)} placeholder="输入图片 URL（可选）" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>正文 <span className="text-destructive">*</span></Label>
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="支持 HTML 格式，后续将接入富文本编辑器"
              className="min-h-[300px] font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
