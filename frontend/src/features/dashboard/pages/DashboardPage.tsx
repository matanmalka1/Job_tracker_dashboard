import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchApplications, fetchEmails, fetchStats } from '../../../api/client.ts'
import type { DashboardStats } from '../../../shared/types/job-tracker.ts'
import StatsCards from '../components/StatsCards.tsx'
import ActivityTimeline from '../components/ActivityTimeline.tsx'
import StageDistribution from '../components/StageDistribution.tsx'
import RecentApplications from '../components/RecentApplications.tsx'

const EMPTY_STATS: DashboardStats = {
  totalApplications: 0,
  activeInterviews: 0,
  offersReceived: 0,
  replyRate: 0,
  statusCounts: { applied: 0, interviewing: 0, offer: 0, rejected: 0 },
}

const DashboardPage = () => {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    staleTime: 30_000,
  })

  const { data: appsData, isLoading: appsLoading, isError: appsError } = useQuery({
    queryKey: ['applications', 'dashboard-recent'],
    queryFn: () => fetchApplications({ limit: 5, offset: 0, sort: 'updated_at' }),
    staleTime: 30_000,
  })

  const { data: emailsData, isLoading: emailsLoading, isError: emailsError } = useQuery({
    queryKey: ['emails', 'recent'],
    queryFn: () => fetchEmails({ limit: 50, offset: 0 }),
    staleTime: 30_000,
  })

  const stats = useMemo<DashboardStats>(() => {
    if (!statsData) return EMPTY_STATS
    return {
      totalApplications: statsData.total,
      activeInterviews: statsData.by_status.interviewing ?? 0,
      offersReceived: statsData.by_status.offer ?? 0,
      replyRate: statsData.reply_rate,
      statusCounts: {
        applied: statsData.by_status.applied ?? 0,
        interviewing: statsData.by_status.interviewing ?? 0,
        offer: statsData.by_status.offer ?? 0,
        rejected: statsData.by_status.rejected ?? 0,
      },
    }
  }, [statsData])

  return (
    <div className="flex flex-col gap-6 max-w-[1400px]">
      <StatsCards stats={stats} isLoading={statsLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-[520px]">
        <StageDistribution stats={stats} isLoading={statsLoading} />
        <div className="lg:col-span-2 h-full overflow-hidden">
          <ActivityTimeline
            emails={emailsData?.items ?? []}
            isLoading={emailsLoading}
            isError={emailsError}
          />
        </div>
      </div>

      <RecentApplications
        applications={appsData?.items ?? []}
        isLoading={appsLoading}
        isError={appsError}
      />
    </div>
  )
}

export default DashboardPage
