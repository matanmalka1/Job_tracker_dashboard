import { useState, useMemo } from 'react'
import {
  Mail, Briefcase, Clock, CheckCircle, XCircle, Star,
  ChevronDown, Filter, ExternalLink,
} from 'lucide-react'
import type { EmailReference } from '../../types/index.ts'
import LoadingSpinner from '../ui/LoadingSpinner.tsx'

interface Props {
  emails: EmailReference[]
  isLoading: boolean
  isError: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatRelative = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60_000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

const formatDateLabel = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const formatFull = (iso: string): string =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })

const extractDomain = (sender?: string): string => {
  if (!sender) return 'Unknown'
  const m = sender.match(/@([\w.-]+)/)
  return m ? m[1] : sender
}

const extractName = (sender?: string): string => {
  if (!sender) return 'Unknown'
  const m = sender.match(/^([^<]+)</)
  if (m) return m[1].trim()
  return extractDomain(sender)
}

// ─── Categories ───────────────────────────────────────────────────────────────

type Category = 'offer' | 'rejection' | 'interview' | 'application' | 'general'

const categorize = (email: EmailReference): Category => {
  const t = `${email.subject ?? ''} ${email.snippet ?? ''}`.toLowerCase()
  if (/\b(offer|congratulations|pleased to inform|job offer)\b/.test(t)) return 'offer'
  if (/\b(unfortunately|regret|not moving forward|not selected|declined)\b/.test(t)) return 'rejection'
  if (/\b(interview|schedule|assessment|screening|phone screen)\b/.test(t)) return 'interview'
  if (/\b(application|applied|received your|thank you for applying)\b/.test(t)) return 'application'
  return 'general'
}

const JOB_KEYWORDS = [
  'application', 'applied', 'interview', 'offer', 'position',
  'role', 'job', 'hiring', 'recruiter', 'recruitment',
  'candidat', 'opportunity', 'resume', 'cv', 'assessment',
  'screening', 'onboard',
]

const isJobEmail = (email: EmailReference): boolean => {
  if (email.application_id != null) return true
  const t = `${email.subject ?? ''} ${email.snippet ?? ''}`.toLowerCase()
  return JOB_KEYWORDS.some((kw) => t.includes(kw))
}

// ─── Category config ──────────────────────────────────────────────────────────

interface CatConfig {
  icon: React.ReactNode
  color: string
  twText: string
  twBg: string
  twBorder: string
  label: string
  pill: string
}

const CAT: Record<Category, CatConfig> = {
  offer: {
    icon: <Star size={12} />,
    color: '#10b981',
    twText: 'text-emerald-400',
    twBg: 'bg-emerald-500/8',
    twBorder: 'border-emerald-500/20',
    label: 'Offer',
    pill: 'bg-emerald-500/15 text-emerald-300',
  },
  rejection: {
    icon: <XCircle size={12} />,
    color: '#ef4444',
    twText: 'text-red-400',
    twBg: 'bg-red-500/8',
    twBorder: 'border-red-500/20',
    label: 'Rejection',
    pill: 'bg-red-500/15 text-red-300',
  },
  interview: {
    icon: <Briefcase size={12} />,
    color: '#8b5cf6',
    twText: 'text-purple-400',
    twBg: 'bg-purple-500/8',
    twBorder: 'border-purple-500/20',
    label: 'Interview',
    pill: 'bg-purple-500/15 text-purple-300',
  },
  application: {
    icon: <CheckCircle size={12} />,
    color: '#3b82f6',
    twText: 'text-blue-400',
    twBg: 'bg-blue-500/8',
    twBorder: 'border-blue-500/20',
    label: 'Application',
    pill: 'bg-blue-500/15 text-blue-300',
  },
  general: {
    icon: <Mail size={12} />,
    color: '#6b7280',
    twText: 'text-gray-400',
    twBg: 'bg-white/4',
    twBorder: 'border-white/8',
    label: 'Email',
    pill: 'bg-white/8 text-gray-400',
  },
}

const ALL_CATEGORIES: Category[] = ['offer', 'interview', 'application', 'rejection', 'general']

// ─── Summary bar ──────────────────────────────────────────────────────────────

const SummaryBar = ({ emails }: { emails: EmailReference[] }) => {
  const counts = useMemo(() => {
    const c: Partial<Record<Category, number>> = {}
    for (const e of emails) {
      const cat = categorize(e)
      c[cat] = (c[cat] ?? 0) + 1
    }
    return c
  }, [emails])

  const active = ALL_CATEGORIES.filter((cat) => (counts[cat] ?? 0) > 0)
  if (active.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      {active.map((cat) => {
        const cfg = CAT[cat]
        return (
          <div
            key={cat}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold border ${cfg.pill} ${cfg.twBorder}`}
          >
            <span style={{ color: cfg.color }}>{cfg.icon}</span>
            <span>{counts[cat]} {cfg.label}{(counts[cat] ?? 0) > 1 ? 's' : ''}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Timeline Item ─────────────────────────────────────────────────────────────

const TimelineItem = ({
  email,
  isLast,
  delay,
}: {
  email: EmailReference
  isLast: boolean
  delay: number
}) => {
  const [expanded, setExpanded] = useState(false)
  const cat = categorize(email)
  const cfg = CAT[cat]

  const gmailUrl = `https://mail.google.com/mail/u/0/#search/rfc822msgid:${encodeURIComponent(email.gmail_message_id)}`

  return (
    <div
      className="flex gap-3"
      style={{ animation: `tlIn 0.28s ease-out both`, animationDelay: `${delay}ms` }}
    >
      {/* Rail + dot */}
      <div className="flex flex-col items-center shrink-0 pt-0.5">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-150 hover:scale-110 focus:outline-none"
          style={{
            background: `${cfg.color}15`,
            borderColor: `${cfg.color}35`,
            color: cfg.color,
            boxShadow: expanded ? `0 0 0 3px ${cfg.color}20` : 'none',
          }}
          title={`${cfg.label} — click to ${expanded ? 'collapse' : 'expand'}`}
        >
          {cfg.icon}
        </button>
        {!isLast && (
          <div
            className="w-px mt-1 flex-1 min-h-[16px]"
            style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.07) 0%, transparent 100%)' }}
          />
        )}
      </div>

      {/* Card */}
      <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-3'}`}>
        <div
          className={`rounded-lg border overflow-hidden transition-all duration-200 cursor-pointer hover:border-white/12 ${cfg.twBg} ${cfg.twBorder}`}
          onClick={() => setExpanded((v) => !v)}
        >
          {/* Always-visible header */}
          <div className="flex items-start gap-2 px-3 py-2.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white text-sm font-medium leading-snug truncate">
                  {email.subject ?? '(No subject)'}
                </p>
                <span className={`shrink-0 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${cfg.pill}`}>
                  {cfg.label}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-medium truncate" style={{ color: cfg.color }}>
                  {extractName(email.sender)}
                </span>
                <span className="text-gray-700 text-xs">·</span>
                <span className="text-gray-500 text-xs flex items-center gap-1 shrink-0">
                  <Clock size={10} />
                  {formatRelative(email.received_at)}
                </span>
                {email.application_id != null && (
                  <>
                    <span className="text-gray-700 text-xs">·</span>
                    <span className="text-[10px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded">linked</span>
                  </>
                )}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1.5 pt-0.5">
              <span
                className="text-gray-600 transition-transform duration-150"
                style={{ transform: expanded ? 'rotate(180deg)' : 'none', display: 'inline-block' }}
              >
                <ChevronDown size={13} />
              </span>
            </div>
          </div>

          {/* Expanded panel */}
          {expanded && (
            <div
              className="px-3 pb-3 pt-0 border-t space-y-2"
              style={{ borderColor: `${cfg.color}18` }}
            >
              {email.snippet && (
                <p className="text-gray-400 text-xs leading-relaxed pt-2">
                  {email.snippet}
                </p>
              )}
              <div className="flex items-center justify-between pt-1">
                <div className="text-gray-600 text-[10px] font-mono">
                  {formatFull(email.received_at)}
                </div>
                <a
                  href={gmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-[10px] font-medium transition-colors hover:text-purple-300 text-gray-500"
                >
                  Open in Gmail
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

const ActivityTimeline = ({ emails, isLoading, isError }: Props) => {
  const [activeFilter, setActiveFilter] = useState<Category | 'all'>('all')
  const [showFilterMenu, setShowFilterMenu] = useState(false)

  const jobEmails = useMemo(() => emails.filter(isJobEmail), [emails])

  const filtered = useMemo(
    () =>
      activeFilter === 'all'
        ? jobEmails
        : jobEmails.filter((e) => categorize(e) === activeFilter),
    [jobEmails, activeFilter],
  )

  // Group by date, newest first
  const groups = useMemo(() => {
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime(),
    )
    const map = new Map<string, EmailReference[]>()
    for (const e of sorted) {
      const key = formatDateLabel(e.received_at)
      map.set(key, [...(map.get(key) ?? []), e])
    }
    return Array.from(map.entries())
  }, [filtered])

  const filterOptions: Array<{ value: Category | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    ...ALL_CATEGORIES.map((c) => ({ value: c as Category | 'all', label: CAT[c].label })),
  ]

  let itemIndex = 0

  return (
    <>
      <style>{`
        @keyframes tlIn {
          from { opacity: 0; transform: translateX(-5px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div className="bg-[#1a1a24] rounded-xl p-5 border border-white/5 h-full flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-semibold text-sm">Activity Timeline</h3>
            {jobEmails.length > 0 && (
              <span className="text-gray-600 text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded-full">
                {jobEmails.length}
              </span>
            )}
          </div>

          {/* Filter button */}
          {jobEmails.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  activeFilter !== 'all'
                    ? 'border-purple-500/40 bg-purple-500/10 text-purple-400'
                    : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                <Filter size={11} />
                {activeFilter === 'all' ? 'Filter' : CAT[activeFilter as Category].label}
                <ChevronDown
                  size={10}
                  style={{
                    transform: showFilterMenu ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s',
                    display: 'inline-block',
                  }}
                />
              </button>

              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-1.5 z-20 bg-[#13131f] border border-white/10 rounded-lg shadow-xl overflow-hidden min-w-[120px]">
                  {filterOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setActiveFilter(opt.value); setShowFilterMenu(false) }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                        activeFilter === opt.value
                          ? 'bg-purple-600/20 text-purple-300'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {opt.value !== 'all' && (
                        <span style={{ color: CAT[opt.value as Category].color }}>
                          {CAT[opt.value as Category].icon}
                        </span>
                      )}
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Loading */}
        {isLoading && <LoadingSpinner size="sm" message="Loading emails..." />}

        {/* Error */}
        {isError && (
          <p className="text-red-400 text-sm text-center py-4">Failed to load email activity.</p>
        )}

        {/* Empty — no emails at all */}
        {!isLoading && !isError && jobEmails.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-6">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/8 flex items-center justify-center">
              <Mail size={16} className="text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm">No email activity yet.</p>
            <p className="text-gray-700 text-xs">Run a Gmail scan to populate the timeline.</p>
          </div>
        )}

        {/* Empty — filter has no results */}
        {!isLoading && !isError && jobEmails.length > 0 && filtered.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-6">
            <p className="text-gray-500 text-sm">
              No {CAT[activeFilter as Category]?.label ?? ''} emails found.
            </p>
            <button
              onClick={() => setActiveFilter('all')}
              className="text-purple-400 text-xs hover:text-purple-300 transition-colors"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Content */}
        {!isLoading && !isError && filtered.length > 0 && (
          <>
            <SummaryBar emails={activeFilter === 'all' ? jobEmails : filtered} />

            <div className="flex-1 overflow-y-auto space-y-0 pr-1 -mr-1">
              {groups.map(([date, groupEmails], gi) => (
                <div key={date} className={gi > 0 ? 'mt-2' : ''}>
                  {/* Date separator */}
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="h-px flex-1 bg-white/5" />
                    <span className="text-gray-600 text-[9px] font-mono uppercase tracking-[0.12em] shrink-0 px-1">
                      {date}
                    </span>
                    <div className="h-px flex-1 bg-white/5" />
                  </div>

                  {groupEmails.map((email, i) => {
                    const delay = Math.min((itemIndex++ % 8) * 35, 280)
                    const isLastInGroup = i === groupEmails.length - 1
                    return (
                      <TimelineItem
                        key={email.id}
                        email={email}
                        isLast={isLastInGroup}
                        delay={delay}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default ActivityTimeline