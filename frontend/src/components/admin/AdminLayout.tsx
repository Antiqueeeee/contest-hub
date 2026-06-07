import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard, Newspaper, Flag, ClipboardList, BarChart3, FileSpreadsheet,
  Users, LogOut, ChevronDown, ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Collapsible } from '@/components/ui/collapsible'

const sidebarNavItems = [
  { to: '/admin', icon: LayoutDashboard, label: '首页' },
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

export function AdminSidebar() {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ 新闻管理: true, 赛事管理: true })

  return (
    <aside className="w-60 h-screen bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0">
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
        <span className="text-lg font-bold text-sidebar-foreground">竞赛管理平台</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {sidebarNavItems.map((item) => {
          if ('children' in item && item.children) {
            const isOpen = openGroups[item.label] ?? true
            return (
              <div key={item.label}>
                <button
                  onClick={() => setOpenGroups(prev => ({ ...prev, [item.label]: !prev[item.label] }))}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  <span className="flex-1 text-left">{item.label}</span>
                  {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
                <Collapsible open={isOpen}>
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map(child => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }: { isActive: boolean }) =>
                          `block px-3 py-1.5 text-sm rounded-md transition-colors ${
                            isActive
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                              : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
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
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }: { isActive: boolean }) =>
                `flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }`
              }
            >
              {item.icon && <item.icon className="h-4 w-4" />}
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

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="ml-60">
        <header className="h-14 border-b flex items-center justify-end px-6 gap-4 bg-card">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{user?.name?.charAt(0) ?? '管'}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{user?.name ?? '管理员'}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" />
            退出
          </Button>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
