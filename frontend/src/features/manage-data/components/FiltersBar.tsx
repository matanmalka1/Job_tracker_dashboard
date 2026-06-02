import { Search } from 'lucide-react'
import type { ApplicationStatus } from '../../../shared/types/job-tracker.ts'
import { APPLICATION_STATUS_OPTIONS } from '../../../shared/constants/applicationStatus.ts'

interface Props {
  search: string
  statusFilter: ApplicationStatus | 'all'
  onSearch: (value: string) => void
  onStatusChange: (value: ApplicationStatus | 'all') => void
  count: number
}

const FiltersBar = ({ search, statusFilter, onSearch, onStatusChange, count }: Props) => (
  <div className="bg-surface border border-DEFAULT rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div className="flex-1 flex items-center gap-3">
      <div className="relative flex-1 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-t2" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search company, role, or source"
          className="w-full bg-raised border border-DEFAULT rounded-lg pl-9 pr-3 py-2 text-t1 text-sm placeholder-t3 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30"
        />
      </div>
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value as typeof statusFilter)}
        className="bg-raised border border-DEFAULT rounded-lg px-3 py-2 text-sm text-t1 focus:outline-none focus:border-accent/50"
      >
        <option value="all">Any status</option>
        {APPLICATION_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
    <div className="text-xs text-t2">
      {count} record{count === 1 ? '' : 's'} shown
    </div>
  </div>
)

export default FiltersBar
