const faqs = [
  { q: '如何报名参加竞赛？', a: '在竞赛列表中找到您想参加的赛事，点击进入赛事详情页，填写报名表单并提交即可。报名成功后您将获得一个报名编号，请妥善保存。' },
  { q: '报名需要收费吗？', a: '目前平台上的赛事均为免费报名。如有特殊收费赛事，主办方会在赛事介绍中明确说明。' },
  { q: '如何查询我的成绩？', a: '您可以通过以下方式查询成绩：1) 在成绩查询页面选择赛事，输入报名编号和手机号；2) 从赛事详情页点击「查询成绩」；3) 注册并登录后，在个人中心查看历史成绩。' },
  { q: '忘记报名编号怎么办？', a: '如果您已经注册了账号并登录后报名，报名记录会保存在个人中心。如果您是以匿名方式报名，请联系赛事主办方提供帮助。' },
  { q: '可以修改已提交的报名信息吗？', a: '报名提交后暂不支持自行修改。如需修改，请联系赛事主办方或平台管理员协助处理。' },
  { q: '如何联系主办方？', a: '每个赛事详情页都会显示主办方的联系方式。您也可以在「联系我们」页面提交问题，我们会尽快回复。' },
  { q: '平台如何保护我的个人信息？', a: '我们严格遵守个人信息保护相关法规，您的手机号等敏感信息在数据库中使用加密存储，全站使用 HTTPS 加密传输。' },
  { q: '我是主办方，如何使用平台发布赛事？', a: '请登录管理后台（联系平台管理员获取账号），即可创建赛事、配置报名表单、管理报名数据和发布成绩。' },
]

export default function FAQPage() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">常见问题</h1>
      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <details key={i} className="group border rounded-xl p-5 cursor-pointer hover:border-primary/30 transition-colors">
            <summary className="font-medium text-foreground group-open:text-primary group-open:mb-3 select-none">{faq.q}</summary>
            <p className="text-sm text-muted-foreground leading-relaxed pt-2 border-t border-border/50">{faq.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
