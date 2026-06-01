import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import type { ApplicationStatus, CompanySummary } from '../../../shared/types/job-tracker.ts'
import { fetchApplications } from '../../../api/client.ts'
import ApplicationStatusBadge from '../../../shared/components/data-display/ApplicationStatusBadge.tsx'
import { APPLICATION_STATUS_DOT_COLORS } from '../../../shared/constants/applicationStatus.ts'
import { formatShortDate } from '../../../shared/utils/date.ts'

const STATUS_ORDER: ApplicationStatus[] = ['hired', 'offer', 'interviewing', 'applied', 'new', 'rejected']

const CompanyCard = ({ company }: { company: CompanySummary }) => {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['applications', 'company-detail', company.company_name],
    queryFn: () => fetchApplications({ search: company.company_name, limit: 50, offset: 0 }),
    enabled: expanded,
    staleTime: 30_000,
  })

  const applications = detailData?.items ?? []

  return (
    <div className="bg-[#1a1a24] border border-white/5 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="shrink-0 w-10 h-10 rounded-lg bg-purple-600/10 border border-purple-600/20 flex items-center justify-center">
          <span className="text-purple-400 font-bold text-sm">{company.company_name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{company.company_name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-gray-500 text-xs">
              {company.application_count} role{company.application_count !== 1 ? 's' : ''}
            </span>
            <span className="text-gray-600 text-xs">Last: {formatShortDate(company.latest_activity)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {STATUS_ORDER.filter((s) => company.status_counts[s]).map((s) => (
              <div
                key={s}
                className={['w-2 h-2 rounded-full', APPLICATION_STATUS_DOT_COLORS[s]].join(' ')}
                title={`${s}: ${company.status_counts[s]}`}
              />
            ))}
          </div>
          <div className="text-gray-500">{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5">
          {detailLoading ? (
            <div className="px-5 py-4 text-gray-500 text-sm">Loading…</div>
          ) : applications.length === 0 ? (
            <div className="px-5 py-4 text-gray-600 text-sm">No applications found.</div>
          ) : (
            applications.map((app, i) => (
              <div
                key={app.id}
                onClick={() => navigate(`/applications/${app.id}`)}
                className={[
                  'flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors',
                  i < applications.length - 1 ? 'border-b border-white/5' : '',
                ].join(' ')}
              >
                <div className={['w-1.5 h-1.5 rounded-full shrink-0', APPLICATION_STATUS_DOT_COLORS[app.status]].join(' ')} />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300 text-sm truncate">{app.role_title ?? '—'}</p>
                  {app.source && <p className="text-gray-600 text-xs mt-0.5">{app.source}</p>}
                </div>
                <ApplicationStatusBadge status={app.status} />
                <span className="text-gray-600 text-xs shrink-0">
                  {formatShortDate(app.applied_at ?? app.created_at)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default CompanyCard
