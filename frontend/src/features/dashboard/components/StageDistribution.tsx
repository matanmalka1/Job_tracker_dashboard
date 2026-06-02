import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { ApplicationStatus, DashboardStats } from '../../../shared/types/job-tracker.ts'
import LoadingSpinner from '../../../shared/components/feedback/LoadingSpinner.tsx'
import { APPLICATION_STATUS_LABELS } from '../../../shared/constants/applicationStatus.ts'

interface Props {
  stats: DashboardStats
  isLoading: boolean
}

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  new:          '#6366f1',
  applied:      '#3b82f6',
  interviewing: '#8b5cf6',
  offer:        '#10b981',
  rejected:     '#ef4444',
  hired:        '#14b8a6',
}

const StageDistribution = ({ stats, isLoading }: Props) => {
  if (isLoading) {
    return (
      <div className="panel p-5 h-full">
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text-1)' }}>Stage Distribution</span>
        <div className="mt-5"><LoadingSpinner size="md" /></div>
      </div>
    )
  }

  const chartData = (Object.entries(stats.statusCounts) as [ApplicationStatus, number][])
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      status,
      name: APPLICATION_STATUS_LABELS[status],
      value: count,
      color: STATUS_COLORS[status],
    }))

  const total = chartData.reduce((acc, d) => acc + d.value, 0)

  return (
    <div className="panel p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <span className="text-[14px] font-semibold" style={{ color: 'var(--text-1)' }}>
          Stage Distribution
        </span>
        <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>{total} total</span>
      </div>

      {chartData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[13px]" style={{ color: 'var(--text-3)' }}>No data yet</span>
        </div>
      ) : (
        <div className="flex flex-col flex-1 gap-4">
          <div className="h-44">
            <ResponsiveContainer width="100%" height={176}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={76}
                  paddingAngle={3}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-mid)',
                    borderRadius: 8,
                    color: 'var(--text-1)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12,
                  }}
                  formatter={(value: number | undefined) => [value ?? 0, 'apps']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col gap-2">
            {chartData.map((d) => {
              const pct = total > 0 ? (d.value / total) * 100 : 0
              return (
                <div key={d.status} className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-[12px] w-24 shrink-0" style={{ color: 'var(--text-2)' }}>
                    {d.name}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: d.color }}
                    />
                  </div>
                  <span className="text-[12px] w-5 text-right shrink-0" style={{ color: 'var(--text-3)' }}>
                    {d.value}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default StageDistribution
