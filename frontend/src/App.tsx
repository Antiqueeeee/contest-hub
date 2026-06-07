import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { PublicLayout } from '@/components/public/PublicLayout'
import { useAuth } from '@/hooks/useAuth'

import LoginPage from '@/pages/admin/LoginPage'
import DashboardPage from '@/pages/admin/DashboardPage'
import AdminUsersPage from '@/pages/admin/AdminUsersPage'
import NewsListPage from '@/pages/admin/news/NewsListPage'
import NewsEditPage from '@/pages/admin/news/NewsEditPage'
import NewsCategoriesPage from '@/pages/admin/news/NewsCategoriesPage'
import ContestListPage from '@/pages/admin/contests/ContestListPage'
import ContestEditPage from '@/pages/admin/contests/ContestEditPage'
import RegistrationListPage from '@/pages/admin/RegistrationListPage'
import ResultListPage from '@/pages/admin/results/ResultListPage'
import ExportPage from '@/pages/admin/ExportPage'
import HomePage from '@/pages/public/HomePage'
import NewsDetailPage from '@/pages/public/NewsDetailPage'
import ContestDetailPage from '@/pages/public/ContestDetailPage'
import RegisterPage from '@/pages/public/RegisterPage'
import RegisterSuccessPage from '@/pages/public/RegisterSuccessPage'
import ResultQueryPage from '@/pages/public/ResultQueryPage'

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/news/:id" element={<NewsDetailPage />} />
        <Route path="/contests/:id" element={<ContestDetailPage />} />
        <Route path="/contests/:id/register" element={<RegisterPage />} />
        <Route path="/contests/:id/register/success" element={<RegisterSuccessPage />} />
        <Route path="/contests/:id/results" element={<ResultQueryPage />} />
      </Route>

      {/* Admin */}
      <Route path="/admin/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminLayout />
          </AdminGuard>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="news" element={<NewsListPage />} />
        <Route path="news/new" element={<NewsEditPage />} />
        <Route path="news/:id" element={<NewsEditPage />} />
        <Route path="news/categories" element={<NewsCategoriesPage />} />
        <Route path="contests" element={<ContestListPage />} />
        <Route path="contests/new" element={<ContestEditPage />} />
        <Route path="contests/:id" element={<ContestEditPage />} />
        <Route path="registrations" element={<RegistrationListPage />} />
        <Route path="results" element={<ResultListPage />} />
        <Route path="export" element={<ExportPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
