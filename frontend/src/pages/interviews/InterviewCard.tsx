import { Calendar, Mail, TrendingUp, X } from 'lucide-react'
import StatusBadge from '../../components/ui/StatusBadge.tsx'
import type { JobApplication } from '../../types/index.ts'

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'

const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

interface CardProps {
  app: JobApplication
  onMoveOffer: (id: number) => void
  onMoveRejected: (id: number) => void
  loading: boolean
}

const InterviewCard = ({ app, onMoveOffer, onMoveRejected, loading }: CardProps) => (
  <div className="bg-[#0f0f13] border border-white/5 rounded-xl p-4 flex flex-col gap-3 hover:border-purple-600/20 transition-colors">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-white font-semibold text-sm">{app.company_name}</p>
        <p className="text-gray-400 text-xs mt-0.5">{app.role_title ?? '—'}</p>
      </div>
      <StatusBadge status={app.status} />
    </div>

    <div className="flex items-center gap-4 text-xs text-gray-500">
      <span className="flex items-center gap-1">
        <Calendar size={12} />
        {formatDate(app.applied_at ?? app.created_at)}
      </span>
      {app.email_count > 0 && (
        <span className="flex items-center gap-1">
          <Mail size={12} />
          {app.email_count} email{app.email_count !== 1 ? 's' : ''}
        </span>
      )}
      {app.last_email_at && <span className="text-gray-600">Last: {relativeTime(app.last_email_at)}</span>}
    </div>

    {app.confidence_score != null && (
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-500 text-xs">Confidence</span>
          <span className="text-gray-300 text-xs">{Math.round(app.confidence_score * 100)}%</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 rounded-full transition-all"
            style={{ width: `${Math.round(app.confidence_score * 100)}%` }}
          />
        </div>
      </div>
    )}

    <div className="flex gap-2 pt-1">
      <button
        disabled={loading}
        onClick={() => onMoveOffer(app.id)}
        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/10 hover:bg-green-600/20 text-green-400 text-xs font-medium transition-colors disabled:opacity-50"
      >
        <TrendingUp size={13} />
        Move to Offer
      </button>
      <button
        disabled={loading}
        onClick={() => onMoveRejected(app.id)}
        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 text-xs font-medium transition-colors disabled:opacity-50"
      >
        <X size={13} />
        Rejected
      </button>
    </div>
  </div>
)

export default InterviewCard
