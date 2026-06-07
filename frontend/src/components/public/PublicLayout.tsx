import { Outlet, Link, useNavigate } from 'react-router-dom'
import { Trophy, User, LogOut, Newspaper, Flag } from 'lucide-react'
import { useContestantAuth } from '@/hooks/useContestantAuth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function PublicLayout() {
  const { user, isLoggedIn, logout, loading } = useContestantAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-lg text-foreground no-underline shrink-0">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Trophy className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="hidden sm:inline">竞赛信息发布平台</span>
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            <Link to="/" className="px-3 py-2 rounded-md hover:bg-muted transition-colors font-medium">首页</Link>
            <a href="/#news" className="px-3 py-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex items-center gap-1.5 no-underline">
              <Newspaper className="h-3.5 w-3.5" />新闻
            </a>
            <a href="/#contests" className="px-3 py-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex items-center gap-1.5 no-underline">
              <Flag className="h-3.5 w-3.5" />赛事
            </a>
          </nav>

          <div className="flex items-center gap-2">
            {!loading && (
              isLoggedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="ghost" size="sm" className="gap-2" type="button">
                      <User className="h-4 w-4" />
                      <span>{user?.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => navigate('/me')}>
                      <User className="h-4 w-4 mr-2" />个人中心
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />退出登录
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="gap-2">
                  <User className="h-4 w-4" />
                  登录 / 注册
                </Button>
              )
            )}
          </div>
        </div>
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="border-t bg-card mt-16">
        <div className="max-w-6xl mx-auto px-6 py-10 text-center text-sm text-muted-foreground">
          © 2026 竞赛信息发布平台
        </div>
      </footer>
    </div>
  )
}
