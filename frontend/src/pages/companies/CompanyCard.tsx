import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, Mail } from 'lucide-react'
import type { ApplicationStatus, JobApplication } from '../../types/index.ts'
import StatusBadge from '../../components/ui/StatusBadge.tsx'

export interface CompanyGroup {
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

const CompanyCard = ({ group }: { group: CompanyGroup }) => {
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
            <span className="text-gray-500 text-xs">
              {count} role{count !== 1 ? 's' : ''}
            </span>
            {group.totalEmails > 0 && (
              <span className="flex items-center gap-1 text-gray-500 text-xs">
                <Mail size={11} />
                {group.totalEmails}
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
              className={[
                'flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors',
                i < group.applications.length - 1 ? 'border-b border-white/5' : '',
              ].join(' ')}
            >
              <div className={['w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[app.status]].join(' ')} />
              <div className="flex-1 min-w-0">
                <p className="text-gray-300 text-sm truncate">{app.role_title ?? '—'}</p>
                {app.source && <p className="text-gray-600 text-xs mt-0.5">{app.source}</p>}
              </div>
              <StatusBadge status={app.status} />
              <span className="text-gray-600 text-xs shrink-0">
                {formatDate(app.applied_at ?? app.created_at)}
              </span>
              {app.email_count > 0 && (
                <span className="flex items-center gap-1 text-gray-600 text-xs shrink-0">
                  <Mail size={11} />
                  {app.email_count}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CompanyCard
