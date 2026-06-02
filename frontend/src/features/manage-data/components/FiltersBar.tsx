import { Search, SlidersHorizontal } from 'lucide-react'
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
  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-4 py-3 rounded-xl border border-DEFAULT bg-surface">
    <div className="flex flex-1 items-center gap-2 min-w-0">
      <div className="relative flex-1 max-w-sm">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search company, role, or source…"
          className="w-full pl-8 pr-3 py-1.5 rounded-lg text-[13px] bg-raised border border-DEFAULT text-t1 placeholder-t3 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
        />
      </div>

      <div className="relative">
        <SlidersHorizontal size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-t3" />
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as typeof statusFilter)}
          className="pl-7 pr-3 py-1.5 rounded-lg text-[13px] bg-raised border border-DEFAULT text-t1 appearance-none cursor-pointer focus:outline-none focus:border-accent/50"
        >
          <option value="all">Any status</option>
          {APPLICATION_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>

    <div className="flex items-center gap-1.5 text-[12px] font-mono shrink-0 text-t3">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${count > 0 ? 'bg-emerald-400' : 'bg-t3'}`} />
      <span className="text-t2">{count.toLocaleString()}</span>
      <span>record{count === 1 ? '' : 's'}</span>
    </div>
  </div>
)

export default FiltersBar
