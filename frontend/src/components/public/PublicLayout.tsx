import { Outlet, Link, useNavigate } from 'react-router-dom'
import { Trophy, User, LogOut } from 'lucide-react'
import { useContestantAuth } from '@/hooks/useContestantAuth'
import { Button } from '@/components/ui/button'

export function PublicLayout() {
  const { user, isLoggedIn, logout, loading } = useContestantAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

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
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/" className="text-foreground hover:text-primary transition-colors font-medium">首页</Link>
            {!loading && (
              isLoggedIn ? (
                <>
                  <Link to="/me" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                    <User className="h-4 w-4" />
                    <span>{user?.name}</span>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">登录</Link>
                  <Link to="/register" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">注册</Link>
                </>
              )
            )}
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
