import { Outlet } from 'react-router-dom'
import { Trophy, Globe } from 'lucide-react'

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 font-bold text-lg text-foreground no-underline group">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center group-hover:scale-105 transition-transform">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden sm:inline">竞赛信息发布平台</span>
          </a>
          <nav className="flex items-center gap-6 text-sm">
            <a href="/" className="text-foreground/70 hover:text-foreground transition-colors font-medium">首页</a>
            <a href="/admin/login" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              管理后台
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card mt-16">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="font-bold">竞赛信息发布平台</span>
              </div>
              <p className="text-sm text-muted-foreground">专业的竞赛信息发布与管理解决方案，让每一场竞赛都精彩。</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">快速链接</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>赛事浏览</p>
                <p>成绩查询</p>
                <p>新闻资讯</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">关于</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>隐私政策</p>
                <p>服务条款</p>
                <p>联系我们</p>
              </div>
            </div>
          </div>
          <div className="border-t border-border/50 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
            <p>© 2026 竞赛信息发布平台. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Globe className="h-4 w-4" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
