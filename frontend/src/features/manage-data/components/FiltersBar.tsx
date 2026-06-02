import { SlidersHorizontal } from 'lucide-react'
import { SearchInput, SelectField } from '@/shared/components/ui'
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
        <SearchInput
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search company, role, or source…"
          className="py-1.5"
        />
      </div>

      <SelectField
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value as typeof statusFilter)}
        leadingIcon={<SlidersHorizontal size={12} />}
        className="py-1.5"
      >
        <option value="all">Any status</option>
        {APPLICATION_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </SelectField>
    </div>

    <div className="flex items-center gap-1.5 text-[12px] font-mono shrink-0 text-t3">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${count > 0 ? 'bg-emerald-400' : 'bg-t3'}`} />
      <span className="text-t2">{count.toLocaleString()}</span>
      <span>record{count === 1 ? '' : 's'}</span>
    </div>
  </div>
)

export default FiltersBar
