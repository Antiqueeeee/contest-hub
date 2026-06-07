import { Outlet, Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-lg text-foreground no-underline">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Trophy className="h-4 w-4 text-primary-foreground" />
            </div>
            <span>竞赛信息发布平台</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/" className="text-foreground hover:text-primary transition-colors font-medium">首页</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-card mt-16">
        <div className="max-w-6xl mx-auto px-6 py-10 text-center text-sm text-muted-foreground">
          © 2026 竞赛信息发布平台
        </div>
      </footer>
    </div>
  )
}
