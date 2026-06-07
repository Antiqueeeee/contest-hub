import { useLocation, Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Copy } from 'lucide-react'
import { useState } from 'react'

export default function RegisterSuccessPage() {
  const location = useLocation()
  const { id: contestId } = useParams()
  const state = location.state as { registrationNumber?: string; contestTitle?: string; name?: string } | null
  const [copied, setCopied] = useState(false)
  const regNumber = state?.registrationNumber ?? '未知'

  const handleCopy = () => {
    navigator.clipboard.writeText(regNumber); setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <Card className="text-center">
        <CardHeader>
          <div className="flex justify-center mb-3"><CheckCircle className="h-16 w-16 text-green-500" /></div>
          <CardTitle className="text-xl">报名成功！</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">{state?.name ?? '选手'}，您已成功报名 {state?.contestTitle ?? '赛事'}</p>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">您的报名编号</p>
            <div className="flex items-center justify-center gap-2"><span className="text-2xl font-bold font-mono tracking-wider">{regNumber}</span><Button variant="ghost" size="sm" onClick={handleCopy}><Copy className="h-4 w-4" /></Button></div>
            {copied && <p className="text-xs text-green-600 mt-1">已复制</p>}
          </div>
          <p className="text-xs text-muted-foreground">请妥善保存您的报名编号，后续查询成绩时将需要使用此编号和手机号。</p>
          <div className="flex gap-3 pt-2">
            <Link to={`/contests/${contestId}`} className="flex-1"><Button variant="outline" className="w-full">返回赛事页</Button></Link>
            <Link to="/" className="flex-1"><Button className="w-full">返回首页</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
