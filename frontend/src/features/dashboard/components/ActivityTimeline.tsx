import { useState, useMemo } from 'react'
import { ChevronDown, Filter, Mail } from 'lucide-react'
import type { EmailReference } from '../../../shared/types/job-tracker.ts'
import LoadingSpinner from '../../../shared/components/feedback/LoadingSpinner.tsx'
import ActivitySummaryBar from './ActivitySummaryBar.tsx'
import ActivityTimelineItem from './ActivityTimelineItem.tsx'
import {
  ALL_CATEGORIES,
  CATEGORY_CONFIG,
  categorize,
  formatDateLabel,
  isJobEmail,
} from './activityTimelineModel.tsx'
import type { Category } from './activityTimelineModel.tsx'

interface Props {
  emails: EmailReference[]
  isLoading: boolean
  isError: boolean
}

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
    ...ALL_CATEGORIES.map((category) => ({
      value: category as Category | 'all',
      label: CATEGORY_CONFIG[category].label,
    })),
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
                {activeFilter === 'all' ? 'Filter' : CATEGORY_CONFIG[activeFilter as Category].label}
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
                        <span style={{ color: CATEGORY_CONFIG[opt.value as Category].color }}>
                          {CATEGORY_CONFIG[opt.value as Category].icon}
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
              No {CATEGORY_CONFIG[activeFilter as Category]?.label ?? ''} emails found.
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
            <ActivitySummaryBar emails={activeFilter === 'all' ? jobEmails : filtered} />

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
                      <ActivityTimelineItem
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
