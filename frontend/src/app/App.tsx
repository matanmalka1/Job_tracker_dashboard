import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from '../shared/components/layout/Layout.tsx'
import DashboardPage from '../features/dashboard/pages/DashboardPage.tsx'
import PipelinePage from '../features/pipeline/pages/PipelinePage.tsx'
import ApplicationsPage from '../features/applications/pages/ApplicationsPage.tsx'
import CompaniesPage from '../features/companies/pages/CompaniesPage.tsx'
import SettingsPage from '../features/settings/pages/SettingsPage.tsx'
import ApplicationDetailPage from '../features/application-detail/pages/ApplicationDetailPage.tsx'
import DataManagementPage from '../features/manage-data/pages/DataManagementPage.tsx'
import InterviewsPage from '../features/interviews/pages/InterviewsPage.tsx'
import LiveLoggerPage from '../features/live-logger/pages/LiveLoggerPage.tsx'

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
      <Route path="manage-data" element={<DataManagementPage />} />
      <Route path="live-logger" element={<LiveLoggerPage />} />
    </Route>
  </Routes>
)

export default App
