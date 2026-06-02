import { Button, SearchInput } from '@/shared/components/ui'
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
      <SearchInput
        placeholder="Search company or role…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="bg-surface"
      />
    </div>

    <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-DEFAULT overflow-x-auto">
      <Button
        onClick={() => onStatusChange('all')}
        variant="ghost"
        size="sm"
        className={[
          'h-auto py-1.5 rounded-md whitespace-nowrap',
          statusFilter === 'all' ? 'bg-purple-600/20 text-purple-400' : 'text-t2 hover:text-t1',
        ].join(' ')}
      >
        All
      </Button>
      {APPLICATION_STATUSES.map((s) => (
        <Button
          key={s}
          onClick={() => onStatusChange(s)}
          variant="ghost"
          size="sm"
          className={[
            'h-auto py-1.5 rounded-md whitespace-nowrap',
            statusFilter === s ? 'bg-purple-600/20 text-purple-400' : 'text-t2 hover:text-t1',
          ].join(' ')}
        >
          {APPLICATION_STATUS_LABELS[s]}
        </Button>
      ))}
    </div>
  </div>
)

export default SearchAndFilters
