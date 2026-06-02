import { Search } from 'lucide-react'
import type { ApplicationStatus } from '../../../shared/types/job-tracker.ts'
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from '../../../shared/constants/applicationStatus.ts'

interface Props {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: ApplicationStatus | 'all'
  onStatusChange: (value: ApplicationStatus | 'all') => void
}

const SearchAndFilters = ({ search, onSearchChange, statusFilter, onStatusChange }: Props) => (
  <div className="flex flex-col sm:flex-row gap-3">
    <div className="relative flex-1 max-w-sm">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-t2" />
      <input
        type="text"
        placeholder="Search company or role…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full bg-surface border border-DEFAULT rounded-lg pl-9 pr-3 py-2 text-t1 text-sm placeholder-t3 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
      />
    </div>

    <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-DEFAULT overflow-x-auto">
      <button
        onClick={() => onStatusChange('all')}
        className={[
          'px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
          statusFilter === 'all' ? 'bg-purple-600/20 text-purple-400' : 'text-t2 hover:text-t1',
        ].join(' ')}
      >
        All
      </button>
      {APPLICATION_STATUSES.map((s) => (
        <button
          key={s}
          onClick={() => onStatusChange(s)}
          className={[
            'px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
            statusFilter === s ? 'bg-purple-600/20 text-purple-400' : 'text-t2 hover:text-t1',
          ].join(' ')}
        >
          {APPLICATION_STATUS_LABELS[s]}
        </button>
      ))}
    </div>
  </div>
)

export default SearchAndFilters
