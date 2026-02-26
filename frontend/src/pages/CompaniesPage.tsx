import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Building2, ChevronDown, ChevronUp, Mail } from 'lucide-react'
import { fetchApplications } from '../api/client.ts'
import type { ApplicationStatus, JobApplication } from '../types/index.ts'
import StatusBadge from '../components/ui/StatusBadge.tsx'
import LoadingSpinner from '../components/ui/LoadingSpinner.tsx'

interface CompanyGroup {
  name: string
  applications: JobApplication[]
  latestActivity: string
  statusCounts: Partial<Record<ApplicationStatus, number>>
  totalEmails: number
}

const STATUS_ORDER: ApplicationStatus[] = ['hired', 'offer', 'interviewing', 'applied', 'new', 'rejected']

const STATUS_DOT: Record<ApplicationStatus, string> = {
  new: 'bg-gray-400',
  applied: 'bg-blue-400',
  interviewing: 'bg-purple-400',
  offer: 'bg-green-400',
  rejected: 'bg-red-400',
  hired: 'bg-teal-400',
}

interface CompanyCardProps {
  group: CompanyGroup
}

const CompanyCard = ({ group }: CompanyCardProps) => {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()
  const count = group.applications.length

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="bg-[#1a1a24] border border-white/5 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="shrink-0 w-10 h-10 rounded-lg bg-purple-600/10 border border-purple-600/20 flex items-center justify-center">
          <span className="text-purple-400 font-bold text-sm">{group.name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{group.name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-gray-500 text-xs">{count} role{count !== 1 ? 's' : ''}</span>
            {group.totalEmails > 0 && (
              <span className="flex items-center gap-1 text-gray-500 text-xs">
                <Mail size={11} />{group.totalEmails}
              </span>
            )}
            <span className="text-gray-600 text-xs">Last: {formatDate(group.latestActivity)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {STATUS_ORDER.filter((s) => group.statusCounts[s]).map((s) => (
              <div key={s} className={['w-2 h-2 rounded-full', STATUS_DOT[s]].join(' ')} title={`${s}: ${group.statusCounts[s]}`} />
            ))}
          </div>
          <div className="text-gray-500">{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5">
          {group.applications.map((app, i) => (
            <div
              key={app.id}
              onClick={() => navigate(`/applications/${app.id}`)}
              className={['flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors', i < group.applications.length - 1 ? 'border-b border-white/5' : ''].join(' ')}
            >
              <div className={['w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[app.status]].join(' ')} />
              <div className="flex-1 min-w-0">
                {/* FIX: role_title is now string | null */}
                <p className="text-gray-300 text-sm truncate">{app.role_title ?? '—'}</p>
                {app.source && <p className="text-gray-600 text-xs mt-0.5">{app.source}</p>}
              </div>
              <StatusBadge status={app.status} />
              <span className="text-gray-600 text-xs shrink-0">{formatDate(app.applied_at ?? app.created_at)}</span>
              {app.email_count > 0 && (
                <span className="flex items-center gap-1 text-gray-600 text-xs shrink-0">
                  <Mail size={11} />{app.email_count}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const CompaniesPage = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['applications', 'companies'],
    queryFn: () => fetchApplications({ limit: 500, offset: 0 }),
  })

  const groups = useMemo<CompanyGroup[]>(() => {
    if (!data) return []
    const map = new Map<string, JobApplication[]>()
    for (const app of data.items) {
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
  }, [data])

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
          {groups.map((group) => <CompanyCard key={group.name} group={group} />)}
        </div>
      )}
    </div>
  )
}

export default CompaniesPage