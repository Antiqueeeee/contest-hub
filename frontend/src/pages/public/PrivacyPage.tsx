import { useState, useEffect } from 'react'
import { api } from '@/api/client'

const DEFAULT = `<h1>隐私政策</h1>
<p>本隐私政策说明竞赛信息发布平台（以下简称「本平台」）在您使用平台服务过程中如何收集、使用、保存和保护您的个人信息。请您在使用本平台前仔细阅读本政策。</p>
<h2>一、我们收集的信息</h2>
<ul>
  <li><strong>姓名</strong> — 用于报名登记和成绩单展示</li>
  <li><strong>邮箱</strong> — 用作登录账号，并用于接收赛事相关通知</li>
  <li><strong>身份证号</strong> — 属于<strong>敏感个人信息</strong>，仅在赛事报名需要身份核验时收集，用于核实参赛者身份，不会对外公开</li>
  <li><strong>学校/单位</strong> — 选填，用于赛事分组与统计</li>
</ul>
<h2>二、信息处理目的</h2>
<ul>
  <li>完成赛事报名、身份核验与参赛管理</li>
  <li>发布成绩、排名与获奖信息</li>
  <li>向您推送赛事相关的通知与公告</li>
  <li>保障平台服务的安全稳定运行</li>
</ul>
<h2>三、信息保存期限</h2>
<p>您的个人信息将在为您提供服务所必需的期限内保存。赛事结束后，与赛事相关的报名及成绩信息将按赛事主办方要求保存；超过保存期限后，我们将对您的个人信息进行删除或匿名化处理。</p>
<h2>四、您的权利</h2>
<ul>
  <li><strong>查阅与复制</strong> — 您有权查阅、复制您的个人信息</li>
  <li><strong>更正</strong> — 您可以在个人中心更正您的姓名、邮箱、单位及身份证号等信息</li>
  <li><strong>删除/注销</strong> — 您有权要求删除您的个人信息或注销账号</li>
  <li><strong>撤回同意</strong> — 您有权撤回已作出的同意；撤回不影响撤回前基于同意已开展的处理活动</li>
</ul>
<h2>五、关于身份证号的特别说明</h2>
<p>身份证号属于敏感个人信息。本平台仅在赛事报名确需身份核验的场景下，经您<strong>单独同意</strong>后收集您的身份证号，且仅用于该赛事的报名核验，不会公开展示，也不会用于其他任何目的。在平台内展示时，身份证号均以脱敏形式呈现（如 3201****1234）。如赛事不要求身份核验，您可以不提供身份证号。</p>
<h2>六、联系我们</h2>
<p>如您对本隐私政策或个人信息保护有任何疑问、意见或投诉，或希望行使上述权利，请通过以下方式联系我们：</p>
<ul>
  <li>联系邮箱：【请平台运营方填写联系邮箱】</li>
  <li>联系电话：【请平台运营方填写联系电话】</li>
</ul>
<p>我们将在收到您的请求后尽快处理并回复。</p>`

export default function PrivacyPage() {
  const [content, setContent] = useState(DEFAULT)
  useEffect(() => {
    api.get<{ content: string }>('/public/site-content/privacy_policy').then(r => {
      if (r.content) setContent(r.content)
    }).catch(() => {})
  }, [])

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="prose prose-sm max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  )
}
