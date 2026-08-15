import { useState, useEffect } from 'react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import RichTextEditor from '@/components/editor/RichTextEditor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'

const pages = [
  { key: 'about', label: '平台介绍' },
  { key: 'faq', label: '常见问题' },
  { key: 'contact', label: '联系我们' },
  { key: 'privacy_policy', label: '隐私政策' },
]

interface ContactPerson {
  name: string
  role?: string
  phone: string
}

interface ContactInfo {
  intro: string
  contacts: ContactPerson[]
  supervision_phone: string
  email: string
  address: string
  work_hours: string
  tips: string
}

const EMPTY_CONTACT: ContactInfo = {
  intro: '',
  contacts: [{ name: '', role: '', phone: '' }],
  supervision_phone: '',
  email: '',
  address: '',
  work_hours: '',
  tips: '',
}

function parseContactContent(raw: string): ContactInfo {
  if (!raw) return EMPTY_CONTACT
  try {
    const data = JSON.parse(raw)
    if (data && Array.isArray(data.contacts)) return { ...EMPTY_CONTACT, ...data }
  } catch { /* 旧版富文本，原样放入提示区 */ }
  return { ...EMPTY_CONTACT, tips: raw }
}

function ContactForm({ value, onChange }: { value: ContactInfo; onChange: (v: ContactInfo) => void }) {
  const setField = <K extends keyof ContactInfo>(key: K, v: ContactInfo[K]) => onChange({ ...value, [key]: v })

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Label>页面导语</Label>
        <Input value={value.intro} onChange={e => setField('intro', e.target.value)} placeholder="显示在页面顶部横幅中的一句话介绍" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>赛事联系人</Label>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setField('contacts', [...value.contacts, { name: '', role: '', phone: '' }])}>
            <Plus className="h-4 w-4" /> 添加联系人
          </Button>
        </div>
        {value.contacts.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={c.name} onChange={e => { const next = [...value.contacts]; next[i] = { ...c, name: e.target.value }; setField('contacts', next) }} placeholder="姓名" className="w-32" />
            <Input value={c.role ?? ''} onChange={e => { const next = [...value.contacts]; next[i] = { ...c, role: e.target.value }; setField('contacts', next) }} placeholder="负责事项（如：报名咨询）" className="flex-1" />
            <Input value={c.phone} onChange={e => { const next = [...value.contacts]; next[i] = { ...c, phone: e.target.value }; setField('contacts', next) }} placeholder="手机号" className="w-44" />
            <Button variant="ghost" size="icon" className="text-destructive shrink-0" disabled={value.contacts.length <= 1} onClick={() => setField('contacts', value.contacts.filter((_, j) => j !== i))} title="删除">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>监督电话</Label>
          <Input value={value.supervision_phone} onChange={e => setField('supervision_phone', e.target.value)} placeholder="如 0311-12345678" />
        </div>
        <div className="space-y-1.5">
          <Label>电子邮箱</Label>
          <Input value={value.email} onChange={e => setField('email', e.target.value)} placeholder="如 service@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label>联系地址</Label>
          <Input value={value.address} onChange={e => setField('address', e.target.value)} placeholder="通讯地址" />
        </div>
        <div className="space-y-1.5">
          <Label>工作时间</Label>
          <Input value={value.work_hours} onChange={e => setField('work_hours', e.target.value)} placeholder="如：周一至周五 9:00 — 18:00" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>咨询提示 / 温馨建议（前台显示为黄色提示卡片）</Label>
        <RichTextEditor
          value={value.tips}
          onChange={v => setField('tips', v)}
          minHeight="160px"
          placeholder="如：来电请说明姓名、学校和咨询的赛事名称，我们会在 1-2 个工作日内回复……"
        />
      </div>
    </div>
  )
}

export default function SiteContentPage() {
  const [pageKey, setPageKey] = useState('about')
  const [content, setContent] = useState('')
  const [contactInfo, setContactInfo] = useState<ContactInfo>(EMPTY_CONTACT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get<{ content: string }>(`/admin/site-content/${pageKey}`).then(r => {
      if (pageKey === 'contact') {
        setContactInfo(parseContactContent(r.content))
      } else {
        setContent(r.content || '')
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [pageKey])

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = pageKey === 'contact' ? { content: JSON.stringify(contactInfo) } : { content }
      await api.put(`/admin/site-content/${pageKey}`, body)
      alert('保存成功，前台页面已更新')
    } catch (e) {
      alert('保存失败')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">站点内容管理</h1>
        <div className="flex items-center gap-3">
          <select value={pageKey} onChange={e => setPageKey(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            {pages.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存并发布'}</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{pages.find(p => p.key === pageKey)?.label}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">加载中...</p>
          ) : pageKey === 'contact' ? (
            <ContactForm value={contactInfo} onChange={setContactInfo} />
          ) : (
            <RichTextEditor
              value={content}
              onChange={setContent}
              minHeight="520px"
              placeholder="输入内容..."
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
