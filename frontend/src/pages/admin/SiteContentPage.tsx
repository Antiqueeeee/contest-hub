import { useState, useEffect } from 'react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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

/** 旧版 contact 是整页富文本 HTML，不能静默塞进 tips 卡片；返回 legacy 标记由页面显示提示横幅（与 FAQ 一致）。 */
function parseContactContent(raw: string): { info: ContactInfo; legacy: boolean } {
  if (!raw) return { info: EMPTY_CONTACT, legacy: false }
  try {
    const data = JSON.parse(raw)
    if (data && Array.isArray(data.contacts)) return { info: { ...EMPTY_CONTACT, ...data }, legacy: false }
  } catch { /* 旧版富文本内容 */ }
  return { info: EMPTY_CONTACT, legacy: true }
}

interface FaqItem {
  question: string
  answer: string
}

interface FaqInfo {
  intro: string
  items: FaqItem[]
}

const EMPTY_FAQ: FaqInfo = {
  intro: '',
  items: [{ question: '', answer: '' }],
}

/** 旧版 FAQ 是整段富文本 HTML，无法放进纯文本答案框；返回 legacy 标记由页面显示提示横幅。 */
function parseFaqContent(raw: string): { info: FaqInfo; legacy: boolean } {
  if (!raw) return { info: EMPTY_FAQ, legacy: false }
  try {
    const data = JSON.parse(raw)
    if (data && Array.isArray(data.items)) return { info: { ...EMPTY_FAQ, ...data }, legacy: false }
  } catch { /* 旧版富文本内容 */ }
  return { info: EMPTY_FAQ, legacy: true }
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

function FaqForm({ value, onChange }: { value: FaqInfo; onChange: (v: FaqInfo) => void }) {
  const setField = <K extends keyof FaqInfo>(key: K, v: FaqInfo[K]) => onChange({ ...value, [key]: v })

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Label>页面导语</Label>
        <Input value={value.intro} onChange={e => setField('intro', e.target.value)} placeholder="显示在问题列表上方的一句话介绍" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>常见问题</Label>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setField('items', [...value.items, { question: '', answer: '' }])}>
            <Plus className="h-4 w-4" /> 添加问题
          </Button>
        </div>
        {value.items.map((it, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input value={it.question} onChange={e => { const next = [...value.items]; next[i] = { ...it, question: e.target.value }; setField('items', next) }} placeholder="问题（如：如何报名参赛？）" className="flex-1" />
              <Button variant="ghost" size="icon" className="text-destructive shrink-0" disabled={value.items.length <= 1} onClick={() => setField('items', value.items.filter((_, j) => j !== i))} title="删除">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Textarea value={it.answer} rows={3} onChange={e => { const next = [...value.items]; next[i] = { ...it, answer: e.target.value }; setField('items', next) }} placeholder="解答内容（纯文本，支持换行）" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SiteContentPage() {
  const [pageKey, setPageKey] = useState('about')
  const [content, setContent] = useState('')
  const [contactInfo, setContactInfo] = useState<ContactInfo>(EMPTY_CONTACT)
  const [faqInfo, setFaqInfo] = useState<FaqInfo>(EMPTY_FAQ)
  const [faqLegacy, setFaqLegacy] = useState(false)
  const [contactLegacy, setContactLegacy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    setFaqLegacy(false)
    setContactLegacy(false)
    api.get<{ content: string }>(`/admin/site-content/${pageKey}`).then(r => {
      if (pageKey === 'contact') {
        const p = parseContactContent(r.content)
        setContactInfo(p.info)
        setContactLegacy(p.legacy)
      } else if (pageKey === 'faq') {
        const p = parseFaqContent(r.content)
        setFaqInfo(p.info)
        setFaqLegacy(p.legacy)
      } else {
        setContent(r.content || '')
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [pageKey])

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = pageKey === 'contact' ? { content: JSON.stringify(contactInfo) }
        : pageKey === 'faq' ? { content: JSON.stringify(faqInfo) }
        : { content }
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
          <Button onClick={handleSave} disabled={saving || loading}>{saving ? '保存中...' : '保存并发布'}</Button>
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
            <div className="space-y-4">
              {contactLegacy && (
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/60 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30">
                  检测到旧版富文本内容：保存前请先复制需要保留的内容，重新整理为结构化字段。保存后将覆盖旧内容，旧样式不再展示。
                </div>
              )}
              <ContactForm value={contactInfo} onChange={setContactInfo} />
            </div>
          ) : pageKey === 'faq' ? (
            <div className="space-y-4">
              {faqLegacy && (
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/60 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30">
                  检测到旧版富文本内容：保存前请先复制需要保留的内容，重新整理为问答形式。保存后将覆盖旧内容，旧样式不再展示。
                </div>
              )}
              <FaqForm value={faqInfo} onChange={setFaqInfo} />
            </div>
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
