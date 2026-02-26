import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { fetchApplications } from '../api/client.ts'
import type { ApplicationStatus, JobApplication } from '../types/index.ts'
import LoadingSpinner from '../components/ui/LoadingSpinner.tsx'
import CompanyCard, { type CompanyGroup } from './companies/CompanyCard'

const groupApplications = (items: JobApplication[]): CompanyGroup[] => {
  const map = new Map<string, JobApplication[]>()
  for (const app of items) {
    const key = app.company_name.trim()
    const existing = map.get(key) ?? []
    map.set(key, [...existing, app])
  }

  return Array.from(map.entries())
    .map(([name, applications]) => {
      const statusCounts: Partial<Record<ApplicationStatus, number>> = {}
      let totalEmails = 0
      let latestActivity = applications[0].updated_at
      for (const app of applications) {
        statusCounts[app.status] = (statusCounts[app.status] ?? 0) + 1
        totalEmails += app.email_count
        if (app.updated_at > latestActivity) latestActivity = app.updated_at
      }
      return { name, applications, latestActivity, statusCounts, totalEmails }
    })
    .sort((a, b) => b.latestActivity.localeCompare(a.latestActivity))
}

const CompaniesPage = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['applications', 'companies'],
    queryFn: () => fetchApplications({ limit: 500, offset: 0 }),
  })

  const groups = useMemo<CompanyGroup[]>(() => (data ? groupApplications(data.items) : []), [data])
  const companyCount = groups.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Companies</h1>
        <p className="text-gray-400 text-sm mt-1">
          {data ? `${companyCount} compan${companyCount !== 1 ? 'ies' : 'y'} · ${data.total} application${data.total !== 1 ? 's' : ''}` : 'Loading…'}
        </p>
      </div>

      {isLoading && <LoadingSpinner size="lg" message="Loading companies…" />}

      {isError && (
        <div className="bg-[#1a1a24] rounded-xl p-8 border border-white/5 text-center">
          <p className="text-red-400 text-sm">Failed to load companies.</p>
        </div>
      )}

      {!isLoading && !isError && groups.length === 0 && (
        <div className="bg-[#1a1a24] rounded-xl p-12 border border-white/5 text-center">
          <Building2 size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm font-medium">No companies yet</p>
          <p className="text-gray-600 text-xs mt-1">Add applications to see them grouped by company.</p>
        </div>
      )}

      {!isLoading && !isError && groups.length > 0 && (
        <div className="space-y-3">
          {groups.map((group) => (
            <CompanyCard key={group.name} group={group} />
          ))}
        </div>
      )}
    </div>
  )
}

export default CompaniesPage
