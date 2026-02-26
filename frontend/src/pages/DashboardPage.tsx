import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchApplications, fetchEmails } from '../api/client.ts'
import type { ApplicationStatus, DashboardStats, JobApplication } from '../types/index.ts'
import StatsCards from '../components/dashboard/StatsCards.tsx'
import ActivityTimeline from '../components/dashboard/ActivityTimeline.tsx'
import StageDistribution from '../components/dashboard/StageDistribution.tsx'
import RecentApplications from '../components/dashboard/RecentApplications.tsx'

const EMPTY_STATS: DashboardStats = {
  totalApplications: 0,
  activeInterviews: 0,
  offersReceived: 0,
  replyRate: 0,
  statusCounts: { new: 0, applied: 0, interviewing: 0, offer: 0, rejected: 0, hired: 0 },
}

const computeStats = (applications: JobApplication[]): DashboardStats => {
  const total = applications.length
  if (total === 0) return EMPTY_STATS

  const statusCounts: Record<ApplicationStatus, number> = {
    new: 0,
    applied: 0,
    interviewing: 0,
    offer: 0,
    rejected: 0,
    hired: 0,
  }

  let appsWithReply = 0
  for (const app of applications) {
    statusCounts[app.status] = (statusCounts[app.status] ?? 0) + 1
    if (app.emails.length > 0) appsWithReply++
  }

  return {
    totalApplications: total,
    activeInterviews: statusCounts.interviewing,
    offersReceived: statusCounts.offer + statusCounts.hired,
    replyRate: (appsWithReply / total) * 100,
    statusCounts,
  }
}

const DashboardPage = () => {
  const {
    data: appsData,
    isLoading: appsLoading,
    isError: appsError,
  } = useQuery({
    queryKey: ['applications', 'dashboard-all'],
    queryFn: () => fetchApplications({ limit: 500, offset: 0 }),
  })

  const {
    data: emailsData,
    isLoading: emailsLoading,
    isError: emailsError,
  } = useQuery({
    queryKey: ['emails', 'recent'],
    queryFn: () => fetchEmails({ limit: 10, offset: 0 }),
  })

  const stats = useMemo<DashboardStats>(
    () => (appsData ? computeStats(appsData.items) : EMPTY_STATS),
    [appsData],
  )

  const recentApplications = useMemo(
    () =>
      appsData
        ? [...appsData.items]
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            )
            .slice(0, 5)
        : [],
    [appsData],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Your job search at a glance</p>
      </div>

      <StatsCards stats={stats} isLoading={appsLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StageDistribution stats={stats} isLoading={appsLoading} />
        <div className="lg:col-span-2">
          <ActivityTimeline
            emails={emailsData?.items ?? []}
            isLoading={emailsLoading}
            isError={emailsError}
          />
        </div>
      </div>

      <RecentApplications
        applications={recentApplications}
        isLoading={appsLoading}
        isError={appsError}
      />
    </div>
  )
}

export default DashboardPage
