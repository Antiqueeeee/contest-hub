import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard, Newspaper, Flag, ClipboardList, BarChart3, FileSpreadsheet,
  Users, LogOut, ChevronDown, ChevronRight, Trophy, Bell, Settings
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Collapsible } from '@/components/ui/collapsible'

const sidebarNavItems = [
  { to: '/admin', icon: LayoutDashboard, label: '首页概览' },
  {
    label: '新闻管理', icon: Newspaper,
    children: [
      { to: '/admin/news', label: '新闻列表' },
      { to: '/admin/news/categories', label: '新闻分类' },
    ],
  },
  {
    label: '赛事管理', icon: Flag,
    children: [
      { to: '/admin/contests', label: '赛事列表' },
      { to: '/admin/contests/new', label: '创建赛事' },
    ],
  },
  { to: '/admin/registrations', icon: ClipboardList, label: '报名管理' },
  { to: '/admin/results', icon: BarChart3, label: '成绩管理' },
  { to: '/admin/export', icon: FileSpreadsheet, label: '数据导出' },
  { to: '/admin/users', icon: Users, label: '管理员管理' },
]

function NavItem({ to, icon: Icon, label, end }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
          isActive
            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
            : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
        }`
      }
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span>{label}</span>
    </NavLink>
  )
}

export function AdminSidebar() {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ 新闻管理: true, 赛事管理: true })

  return (
    <aside className="w-64 h-screen bg-sidebar flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Trophy className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-base font-bold text-sidebar-foreground tracking-tight">竞赛管理平台</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {sidebarNavItems.map((item) => {
          if ('children' in item && item.children) {
            const isOpen = openGroups[item.label] ?? true
            const Icon = item.icon
            return (
              <div key={item.label}>
                <button
                  onClick={() => setOpenGroups(prev => ({ ...prev, [item.label]: !prev[item.label] }))}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
                >
                  {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                  <span className="flex-1 text-left">{item.label}</span>
                  {isOpen ? <ChevronDown className="h-3.5 w-3.5 opacity-50" /> : <ChevronRight className="h-3.5 w-3.5 opacity-50" />}
                </button>
                <Collapsible open={isOpen}>
                  <div className="ml-9 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                    {item.children.map(child => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }: { isActive: boolean }) =>
                          `block px-3 py-1.5 text-sm rounded-md transition-all ${
                            isActive
                              ? 'text-sidebar-foreground font-medium bg-sidebar-accent'
                              : 'text-sidebar-foreground/50 hover:text-sidebar-foreground/80'
                          }`
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                </Collapsible>
              </div>
            )
          }
          return <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} end={item.to === '/admin'} />
        })}
      </nav>

      {/* Sidebar footer */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2 text-xs text-sidebar-foreground/40 px-2">
          <Settings className="h-3 w-3" />
          <span>竞赛管理 v1.0</span>
        </div>
      </div>
    </aside>
  )
}

export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="ml-64">
        {/* Header */}
        <header className="h-16 glass border-b border-border/50 flex items-center justify-between px-8 sticky top-0 z-30">
          <h1 className="text-lg font-semibold text-foreground/80">
            {user?.name ? `${user.name}，欢迎回来` : '管理后台'}
          </h1>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-muted rounded-lg transition-colors">
              <Bell className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-3 pl-2 border-l border-border">
              <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {user?.name?.charAt(0) ?? '管'}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <p className="font-medium leading-none">{user?.name ?? '管理员'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">管理员</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-1">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
