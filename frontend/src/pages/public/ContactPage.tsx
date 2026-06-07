import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Phone, MapPin, Clock } from 'lucide-react'

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">联系我们</h1>
      <div className="grid sm:grid-cols-2 gap-6 mb-8">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-primary" />电子邮箱</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">support@contest-hub.com</p></CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Phone className="h-4 w-4 text-primary" />联系电话</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">400-000-0000（工作日 9:00-18:00）</p></CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />联系地址</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">北京市海淀区中关村大街 1 号</p></CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />工作时间</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">周一至周五 9:00 - 18:00</p></CardContent>
        </Card>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2 p-6 rounded-xl bg-muted/50">
        <p>如有任何问题或建议，欢迎通过以上方式联系我们。</p>
        <p>如果是关于具体赛事的咨询，建议直接查看赛事详情页中的联系方式，联系该赛事的主办方以获得更快的回复。</p>
        <p>如果您是赛事主办方，希望使用本平台发布竞赛，请联系我们开通管理后台账号。</p>
      </div>
    </div>
  )
}
