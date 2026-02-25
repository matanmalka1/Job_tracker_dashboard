import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Mail, TrendingUp, X } from 'lucide-react'
import { toast } from 'sonner'
import { fetchApplications, updateApplication } from '../api/client.ts'
import type { JobApplication } from '../types/index.ts'
import LoadingSpinner from '../components/ui/LoadingSpinner.tsx'
import StatusBadge from '../components/ui/StatusBadge.tsx'

// Group interviews by week (Mon–Sun)
const getWeekKey = (dateStr: string): string => {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString()
}

const formatWeekLabel = (isoMonday: string): string => {
  const monday = new Date(isoMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const now = new Date()
  const thisMonday = new Date(getWeekKey(now.toISOString()))
  const diff = (monday.getTime() - thisMonday.getTime()) / (1000 * 60 * 60 * 24 * 7)

  if (diff === 0) return `This Week  (${fmt(monday)} – ${fmt(sunday)})`
  if (diff === -1) return `Last Week  (${fmt(monday)} – ${fmt(sunday)})`
  if (diff === 1) return `Next Week  (${fmt(monday)} – ${fmt(sunday)})`
  return `${fmt(monday)} – ${fmt(sunday)}`
}

const formatDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : '—'

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
        <p className="text-gray-400 text-xs mt-0.5">{app.role_title}</p>
      </div>
      <StatusBadge status={app.status} />
    </div>

    <div className="flex items-center gap-4 text-xs text-gray-500">
      <span className="flex items-center gap-1">
        <Calendar size={12} />
        {formatDate(app.applied_at ?? app.created_at)}
      </span>
      {app.emails.length > 0 && (
        <span className="flex items-center gap-1">
          <Mail size={12} />
          {app.emails.length} email{app.emails.length !== 1 ? 's' : ''}
        </span>
      )}
      {app.last_email_at && (
        <span className="text-gray-600">Last: {relativeTime(app.last_email_at)}</span>
      )}
    </div>

    {app.confidence_score !== null && app.confidence_score !== undefined && (
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

const InterviewsPage = () => {
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['applications', 'interviewing'],
    queryFn: () => fetchApplications({ status: 'interviewing', limit: 500, offset: 0 }),
  })

  const { mutate: moveStatus, isPending } = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'offer' | 'rejected' }) =>
      updateApplication(id, { status }),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      toast.success(status === 'offer' ? 'Moved to Offer!' : 'Marked as Rejected')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const interviews = data?.items ?? []

  // Group by week using applied_at or created_at
  const grouped = useMemo(() => {
    const map = new Map<string, JobApplication[]>()
    for (const app of interviews) {
      const key = getWeekKey(app.applied_at ?? app.created_at)
      const existing = map.get(key) ?? []
      map.set(key, [...existing, app])
    }
    // Sort weeks descending (most recent first)
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
  }, [interviews])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Interviews</h1>
        <p className="text-gray-400 text-sm mt-1">
          {data
            ? `${data.total} active interview${data.total !== 1 ? 's' : ''}`
            : 'Loading…'}
        </p>
      </div>

      {isLoading && <LoadingSpinner size="lg" message="Loading interviews…" />}

      {isError && (
        <div className="bg-[#1a1a24] rounded-xl p-8 border border-white/5 text-center">
          <p className="text-red-400 text-sm">Failed to load interviews.</p>
        </div>
      )}

      {!isLoading && !isError && interviews.length === 0 && (
        <div className="bg-[#1a1a24] rounded-xl p-12 border border-white/5 text-center">
          <Calendar size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm font-medium">No active interviews</p>
          <p className="text-gray-600 text-xs mt-1">
            Move applications to the "Interviewing" stage to track them here.
          </p>
        </div>
      )}

      {!isLoading && !isError && grouped.length > 0 && (
        <div className="space-y-8">
          {grouped.map(([weekKey, apps]) => (
            <div key={weekKey}>
              {/* Week header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-gray-500 text-xs font-medium whitespace-nowrap">
                  {formatWeekLabel(weekKey)}
                </span>
                <div className="h-px flex-1 bg-white/5" />
              </div>

              {/* Cards grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {apps.map((app) => (
                  <InterviewCard
                    key={app.id}
                    app={app}
                    loading={isPending}
                    onMoveOffer={(id) => moveStatus({ id, status: 'offer' })}
                    onMoveRejected={(id) => moveStatus({ id, status: 'rejected' })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default InterviewsPage
