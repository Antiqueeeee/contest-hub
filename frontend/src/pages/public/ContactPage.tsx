import { useState, useEffect } from 'react'
import { Phone, Mail, MapPin, Clock, ShieldCheck, UserRound } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/api/client'
import { sanitizeHtml } from '@/lib/sanitize'

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

const DEFAULT_INFO: ContactInfo = {
  intro: '如有赛事报名、成绩查询等方面的问题，欢迎通过以下方式与我们取得联系。',
  contacts: [
    { name: '张老师', role: '赛事咨询', phone: '138-0000-0000' },
    { name: '李老师', role: '报名咨询', phone: '139-0000-0000' },
  ],
  supervision_phone: '0311-00000000',
  email: 'service@example.com',
  address: '河北省石家庄市XX区XX路XX号',
  work_hours: '周一至周五 9:00 — 18:00',
  tips: '<p>为提高沟通效率，建议您在来电或来信中说明<strong>姓名、所在学校、咨询的赛事名称</strong>，我们会在 1-2 个工作日内回复。</p>',
}

function parseContactContent(raw: string): { info?: ContactInfo; legacyHtml?: string } {
  if (!raw) return {}
  try {
    const data = JSON.parse(raw)
    // 合法 JSON 但形状不符：回退默认内容，而不是把原始 JSON 文本渲染给访客
    if (data && Array.isArray(data.contacts)) return { info: data as ContactInfo }
    return {}
  } catch { /* 旧版富文本内容 */ }
  return { legacyHtml: raw }
}

const heroGradient = { background: 'linear-gradient(135deg, hsl(243 75% 59%) 0%, hsl(271 81% 56%) 100%)' }

function InfoTile({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  const inner = (
    <CardContent className="flex items-start gap-4 p-5 h-full">
      <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 font-medium break-all">{value}</p>
      </div>
    </CardContent>
  )
  return href ? (
    <a href={href} className="block rounded-xl border bg-card transition-colors hover:border-primary/40 no-underline text-foreground">{inner}</a>
  ) : (
    <div className="rounded-xl border bg-card">{inner}</div>
  )
}

export default function ContactPage() {
  const [info, setInfo] = useState<ContactInfo>(DEFAULT_INFO)
  const [legacyHtml, setLegacyHtml] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ content: string }>('/public/site-content/contact').then(r => {
      const parsed = parseContactContent(r.content)
      if (parsed.info) setInfo({ ...DEFAULT_INFO, ...parsed.info })
      else if (parsed.legacyHtml) setLegacyHtml(parsed.legacyHtml)
    }).catch(() => {})
  }, [])

  if (legacyHtml) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="prose prose-sm max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(legacyHtml) }} />
      </div>
    )
  }

  const infoTiles = [
    { icon: <ShieldCheck className="h-5 w-5" />, label: '监督电话', value: info.supervision_phone, href: info.supervision_phone ? `tel:${info.supervision_phone.replace(/[^+\d]/g, '')}` : undefined },
    { icon: <Mail className="h-5 w-5" />, label: '电子邮箱', value: info.email, href: info.email ? `mailto:${info.email}` : undefined },
    { icon: <MapPin className="h-5 w-5" />, label: '联系地址', value: info.address },
    { icon: <Clock className="h-5 w-5" />, label: '工作时间', value: info.work_hours },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6">
      <div className="rounded-2xl px-8 py-10 mb-8 text-primary-foreground" style={heroGradient}>
        <h1 className="text-2xl font-bold">联系我们</h1>
        <p className="mt-2 text-sm opacity-90">{info.intro}</p>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">赛事联系人</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {info.contacts.map((c, i) => (
            <Card key={i} className="rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <UserRound className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold leading-tight">{c.name}</p>
                    {c.role && <p className="text-sm text-muted-foreground leading-tight mt-0.5">{c.role}</p>}
                  </div>
                </div>
                {c.phone && (
                  <a
                    href={`tel:${c.phone.replace(/[^+\d]/g, '')}`}
                    className="mt-4 flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {c.phone}
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">联系方式</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {infoTiles.map(t => t.value ? <InfoTile key={t.label} {...t} /> : null)}
        </div>
      </section>

      {info.tips && (
        <section className="mb-8">
          <Card className="rounded-xl border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30">
            <CardContent className="p-5">
              <h2 className="text-base font-semibold mb-2 text-amber-800 dark:text-amber-400">咨询提示</h2>
              <div className="prose prose-sm max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(info.tips) }} />
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}
