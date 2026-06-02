import { useMemo } from 'react'
import type { EmailReference } from '../../../shared/types/job-tracker.ts'
import { ALL_CATEGORIES, CATEGORY_CONFIG, categorize } from './activityTimelineModel.tsx'
import type { Category } from './activityTimelineModel.tsx'

const ActivitySummaryBar = ({ emails }: { emails: EmailReference[] }) => {
  const counts = useMemo(() => {
    const next: Partial<Record<Category, number>> = {}
    for (const e of emails) {
      const c = categorize(e)
      next[c] = (next[c] ?? 0) + 1
    }
    return next
  }, [emails])

  const active = ALL_CATEGORIES.filter((c) => (counts[c] ?? 0) > 0)
  if (active.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mb-4">
      {active.map((cat) => {
        const cfg = CATEGORY_CONFIG[cat]
        return (
          <div
            key={cat}
            className="summary-pill"
            style={{
              borderColor: `${cfg.color}28`,
              background: `${cfg.color}0e`,
              color: cfg.color,
              fontSize: 11,
            }}
          >
            <span>{cfg.icon}</span>
            {counts[cat]} {cfg.label}{(counts[cat] ?? 0) > 1 ? 's' : ''}
          </div>
        )
      })}
    </div>
  )
}

export default ActivitySummaryBar
