import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard, Newspaper, Flag, ClipboardList, BarChart3, FileSpreadsheet,
  Users, LogOut, ChevronDown, ChevronRight, Trophy, FileText, Images,
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
      { to: '/admin/news/categories', label: '分类管理' },
      { to: '/admin/news', label: '列表管理' },
    ],
  },
  {
    label: '赛事管理', icon: Flag,
    children: [
      { to: '/admin/groups', label: '组别管理' },
      { to: '/admin/contests', label: '赛事列表' },
    ],
  },
  { to: '/admin/registrations', icon: ClipboardList, label: '报名管理' },
  { to: '/admin/results', icon: BarChart3, label: '成绩管理' },
  { to: '/admin/export', icon: FileSpreadsheet, label: '数据导出' },
  { to: '/admin/site-content', icon: FileText, label: '站点内容' },
  { to: '/admin/carousel', icon: Images, label: '轮播图管理' },
  { to: '/admin/users', icon: Users, label: '管理员管理' },
]

export function AdminSidebar() {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ 新闻管理: true, 赛事管理: true })

  return (
    <aside className="w-60 h-screen bg-sidebar flex flex-col fixed left-0 top-0 z-40">
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-sidebar-border">
        <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
          <Trophy className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="font-bold text-sidebar-foreground text-sm">竞赛管理平台</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {sidebarNavItems.map((item) => {
          if ('children' in item && item.children) {
            const isOpen = openGroups[item.label] ?? true
            const Icon = item.icon
            return (
              <div key={item.label}>
                <button
                  onClick={() => setOpenGroups(prev => ({ ...prev, [item.label]: !prev[item.label] }))}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span className="flex-1 text-left">{item.label}</span>
                  {isOpen ? <ChevronDown className="h-3 w-3 opacity-50" /> : <ChevronRight className="h-3 w-3 opacity-50" />}
                </button>
                <Collapsible open={isOpen}>
                  <div className="ml-8 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
                    {item.children.map(child => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }: { isActive: boolean }) =>
                          `block px-3 py-1.5 text-sm rounded-md transition-colors ${
                            isActive ? 'text-sidebar-foreground font-medium bg-sidebar-accent' : 'text-sidebar-foreground/45 hover:text-sidebar-foreground/75'
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
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }: { isActive: boolean }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}

export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="ml-60">
        <header className="h-14 bg-card border-b flex items-center justify-between px-6 sticky top-0 z-30">
          <h1 className="font-semibold text-foreground/80">欢迎回来{user?.name ? `，${user.name}` : ''}</h1>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">{user?.name?.charAt(0) ?? '管'}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/admin/login') }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
