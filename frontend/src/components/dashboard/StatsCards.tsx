import { FileText, MessageSquare, TrendingUp, Trophy } from 'lucide-react'
import type { DashboardStats } from '../../types/index.ts'

interface Props {
  stats: DashboardStats
  isLoading: boolean
}

const StatsCards = ({ stats, isLoading }: Props) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#1a1a24] rounded-xl p-5 animate-pulse h-28 border border-white/5" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Total Applications */}
      <div className="bg-[#1a1a24] rounded-xl p-5 border border-white/5 flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <FileText size={18} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Total Applications</p>

          <p className="text-white text-3xl font-bold mt-1">{stats.totalApplications}</p>
          {stats.statusCounts.new > 0 && (
            <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1.5 text-green-400 bg-green-500/10">
              +{stats.statusCounts.new} new
            </span>
          )}
        </div>
      </div>

      {/* Active Interviews */}
      <div className="bg-[#1a1a24] rounded-xl p-5 border border-white/5 flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <MessageSquare size={18} className="text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Active Interviews</p>
          <p className="text-white text-3xl font-bold mt-1">{stats.activeInterviews}</p>
          <span
            className={[
              'inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1.5',
              stats.activeInterviews > 0
                ? 'text-purple-400 bg-purple-500/10'
                : 'text-gray-500 bg-gray-500/10',
            ].join(' ')}
          >
            {stats.activeInterviews > 0 ? 'In progress' : 'None active'}
          </span>
        </div>
      </div>

      {/* Reply Rate */}
      <div className="bg-[#1a1a24] rounded-xl p-5 border border-white/5 flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
          <TrendingUp size={18} className="text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Reply Rate</p>
          <p className="text-white text-3xl font-bold mt-1">{stats.replyRate.toFixed(1)}%</p>
          <span
            className={[
              'inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1.5',
              stats.replyRate >= 20
                ? 'text-green-400 bg-green-500/10'
                : 'text-yellow-400 bg-yellow-500/10',
            ].join(' ')}
          >
            {stats.replyRate >= 20 ? 'Good' : 'Below avg'}
          </span>
        </div>
      </div>

      {/* Offers */}
      <div className="bg-[#1a1a24] rounded-xl p-5 border border-white/5 flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
          <Trophy size={18} className="text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Offers Received</p>
          <p className="text-white text-3xl font-bold mt-1">{stats.offersReceived}</p>
          <span
            className={[
              'inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1.5',
              stats.offersReceived > 0
                ? 'text-teal-400 bg-teal-500/10'
                : 'text-gray-500 bg-gray-500/10',
            ].join(' ')}
          >
            {stats.offersReceived > 0 ? 'Congratulations!' : 'Keep going'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default StatsCards
