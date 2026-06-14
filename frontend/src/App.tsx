import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { PublicLayout } from '@/components/public/PublicLayout'
import { useAuth } from '@/hooks/useAuth'

import AdminLoginPage from '@/pages/admin/LoginPage'
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
import SiteContentPage from '@/pages/admin/SiteContentPage'
import GroupManagementPage from '@/pages/admin/GroupManagementPage'
import CarouselPage from '@/pages/admin/CarouselPage'
import HomePage from '@/pages/public/HomePage'
import NewsDetailPage from '@/pages/public/NewsDetailPage'
import ContestDetailPage from '@/pages/public/ContestDetailPage'
import ContestRegisterPage from '@/pages/public/ContestRegisterPage'
import RegisterSuccessPage from '@/pages/public/RegisterSuccessPage'
import ResultQueryPage from '@/pages/public/ResultQueryPage'
import ContestantLoginPage from '@/pages/public/LoginPage'
import ContestantRegisterPage from '@/pages/public/ContestantRegisterPage'
import ContestantCenterPage from '@/pages/public/ContestantCenterPage'
import AboutPage from '@/pages/public/AboutPage'
import PublicContestListPage from '@/pages/public/PublicContestListPage'
import PublicNewsListPage from '@/pages/public/PublicNewsListPage'
import GeneralResultQueryPage from '@/pages/public/GeneralResultQueryPage'
import FAQPage from '@/pages/public/FAQPage'
import ContactPage from '@/pages/public/ContactPage'

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
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contests" element={<PublicContestListPage />} />
        <Route path="/contests/:id" element={<ContestDetailPage />} />
        <Route path="/contests/:id/register" element={<ContestRegisterPage />} />
        <Route path="/contests/:id/register/success" element={<RegisterSuccessPage />} />
        <Route path="/contests/:id/results" element={<ResultQueryPage />} />
        <Route path="/news" element={<PublicNewsListPage />} />
        <Route path="/news/:id" element={<NewsDetailPage />} />
        <Route path="/results" element={<GeneralResultQueryPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<ContestantLoginPage />} />
        <Route path="/register" element={<ContestantRegisterPage />} />
        <Route path="/me" element={<ContestantCenterPage />} />
      </Route>

      {/* Admin */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
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
        <Route path="site-content" element={<SiteContentPage />} />
        <Route path="carousel" element={<CarouselPage />} />
        <Route path="groups" element={<GroupManagementPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
