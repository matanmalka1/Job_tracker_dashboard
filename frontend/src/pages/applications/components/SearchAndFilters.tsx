import { Search } from 'lucide-react'
import type { ApplicationStatus } from '../../../types/index.ts'
import { ALL_STATUSES, STATUS_LABELS } from '../constants.ts'

interface Props {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: ApplicationStatus | 'all'
  onStatusChange: (value: ApplicationStatus | 'all') => void
}

const SearchAndFilters = ({ search, onSearchChange, statusFilter, onStatusChange }: Props) => (
  <div className="flex flex-col sm:flex-row gap-3">
    <div className="relative flex-1 max-w-sm">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
      <input
        type="text"
        placeholder="Search company or role…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full bg-[#1a1a24] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
      />
    </div>

    <div className="flex items-center gap-1 bg-[#1a1a24] p-1 rounded-lg border border-white/5 overflow-x-auto">
      <button
        onClick={() => onStatusChange('all')}
        className={[
          'px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
          statusFilter === 'all' ? 'bg-purple-600/20 text-purple-400' : 'text-gray-400 hover:text-white',
        ].join(' ')}
      >
        All
      </button>
      {ALL_STATUSES.map((s) => (
        <button
          key={s}
          onClick={() => onStatusChange(s)}
          className={[
            'px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
            statusFilter === s ? 'bg-purple-600/20 text-purple-400' : 'text-gray-400 hover:text-white',
          ].join(' ')}
        >
          {STATUS_LABELS[s]}
        </button>
      ))}
    </div>
  </div>
)

export default SearchAndFilters
