import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { ApplicationStatus, DashboardStats } from '../../types/index.ts'
import LoadingSpinner from '../ui/LoadingSpinner.tsx'

interface Props {
  stats: DashboardStats
  isLoading: boolean
}

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  new: '#6366f1',
  applied: '#3b82f6',
  interviewing: '#8b5cf6',
  offer: '#10b981',
  rejected: '#ef4444',
  hired: '#14b8a6',
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: 'New',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  hired: 'Hired',
}

const StageDistribution = ({ stats, isLoading }: Props) => {
  if (isLoading) {
    return (
      <div className="bg-[#1a1a24] rounded-xl p-5 border border-white/5 h-full">
        <h3 className="text-white font-semibold mb-4">Stage Distribution</h3>
        <LoadingSpinner size="md" />
      </div>
    )
  }

  const chartData = (Object.entries(stats.statusCounts) as [ApplicationStatus, number][])
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: STATUS_LABELS[status],
      value: count,
      color: STATUS_COLORS[status],
    }))

  return (
    <div className="bg-[#1a1a24] rounded-xl p-5 border border-white/5 h-full">
      <h3 className="text-white font-semibold mb-4">Stage Distribution</h3>

      {chartData.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">No applications yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a24',
                borderColor: '#ffffff10',
                borderRadius: '8px',
                color: '#ffffff',
              }}
              formatter={(value: number | undefined) => [value ?? 0, 'Applications']}
            />
            <Legend
              formatter={(value) => (
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export default StageDistribution
