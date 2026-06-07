import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { Trophy, User, LogOut, Menu, X } from 'lucide-react'
import { useContestantAuth } from '@/hooks/useContestantAuth'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useState } from 'react'

const navItems = [
  { to: '/', label: '首页' },
  { to: '/about', label: '平台介绍' },
  { to: '/contests', label: '竞赛列表' },
  { to: '/news', label: '通知公告' },
  { to: '/results', label: '成绩查询' },
  { to: '/faq', label: '常见问题' },
  { to: '/contact', label: '联系我们' },
]

export function PublicLayout() {
  const { user, isLoggedIn, logout, loading } = useContestantAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

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

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={`px-3 py-2 rounded-md text-sm transition-colors ${
                  location.pathname === item.to
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {!loading && (
              isLoggedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors cursor-pointer">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">{user?.name}</span>
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => navigate('/me')}><User className="h-4 w-4 mr-2" />个人中心</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />退出登录</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">登录 / 注册</span>
                </Button>
              )
            )}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t bg-card px-4 py-3 space-y-1">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm ${
                  location.pathname === item.to ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
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
