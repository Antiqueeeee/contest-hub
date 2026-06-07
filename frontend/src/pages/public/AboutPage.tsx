import { Trophy, Users, FileText, Shield } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">平台介绍</h1>

      <div className="grid sm:grid-cols-2 gap-6 mb-10">
        {[
          { icon: Trophy, title: '赛事发布', desc: '主办方可快速创建竞赛，配置组别、奖项和报名表单，一键发布并分享链接。' },
          { icon: Users, title: '在线报名', desc: '参赛选手通过链接或二维码进入赛事页面，填写信息提交即可完成报名。' },
          { icon: FileText, title: '成绩管理', desc: '赛后录入或批量导入成绩，选手可通过报名编号和手机号自助查询。' },
          { icon: Shield, title: '数据安全', desc: '选手个人信息加密存储，全站 HTTPS 传输，符合个人信息保护合规要求。' },
        ].map(f => (
          <div key={f.title} className="p-6 rounded-xl border bg-card">
            <f.icon className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-bold mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed space-y-4">
        <h2 className="text-xl font-bold text-foreground">关于本平台</h2>
        <p>竞赛信息发布平台是一个轻量级的竞赛管理工具，致力于为主办方和参赛选手提供高效便捷的服务。</p>
        <p>主办方可以通过平台快速搭建赛事门户，发布竞赛信息，收集报名数据，管理比赛成绩。参赛选手可以浏览赛事、在线报名，并在赛后查询个人成绩。</p>
        <p>平台以简洁实用为设计理念，让每一场竞赛都能得到专业、高效的管理。</p>
      </div>
    </div>
  )
}
