import { useState, useEffect } from 'react'
import { CircleHelp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/api/client'
import { sanitizeHtml } from '@/lib/sanitize'

interface FaqItem {
  question: string
  answer: string
}

interface FaqInfo {
  intro: string
  items: FaqItem[]
}

const DEFAULT_INFO: FaqInfo = {
  intro: '以下是选手们最常咨询的问题，如未找到答案，请通过「联系我们」页面与我们取得联系。',
  items: [
    { question: '如何报名参赛？', answer: '注册并登录账号后，进入赛事详情页面，点击"立即报名"按钮，填写所需信息并提交即可完成报名。' },
    { question: '报名需要准备哪些材料？', answer: '通常需要提供姓名、身份证号、联系方式等基本信息。不同赛事可能有额外要求，详见赛事详情页。' },
    { question: '如何查询比赛成绩？', answer: '成绩发布后，您可以在赛事页面通过报名编号和邮箱查询，或登录后在个人中心查看。' },
    { question: '忘记密码怎么办？', answer: '请联系管理员协助重置密码（联系方式见"联系我们"页面）。' },
    { question: '可以修改已提交的报名信息吗？', answer: '报名截止前可联系管理员处理，报名截止后信息锁定不可更改。' },
  ],
}

function parseFaqContent(raw: string): { info?: FaqInfo; legacyHtml?: string } {
  if (!raw) return {}
  try {
    const data = JSON.parse(raw)
    // 合法 JSON 但形状不符：回退默认内容，而不是把原始 JSON 文本渲染给访客
    if (data && Array.isArray(data.items)) return { info: data as FaqInfo }
    return {}
  } catch { /* 旧版富文本内容 */ }
  return { legacyHtml: raw }
}

const heroGradient = { background: 'linear-gradient(135deg, hsl(243 75% 59%) 0%, hsl(271 81% 56%) 100%)' }

export default function FAQPage() {
  const [info, setInfo] = useState<FaqInfo>(DEFAULT_INFO)
  const [legacyHtml, setLegacyHtml] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ content: string }>('/public/site-content/faq').then(r => {
      const parsed = parseFaqContent(r.content)
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

  const visibleItems = info.items.filter(i => i.question || i.answer)

  return (
    <div className="max-w-3xl mx-auto px-6">
      <div className="rounded-2xl px-8 py-10 mb-8 text-primary-foreground" style={heroGradient}>
        <h1 className="text-2xl font-bold">常见问题</h1>
        {info.intro && <p className="mt-2 text-sm opacity-90">{info.intro}</p>}
      </div>

      <div className="space-y-4">
        {visibleItems.map((item, i) => (
          <Card key={i} className="rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <CircleHelp className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{item.question}</p>
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line break-words leading-relaxed">{item.answer ?? ''}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
