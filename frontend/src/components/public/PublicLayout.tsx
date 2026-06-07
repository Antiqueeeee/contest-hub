import { Outlet } from 'react-router-dom'
import { Trophy } from 'lucide-react'

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 font-bold text-lg text-foreground no-underline">
            <Trophy className="h-5 w-5 text-primary" />
            竞赛信息发布平台
          </a>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <a href="/" className="hover:text-foreground transition-colors">首页</a>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © 2026 竞赛信息发布平台. All rights reserved.
      </footer>
    </div>
  )
}
