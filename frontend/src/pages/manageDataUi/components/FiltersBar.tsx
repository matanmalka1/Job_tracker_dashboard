import { Search } from 'lucide-react'
import type { ApplicationStatus } from '../../../types/index.ts'
import { STATUS_OPTIONS } from '../constants'

interface Props {
  search: string
  statusFilter: ApplicationStatus | 'all'
  onSearch: (value: string) => void
  onStatusChange: (value: ApplicationStatus | 'all') => void
  count: number
}

const FiltersBar = ({ search, statusFilter, onSearch, onStatusChange, count }: Props) => (
  <div className="bg-[#1a1a24] border border-white/5 rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div className="flex-1 flex items-center gap-3">
      <div className="relative flex-1 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search company, role, or source"
          className="w-full bg-[#0f0f13] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
        />
      </div>
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value as typeof statusFilter)}
        className="bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
      >
        <option value="all">Any status</option>
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
    <div className="text-xs text-gray-500">
      {count} record{count === 1 ? '' : 's'} shown
    </div>
  </div>
)

export default FiltersBar
