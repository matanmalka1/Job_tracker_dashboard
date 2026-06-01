import { useMemo } from 'react'
import type { EmailReference } from '../../../shared/types/job-tracker.ts'
import { ALL_CATEGORIES, CATEGORY_CONFIG, categorize } from './activityTimelineModel.tsx'
import type { Category } from './activityTimelineModel.tsx'

const ActivitySummaryBar = ({ emails }: { emails: EmailReference[] }) => {
  const counts = useMemo(() => {
    const nextCounts: Partial<Record<Category, number>> = {}
    for (const email of emails) {
      const category = categorize(email)
      nextCounts[category] = (nextCounts[category] ?? 0) + 1
    }
    return nextCounts
  }, [emails])

  const activeCategories = ALL_CATEGORIES.filter((category) => (counts[category] ?? 0) > 0)
  if (activeCategories.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      {activeCategories.map((category) => {
        const config = CATEGORY_CONFIG[category]
        return (
          <div
            key={category}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold border ${config.pill} ${config.twBorder}`}
          >
            <span style={{ color: config.color }}>{config.icon}</span>
            <span>
              {counts[category]} {config.label}
              {(counts[category] ?? 0) > 1 ? 's' : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default ActivitySummaryBar
