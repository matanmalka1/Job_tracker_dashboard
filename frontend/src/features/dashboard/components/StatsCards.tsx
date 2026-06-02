import { FileText, MessageSquare, TrendingUp, Trophy } from 'lucide-react'
import type { DashboardStats } from '../../../shared/types/job-tracker.ts'

interface Props {
  stats: DashboardStats
  isLoading: boolean
}

interface StatDef {
  key: keyof Pick<DashboardStats, 'totalApplications' | 'activeInterviews' | 'offersReceived' | 'replyRate'>
  label: string
  sublabel: (s: DashboardStats) => string
  accentVar: string
  icon: React.ReactNode
  format?: (v: number) => string
}

const STAT_DEFS: StatDef[] = [
  {
    key: 'totalApplications',
    label: 'Total Applications',
    accentVar: '#3b82f6',
    icon: <FileText size={16} />,
    sublabel: () => 'Across all stages',
  },
  {
    key: 'activeInterviews',
    label: 'Active Interviews',
    accentVar: '#8b5cf6',
    icon: <MessageSquare size={16} />,
    sublabel: (s) => s.activeInterviews > 0 ? 'Currently in progress' : 'None active',
  },
  {
    key: 'replyRate',
    label: 'Reply Rate',
    accentVar: 'var(--accent)',
    icon: <TrendingUp size={16} />,
    sublabel: (s) => s.replyRate >= 20 ? 'Above average' : 'Below average',
    format: (v) => `${v.toFixed(1)}%`,
  },
  {
    key: 'offersReceived',
    label: 'Offers',
    accentVar: '#10b981',
    icon: <Trophy size={16} />,
    sublabel: (s) => s.offersReceived > 0 ? 'Congratulations!' : 'Keep going',
  },
]

const StatsCards = ({ stats, isLoading }: Props) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {STAT_DEFS.map((def, idx) => {
        const raw = stats[def.key] as number
        const display = def.format ? def.format(raw) : String(raw)
        return (
          <div
            key={def.key}
            className="panel animate-fade-up p-5"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>
                {def.label}
              </span>
              <span style={{ color: def.accentVar, opacity: 0.8 }}>{def.icon}</span>
            </div>

            <div
              className="stat-num mb-1.5 animate-count-in"
              style={{ animationDelay: `${idx * 50 + 80}ms` }}
            >
              {display}
            </div>

            <div className="text-[12px]" style={{ color: 'var(--text-3)' }}>
              {def.sublabel(stats)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default StatsCards
