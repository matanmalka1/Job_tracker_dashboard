import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout.tsx'
import DashboardPage from './pages/DashboardPage.tsx'
import PipelinePage from './pages/PipelinePage.tsx'
import ApplicationsPage from './pages/ApplicationsPage.tsx'
import CompaniesPage from './pages/CompaniesPage.tsx'
import SettingsPage from './pages/SettingsPage.tsx'
import ApplicationDetailPage from './pages/ApplicationDetailPage.tsx'
import ManageDataUiPage from './pages/ManageDataUiPage.tsx'
import InterviewsPage from './pages/InterviewsPage.tsx'

// FIX: InterviewsPage was imported in InterviewsPage.tsx but never registered in the router

const App = () => (
  <Routes>
    <Route path="/" element={<Layout />}>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="pipeline" element={<PipelinePage />} />
      <Route path="applications" element={<ApplicationsPage />} />
      <Route path="applications/:id" element={<ApplicationDetailPage />} />
      <Route path="interviews" element={<InterviewsPage />} />
      <Route path="companies" element={<CompaniesPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="manage-data" element={<ManageDataUiPage />} />
    </Route>
  </Routes>
)

export default App