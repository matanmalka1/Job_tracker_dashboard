import type { DashboardStats } from '../../types/index.ts'

interface Props {
  stats: DashboardStats
  isLoading: boolean
}

interface CardConfig {
  label: string
  value: number | string
  badge: string
  badgeColor: string
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

  const cards: CardConfig[] = [
    {
      label: 'Total Applications',
      value: stats.totalApplications,
      badge: `+${stats.statusCounts.new} new`,
      badgeColor: 'text-green-400 bg-green-500/10',
    },
    {
      label: 'Active Interviews',
      value: stats.activeInterviews,
      badge: stats.activeInterviews > 0 ? 'Active' : 'None',
      badgeColor: stats.activeInterviews > 0
        ? 'text-purple-400 bg-purple-500/10'
        : 'text-gray-500 bg-gray-500/10',
    },
    {
      label: 'Reply Rate',
      value: `${stats.replyRate.toFixed(1)}%`,
      badge: stats.replyRate >= 20 ? 'Good' : 'Low',
      badgeColor: stats.replyRate >= 20
        ? 'text-green-400 bg-green-500/10'
        : 'text-yellow-400 bg-yellow-500/10',
    },
    {
      label: 'Offers Received',
      value: stats.offersReceived,
      badge: stats.offersReceived > 0 ? 'Congrats!' : 'Keep going',
      badgeColor: stats.offersReceived > 0
        ? 'text-teal-400 bg-teal-500/10'
        : 'text-gray-500 bg-gray-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-[#1a1a24] rounded-xl p-5 border border-white/5"
        >
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">
            {card.label}
          </p>
          <p className="text-white text-3xl font-bold mb-2">{card.value}</p>
          <span
            className={[
              'inline-block text-xs font-semibold px-2 py-0.5 rounded-full',
              card.badgeColor,
            ].join(' ')}
          >
            {card.badge}
          </span>
        </div>
      ))}
    </div>
  )
}

export default StatsCards
