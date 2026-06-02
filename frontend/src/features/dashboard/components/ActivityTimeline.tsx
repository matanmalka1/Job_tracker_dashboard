import { useState, useMemo } from 'react'
import { ChevronDown, Mail } from 'lucide-react'
import { Button, Card, EmptyState } from '@/shared/components/ui'
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
    () => activeFilter === 'all' ? jobEmails : jobEmails.filter((e) => categorize(e) === activeFilter),
    [jobEmails, activeFilter],
  )

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
    ...ALL_CATEGORIES.map((c) => ({ value: c as Category | 'all', label: CATEGORY_CONFIG[c].label })),
  ]

  let itemIndex = 0

  const activeFilterLabel = activeFilter === 'all'
    ? 'Filter'
    : CATEGORY_CONFIG[activeFilter as Category].label

  return (
    <Card padding={false} className="flex flex-col h-full">
      {/* header */}
      <div className="flex items-center justify-between px-5 py-4 gap-2"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <span className="text-[14px] font-semibold" style={{ color: 'var(--text-1)' }}>
            Activity Timeline
          </span>
          {jobEmails.length > 0 && (
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-3)' }}
            >
              {jobEmails.length}
            </span>
          )}
        </div>

        {jobEmails.length > 0 && (
          <div className="relative">
            <Button
              onClick={() => setShowFilterMenu((v) => !v)}
              variant="secondary"
              size="sm"
              icon={(
                <ChevronDown
                  size={12}
                  className="transition-transform duration-150"
                  style={{ transform: showFilterMenu ? 'rotate(180deg)' : 'none' }}
                />
              )}
              iconPosition="right"
              className={[
                'h-auto py-1.5 text-[12px]',
                activeFilter !== 'all'
                  ? 'border-accent text-accent bg-[var(--accent-glow)]'
                  : '',
              ].join(' ')}
            >
              {activeFilterLabel}
            </Button>

            {showFilterMenu && (
              <div
                className="absolute right-0 top-full mt-1 z-20 min-w-[140px] rounded-xl overflow-hidden"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-mid)' }}
              >
                {filterOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setActiveFilter(opt.value); setShowFilterMenu(false) }}
                    className={[
                      'w-full text-left flex items-center gap-2 px-3 py-2 text-[12px] transition-colors border-none cursor-pointer',
                      activeFilter === opt.value
                        ? 'text-[var(--accent)] bg-[var(--accent-glow)]'
                        : 'text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-1)]',
                    ].join(' ')}
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

      {/* body */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {isLoading && <div className="p-5"><LoadingSpinner size="sm" message="Loading emails..." /></div>}

        {isError && (
          <p className="text-[13px] text-red-400 text-center p-5">
            Failed to load email activity
          </p>
        )}

        {!isLoading && !isError && jobEmails.length === 0 && (
          <EmptyState
            icon={<Mail size={22} />}
            title="No email activity yet"
            description="Run a Gmail scan to populate"
            className="flex-1"
          />
        )}

        {!isLoading && !isError && jobEmails.length > 0 && filtered.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2.5 p-8">
            <p className="text-[13px] m-0" style={{ color: 'var(--text-3)' }}>No results for this filter</p>
            <Button
              onClick={() => setActiveFilter('all')}
              variant="ghost"
              size="sm"
              className="text-[12px] text-accent hover:text-accent"
            >
              Clear filter
            </Button>
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-3">
            <ActivitySummaryBar emails={activeFilter === 'all' ? jobEmails : filtered} />

            {groups.map(([date, groupEmails], gi) => (
              <div key={date} className={gi > 0 ? 'mt-5' : ''}>
                {/* date separator */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="divider" />
                  <span
                    className="text-[11px] font-medium shrink-0"
                    style={{ color: 'var(--text-3)' }}
                  >
                    {date}
                  </span>
                  <div className="divider" />
                </div>

                {groupEmails.map((email, i) => {
                  const delay = Math.min((itemIndex++ % 8) * 30, 240)
                  return (
                    <ActivityTimelineItem
                      key={email.id}
                      email={email}
                      isLast={i === groupEmails.length - 1}
                      delay={delay}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

export default ActivityTimeline
